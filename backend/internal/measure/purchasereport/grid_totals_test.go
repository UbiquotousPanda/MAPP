package purchasereport_test

import (
	"fmt"
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure/purchasereport"
	"mapp/internal/measure/purchasereport/purchasereporttest"
	"mapp/internal/platform/money"
)

func totalsText(t purchasereport.GridTotals) string {
	return fmt.Sprintf("%d requests, %d lines, committed %s, invoiced %s", t.PurchaseRequests, t.Lines,
		amountText(t.Committed), amountText(t.Invoiced))
}

func TestGridTotals_EveryVendorOnEveryPage_042_FR029(t *testing.T) {
	t.Parallel()
	f := purchasereporttest.New(t)
	for _, c := range []struct {
		name string
		q    purchasereport.Query
		want string
	}{
		{"everything", purchasereport.Query{}, "9 requests, 10 lines, committed 3900.00 USD, invoiced 700.00 USD"},
		{"searched", purchasereport.Query{Search: "stage"}, "1 requests, 1 lines, committed 2000.00 USD, invoiced 0.00 USD"},
		{"by status", purchasereport.Query{Statuses: []purchasereport.Status{purchasereport.StatusClosed}},
			"1 requests, 1 lines, committed 300.00 USD, invoiced 300.00 USD"},
		{"page past the end", purchasereport.Query{PageSize: 25, Page: 9},
			"9 requests, 10 lines, committed 3900.00 USD, invoiced 700.00 USD"},
	} {
		if got := totalsText(reportOf(t, f, c.q).Grid.Totals); got != c.want {
			t.Errorf("%s: totals %s, want %s", c.name, got, c.want)
		}
	}
}

func TestGridTotals_PagedInTheDisplayCurrency_042_FR029(t *testing.T) {
	t.Parallel()
	f := purchasereporttest.New(t)
	f.Deps.Purchases = purchasereporttest.Purchases{Requests: purchasereporttest.Vendors(12)}
	sc := f.Scope
	rate, _ := money.ParseRate("0.92")
	sc.Currency = allwork.Currency{Code: "EUR", Rate: rate}
	f.Deps.Scope = purchasereporttest.Scoper{Result: sc}

	view := reportOf(t, f, purchasereport.Query{PageSize: 5, Page: 3})
	if got, want := totalsText(view.Grid.Totals), "12 requests, 12 lines, committed 717.60 EUR, invoiced 0.00 EUR"; got != want {
		t.Errorf("third page of five: totals %s, want every vendor's (780.00 USD at 0.92) %s", got, want)
	}
	if got := amountText(view.Cards.Committed); got != amountText(view.Grid.Totals.Committed) {
		t.Errorf("unfiltered grid committed %s, want the Committed card %s", amountText(view.Grid.Totals.Committed), got)
	}
}

func TestGridTotals_HiddenPlansShowADash_042_FR020(t *testing.T) {
	t.Parallel()
	f := purchasereporttest.New(t)
	f.Deps.Purchases = purchasereporttest.Purchases{Requests: purchasereporttest.Hidden()}

	if got, want := totalsText(reportOf(t, f, purchasereport.Query{}).Grid.Totals), "1 requests, 1 lines, committed —, invoiced —"; got != want {
		t.Errorf("only a plan without finance.view: totals %s, want %s", got, want)
	}
}
