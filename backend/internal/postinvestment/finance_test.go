package postinvestment_test

import (
	"encoding/json"
	"slices"
	"strings"
	"testing"

	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
	"mapp/internal/postinvestment"
)

func TestFinance_HidesAmountSpentAndROIWithoutFinance_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1001")
	v, err := s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &v.Version, Margin: moneyInput("1703.13")})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	seen, err := s.Get(t.Context(), sara, v.ID)
	if err != nil {
		t.Fatalf("Get as Sara: %v", err)
	}
	if seen.AmountSpent != nil || seen.ROI != nil || seen.Margin == nil || seen.Access.Edit.Available {
		t.Fatalf("Sara sees amount spent %v, ROI %v, margin %v, edit %v; want only the margin, read-only",
			seen.AmountSpent, seen.ROI, seen.Margin, seen.Access.Edit)
	}
}

func TestFinance_StartingChangingAndExportingFollowFinance_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1001")
	remarks := "Mine"
	_, err := s.Update(t.Context(), sara, v.ID, postinvestment.UpdateInput{Version: &v.Version, Remarks: &remarks})
	if codeOf(err) != errs.CodeForbidden {
		t.Fatalf("Sara edits the review: %v, want forbidden", err)
	}
	if _, err = s.Create(t.Context(), sara, postinvestment.CreateInput{ActivityID: "A-1002"}); codeOf(err) != errs.CodeForbidden {
		t.Fatalf("Sara starts a review: %v, want forbidden", err)
	}
	file, err := s.Export(t.Context(), sara, v.ID)
	if err != nil {
		t.Fatalf("Export as Sara: %v", err)
	}
	if slide := slidesText(t, file.Body); strings.Contains(slide, "1,250.00") || !strings.Contains(slide, "Not shown") {
		t.Fatalf("Sara's slide shows the paid figure or doesn't say it is hidden")
	}
}

func TestUpdate_BlankReviewTakesOnlyAConfiguredCurrency_184(t *testing.T) {
	s := newService(t)
	v := create(t, s, "A-1002")
	v, err := s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &v.Version, AmountSpent: json.RawMessage("null")})
	if err != nil || v.AmountSpent != nil {
		t.Fatalf("clear the amount spent: %v, %v", err, v.AmountSpent)
	}
	zzz, _ := json.Marshal(money.Input{Amount: "500.00", Currency: "ZZZ"})
	_, err = s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &v.Version, Margin: zzz})
	if want := []string{"margin"}; !slices.Equal(fieldsOf(err), want) {
		t.Fatalf("a currency not set up: fields %v, want %v", fieldsOf(err), want)
	}
	eur, _ := json.Marshal(money.Input{Amount: "500.00", Currency: "EUR"})
	v, err = s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &v.Version, Margin: eur})
	if err != nil || v.Margin == nil || v.Margin.Currency != "EUR" {
		t.Fatalf("first amount in EUR: %v, margin %v; want it kept in EUR", err, v.Margin)
	}
	_, err = s.Update(t.Context(), alex, v.ID, postinvestment.UpdateInput{Version: &v.Version, AmountSpent: moneyInput("1.00")})
	if want := []string{"amountSpent"}; !slices.Equal(fieldsOf(err), want) {
		t.Fatalf("USD after EUR: fields %v, want %v", fieldsOf(err), want)
	}
}
