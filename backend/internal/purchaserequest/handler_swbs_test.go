package purchaserequest_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/purchaserequest"
)

func TestNewPurchaseRequest_WaitsForTheSwbsCode_Contract_058_FR002_FR004(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	priya := s.SignIn(t, priyasEmail)
	sectionOf := func() purchaserequest.LineItemSection {
		return decoded[purchaserequest.LineItemSection](t, priya.Do(t, http.MethodGet, "/api/v1/line-items/"+standBuild+
			"/purchase-requests", nil), http.StatusOK)
	}

	before := sectionOf()
	refused := decoded[apiError](t, priya.Do(t, http.MethodPost, prs, body(standBuild, "EUR", "100.00")), http.StatusBadRequest)
	receiveSwbsCodes(t, s)
	after := sectionOf()
	created := create(t, priya, body(standBuild, "EUR", "100.00"))

	same(t, "058 FR-004 the section before and after the code",
		[]any{false, "No SWBS code yet (Ready to send to GSAP). A purchase request needs the line item's SWBS code first.", true},
		[]any{before.Create.Available, before.Create.Reason, after.Create.Available})
	same(t, "058 FR-002 refused before the code", []string{"lines[0].lineItemId"}, fieldsOf(refused))
	same(t, "058 FR-002 message", []string{"Line item L-1006 'Stand build' has no SWBS code yet (Ready to send to GSAP). " +
		"A purchase request needs its SWBS code first."}, fieldMessages(refused))
	same(t, "058 US1 saved once the code arrived", purchaserequest.StatusCreated, created.Status)
}

func TestAddLine_NeedsTheSwbsCode_StoredLinesKeepSaving_Contract_058_FR002(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	receiveSwbsCodes(t, s)
	priya := s.SignIn(t, priyasEmail)
	pr := create(t, priya, body(standBuild, "EUR", "9200.00"))
	legacy := get(t, priya, "PR-1001")
	legacyBody := body("L-1010", "EUR", "23000.00")
	legacyBody["version"], legacyBody["description"] = legacy.Version, "Agency retainer for Ireland"
	legacyBody["lines"].([]map[string]any)[0]["id"] = legacy.Lines[0].ID

	added := decoded[apiError](t, priya.Do(t, http.MethodPut, prs+"/"+pr.ID, withAddedLine(pr, "L-1001", "save")),
		http.StatusBadRequest)
	saved := decoded[purchaserequest.View](t, priya.Do(t, http.MethodPut, prs+"/PR-1001", legacyBody), http.StatusOK)

	same(t, "058 FR-002 a new line on Agency fee", map[string]string{"lines[1].lineItemId": "Line item L-1001 'Agency fee' " +
		"has no SWBS code yet (Waiting for approval). A purchase request needs its SWBS code first."}, fieldMap(added))
	same(t, "058 US2 PR-1001's stored line without a code keeps saving", "Agency retainer for Ireland", saved.Description)
}

func fieldsOf(e apiError) []string {
	var got []string
	for _, f := range e.Error.Fields {
		got = append(got, f.Field)
	}
	return got
}

func fieldMap(e apiError) map[string]string {
	got := map[string]string{}
	for _, f := range e.Error.Fields {
		got[f.Field] = f.Message
	}
	return got
}
