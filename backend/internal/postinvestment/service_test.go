package postinvestment_test

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"testing"
	"time"

	"mapp/internal/history"
	"mapp/internal/history/historytest"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/fake"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/money"
	"mapp/internal/postinvestment"
	"mapp/internal/postinvestment/postinvestmenttest"
)

var (
	alex  = actor.Actor{ID: "U-1001", Name: "Alex Morgan"}
	sara  = actor.Actor{ID: "U-1007", Name: "Sara Novak"}
	start = time.Date(2026, time.November, 5, 9, 0, 0, 0, time.UTC)
)

// fakeActivities sees A-1001 (1,250.00 USD paid) and A-1002 (nothing paid yet); A-1003 is outside every scope.
// Sara doesn't see the plan's finance; USD and EUR are set up in Settings.
type fakeActivities struct{}

func (fakeActivities) InScope(_ context.Context, _ authz.Scope, activityIDs []string) (map[string]postinvestment.Activity, error) {
	found := map[string]postinvestment.Activity{}
	for _, id := range activityIDs {
		if id == "A-1001" || id == "A-1002" {
			found[id] = postinvestment.Activity{ID: id, Name: "Webinar " + id,
				Path: []history.RecordRef{{Type: "plan", ID: "P-1001", Name: "FY2026 Lubricants Europe"}}}
		}
	}
	return found, nil
}

func (fakeActivities) Live(_ context.Context, a actor.Actor, activityID string) (postinvestment.Live, error) {
	if a.ID == sara.ID {
		return postinvestment.Live{Currency: "USD"}, nil
	}
	var cents int64
	if activityID == "A-1001" {
		cents = 125000
	}
	paid := money.Money{Amount: money.FromCents(cents), Currency: "USD"}
	return postinvestment.Live{Currency: "USD", Figures: &postinvestment.Figures{Committed: paid, Actual: paid}}, nil
}

func (fakeActivities) KnownCurrency(_ context.Context, code string) (bool, error) {
	return code == "USD" || code == "EUR", nil
}

func newService(t *testing.T) *postinvestment.Service {
	t.Helper()
	db := fake.NewDB()
	generator := ids.NewGenerator(fake.NewCounters(db))
	now := func() time.Time { return start }
	hist := history.NewService(db, historytest.NewStore(db), generator, now)
	s := postinvestment.NewService(history.Tools{Tx: db, IDs: generator, Log: hist, Now: now},
		postinvestmenttest.NewStore(db), fakeActivities{})
	parent := history.Kind{Name: "activity", Singular: "activity", Plural: "activities",
		Snapshot: func(_ context.Context, id string) (history.Snapshot, bool, error) {
			return history.Snapshot{ID: id, Name: "Webinar " + id, Data: json.RawMessage(`{}`)}, true, nil
		},
		Remove: func(context.Context, string) error { return nil },
		Put:    func(context.Context, history.Snapshot) error { return nil }}
	for _, k := range append([]history.Kind{parent}, s.Kinds()...) {
		if err := hist.Register(k); err != nil {
			t.Fatalf("Register(%s): %v", k.Name, err)
		}
	}
	return s
}

func create(t *testing.T, s *postinvestment.Service, activityID string) postinvestment.View {
	t.Helper()
	v, err := s.Create(t.Context(), alex, postinvestment.CreateInput{ActivityID: activityID})
	if err != nil {
		t.Fatalf("Create(%s): %v", activityID, err)
	}
	return v
}

func codeOf(err error) string {
	var e *errs.Error
	if errors.As(err, &e) {
		return e.Code
	}
	return ""
}

func fieldsOf(err error) []string {
	var e *errs.Error
	if !errors.As(err, &e) {
		return nil
	}
	fields := []string{}
	for _, f := range e.Fields {
		fields = append(fields, f.Field)
	}
	return fields
}

func moneyInput(amount string) json.RawMessage {
	raw, _ := json.Marshal(money.Input{Amount: amount, Currency: "USD"})
	return raw
}

