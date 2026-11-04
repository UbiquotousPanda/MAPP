package gsaplink

import (
	"cmp"
	"slices"

	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

type orderKey struct {
	lineItem, po string
}

// order adds up one purchase order's transactions on one line item, each in the report currency (SC-003).
type order struct {
	po, invoiced, paid    money.Amount
	lines                 []string
	date                  date.Date
	vendor, request, gsap string
}

func (o *order) add(t Transaction, amount money.Amount) {
	switch t.Type {
	case TypePurchaseOrder:
		o.po = o.po.Add(amount)
		o.lines = append(o.lines, t.LineNumber)
		if o.date.IsZero() || t.PostingDate.Before(o.date) {
			o.date = t.PostingDate
		}
		o.vendor, o.request, o.gsap = cmp.Or(o.vendor, t.Vendor), cmp.Or(o.request, t.PurchaseRequestID),
			cmp.Or(o.gsap, t.GsapPrNumber)
	case TypeInvoice:
		o.invoiced = o.invoiced.Add(amount)
	case TypePayment:
		o.paid = o.paid.Add(amount)
	}
}

// ordersTab gives one row per line item and purchase order: its PO lines, and the invoices (credit notes
// negative) and payments that refer to it, by 015's links (FR-011 – FR-013). Totals cover every row.
func (y year) ordersTab(transactions []Transaction, rates money.Rates) OrdersTab {
	orders, keys, inReport := map[orderKey]*order{}, []orderKey{}, y.inReport(rates)
	for _, t := range transactions {
		if !y.inView[t.LineItemID] || !y.seesFinance(y.byID[t.LineItemID].PlanID) {
			continue
		}
		k := orderKey{lineItem: t.LineItemID, po: t.PoNumber}
		if orders[k] == nil {
			orders[k], keys = &order{}, append(keys, k)
		}
		orders[k].add(t, inReport(t.Amount))
	}
	tab := OrdersTab{Rows: make([]OrderRow, 0, len(keys))}
	var total order
	for _, k := range keys {
		o := orders[k]
		if len(o.lines) == 0 {
			continue // invoices or payments of a purchase order whose lines are on another line item
		}
		li := y.byID[k.lineItem]
		slices.SortFunc(o.lines, compareIDs)
		tab.Rows = append(tab.Rows, OrderRow{LineItemID: li.ID, LineItem: li.Name, Path: y.path(li),
			PurchaseRequestID: o.request, GsapPrNumber: o.gsap, PoNumber: k.po, PoLines: slices.Compact(o.lines),
			PoDate: o.date, Vendor: o.vendor, PoAmount: y.reportMoney(o.po), Invoiced: y.reportMoney(o.invoiced),
			Paid: y.reportMoney(o.paid)})
		total.po, total.invoiced, total.paid = total.po.Add(o.po), total.invoiced.Add(o.invoiced), total.paid.Add(o.paid)
	}
	if y.coverage().Plans > 0 {
		po, invoiced, paid := y.reportMoney(total.po), y.reportMoney(total.invoiced), y.reportMoney(total.paid)
		tab.Totals = OrderTotals{PoAmount: &po, Invoiced: &invoiced, Paid: &paid}
	}
	return tab
}
