package lineitem_test

import (
	"net/http"
	"testing"

	"mapp/internal/lineitem"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/money"
)

func previewBody(currency, cost string) map[string]any {
	return map[string]any{"lineItemId": nil, "currency": currency, "plannedCost": cost,
		"spread": map[string]any{"method": "evenly", "months": []any{}}}
}

// 10,000.00 EUR at 0.90 is 11,111.11 USD, which leaves 7,777.78 of Launch film's 18,888.89 USD unassigned.
func TestPreviewLineItem_Contract_D061(t *testing.T) {
	t.Parallel()
	priya := apitest.New(t).SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodPost, "/api/v1/activities/"+launchFilm+"/line-items/preview", previewBody("EUR", "10000"))
	typing := priya.Do(t, http.MethodPost, "/api/v1/activities/"+launchFilm+"/line-items/preview", previewBody("EUR", "10,0"))
	gone := priya.Do(t, http.MethodPost, "/api/v1/activities/A-9999/line-items/preview", previewBody("EUR", "1"))

	assertAnswer(t, response, http.StatusOK, "")
	var p lineitem.Preview
	response.Decode(t, &p)
	if got := formatted(p.PlannedCostUSD, p.PlannedCostPlan, p.AfterSaving); got != "11,111.11 USD/11,111.11 USD/7,777.78 USD/" {
		t.Errorf("USD, plan currency, after saving = %s", got)
	}
	if p.Spread == nil || len(p.Spread.Months) != 3 || p.Spread.Months[2].Amount.Format() != "3,333.34 EUR" ||
		len(p.Spread.Seed) != 3 || p.Spread.Difference != nil {
		t.Errorf("spread = %+v", p.Spread)
	}
	assertAnswer(t, typing, http.StatusOK, `{"plannedCostUsd":null,"plannedCostPlan":null,"afterSaving":null,`+
		`"balanceIn":{"amount":"17000.00","currency":"EUR"},"balanceInPlan":{"amount":"18888.89","currency":"USD"},"spread":null}`)
	assertAnswer(t, gone, http.StatusNotFound, activityGoneBody)
}

func formatted(amounts ...*money.Money) string {
	text := ""
	for _, m := range amounts {
		if m != nil {
			text += m.Format()
		}
		text += "/"
	}
	return text
}

// A custom spread answers its total and what is left to spread; a pre-fill answers the balance in the currency.
func TestPreviewLineItem_CustomDifference_D061(t *testing.T) {
	t.Parallel()
	priya := apitest.New(t).SignIn(t, priyasEmail)
	body := previewBody("USD", "1000")
	body["spread"] = map[string]any{"method": "custom", "months": []any{
		map[string]any{"month": "2026-03", "amount": "400.00"}, map[string]any{"month": "2026-04", "amount": "700.00"},
	}}

	response := priya.Do(t, http.MethodPost, "/api/v1/activities/"+launchFilm+"/line-items/preview", body)

	assertAnswer(t, response, http.StatusOK, "")
	var p lineitem.Preview
	response.Decode(t, &p)
	if got := formatted(p.Spread.CustomTotal, p.Spread.Difference, p.BalanceIn); got != "1,100.00 USD/-100.00 USD/18,888.89 USD/" ||
		p.Spread.AddsUp {
		t.Errorf("custom total, difference, balance = %s, adds up %v", got, p.Spread.AddsUp)
	}
}