func TestCreate_StartsADraftWithTheActualCost_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1001")
	if v.Status != postinvestment.StatusDraft || v.AmountSpent == nil || v.AmountSpent.Format() != "1,250.00 USD" {
		t.Fatalf("new review: status %s, amount spent %v; want a Draft with 1,250.00 USD", v.Status, v.AmountSpent)
	}
	if v.ROI != nil {
		t.Fatalf("ROI = %s before a margin, want null", *v.ROI)
	}
}

func TestCreate_OneReviewPerActivity_184(t *testing.T) {
	s := newService(t)
	create(t, s, "A-1001")
	_, err := s.Create(t.Context(), alex, postinvestment.CreateInput{ActivityID: "A-1001"})
	if codeOf(err) != errs.CodeNameTaken {
		t.Fatalf("second review: %v, want name_taken", err)
	}
}

func TestCreate_ActivityOutOfScopeIsNotFound_184(t *testing.T) {
	_, err := newService(t).Create(t.Context(), alex, postinvestment.CreateInput{ActivityID: "A-1003"})
	if codeOf(err) != errs.CodeNotFound {
		t.Fatalf("activity out of scope: %v, want not_found", err)
	}
}

func TestSubmit_ListsEveryProblemAtOnce_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1002")
	_, err := s.Submit(t.Context(), alex, v.ID, postinvestment.SubmitInput{Version: &v.Version})
	want := []string{"businessCase", "amountSpent", "margin"}
	if codeOf(err) != errs.CodeValidationFailed || !slices.Equal(fieldsOf(err), want) {
		t.Fatalf("submit an empty review: %v (fields %v), want validation_failed on %v", err, fieldsOf(err), want)
	}
}

func TestSubmit_WorksOutROIThenIsReadOnly_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1001")
	businessCase := "BC-2026-014 Lubricants webinars"
	v, err := s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{
		Version: &v.Version, BusinessCase: &businessCase, Margin: moneyInput("1703.13"),
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	v, err = s.Submit(t.Context(), alex, v.ID, postinvestment.SubmitInput{Version: &v.Version})
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if v.Status != postinvestment.StatusSubmitted || v.ROI == nil || *v.ROI != "36.25" || v.Access.Edit.Available {
		t.Fatalf("submitted: status %s, ROI %v, edit %v; want Submitted, 36.25, not editable", v.Status, v.ROI, v.Access.Edit)
	}
	remarks := "Too late"
	_, err = s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &v.Version, Remarks: &remarks})
	if codeOf(err) != errs.CodeForbidden {
		t.Fatalf("change a submitted review: %v, want forbidden", err)
	}
}

func TestUpdate_RefusesWrongAmountsTogether_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1001")
	eur, _ := json.Marshal(money.Input{Amount: "10.00", Currency: "EUR"})
	_, err := s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{
		Version: &v.Version, AmountSpent: moneyInput("-1.00"), Margin: eur,
	})
	if want := []string{"amountSpent", "margin"}; !slices.Equal(fieldsOf(err), want) {
		t.Fatalf("negative spend and another currency: fields %v, want %v", fieldsOf(err), want)
	}
	stale := v.Version - 1
	_, err = s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &stale, Margin: moneyInput("1.00")})
	if codeOf(err) != errs.CodeVersionConflict {
		t.Fatalf("out-of-date version: %v, want version_conflict", err)
	}
}

func TestExport_OneSlidePerReviewShown_185(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1001")
	file, err := s.Export(t.Context(), alex, v.ID)
	if err != nil || len(file.Body) == 0 || file.ContentType != "application/vnd.openxmlformats-officedocument.presentationml.presentation" {
		t.Fatalf("Export: %v, %d bytes of %s", err, len(file.Body), file.ContentType)
	}
	create(t, s, "A-1002")
	list, err := s.ExportList(t.Context(), alex, "")
	if err != nil || len(list.Body) == 0 {
		t.Fatalf("ExportList: %v", err)
	}
	if slides := countSlides(t, list.Body); slides != 2 {
		t.Fatalf("list export has %d slides, want 2", slides)
	}
	if want := "SP&A One – Post-investment reviews – 5 Nov 2026.pptx"; list.Name != want {
		t.Fatalf("list file %q, want %q", list.Name, want)
	}
}
