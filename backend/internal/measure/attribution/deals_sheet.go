package attribution

import (
	"context"
	"strings"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

const (
	sheetDeals = "Deals"
	noValue    = "—"

	ScopeSentence = "Worked out from the plans you can open; someone who can open other plans may see different shares."
)

// Sheet is the panel as 039's export writes it: every deal on one sheet, the shares in the display currency.
func (d *Deals) Sheet(ctx context.Context, a actor.Actor, q DealsQuery) (sheet.Sheet, error) {
	all, err := d.Of(ctx, a, everyDeal(q))
	if err != nil {
		return sheet.Sheet{}, err
	}
	return dealsSheet(all), nil
}

// Describe gives the export's notes on the panel: the activity, the model, the comparison and the scope.
func (d *Deals) Describe(ctx context.Context, a actor.Actor, q DealsQuery) ([][2]string, error) {
	all, err := d.Of(ctx, a, everyDeal(q))
	if err != nil {
		return nil, err
	}
	notes := [][2]string{{"Deals of", all.Activity.Name + " (" + all.Activity.PlanName + ")"}, {"Attribution model", all.Model.Name}}
	if all.Comparison != nil {
		notes = append(notes, [2]string{"Compared with", all.Comparison.Name})
	}
	return append(notes, [2]string{"Scope", ScopeSentence}), nil
}

func everyDeal(q DealsQuery) DealsQuery {
	return DealsQuery{ActivityID: q.ActivityID, Year: q.Year, Currency: q.Currency, Compare: q.Compare}
}

func dealsSheet(d ActivityDeals) sheet.Sheet {
	currency := d.Credited.Currency
	labels := []string{"Deal", "Date", "Booked on", "Amount", "Currency", "Rate per USD", "US dollars", "Steps",
		"Steps on this activity", "Share (" + currency + ", " + d.Model.Name + ")"}
	if d.Comparison != nil {
		labels = append(labels, "Share ("+currency+", "+d.Comparison.Name+", for comparison)")
	}
	rows := make([][]sheet.Cell, 0, len(d.Deals)+1)
	rows = append(rows, boldCells(labels))
	for _, deal := range d.Deals {
		rows = append(rows, dealRow(deal, d.Comparison != nil))
	}
	return sheet.Sheet{Name: sheetDeals, Rows: rows}
}

func dealRow(deal Deal, compared bool) []sheet.Cell {
	row := []sheet.Cell{sheet.Text(deal.Source + " · " + deal.Reference), sheet.Date(deal.Date), sheet.Text(deal.BookedOn.Name),
		sheet.Money(deal.Amount.Amount), sheet.Text(deal.Amount.Currency), textOrDash(deal.Rate), sheet.Money(deal.USD.Amount),
		sheet.Text(stepsText(deal, false)), sheet.Text(stepsText(deal, true)), sheet.Money(deal.Share.Amount)}
	if compared {
		row = append(row, moneyOrDash(deal.ComparisonShare))
	}
	return row
}

// stepsText lists the sharing steps as "MQL · Tellus webinar series · 2026-03-02 · 12000.00", or says why there are none.
func stepsText(deal Deal, onlyThisActivity bool) string {
	switch {
	case onlyThisActivity && deal.Journey != JourneyShared:
		return ""
	case deal.Journey == JourneyNone:
		return "No journey"
	case deal.Journey == JourneyUnattributed:
		return "No step before the deal"
	}
	var parts []string
	for _, s := range deal.Steps {
		if onlyThisActivity && !s.ThisActivity {
			continue
		}
		parts = append(parts, kindLabels(s.Kinds)+" · "+s.Activity.Name+" · "+s.Date.String()+" · "+s.Share.Amount.String())
	}
	return strings.Join(parts, "; ")
}

func kindLabels(kinds []string) string {
	words := map[string]string{kindINQ: "INQ", kindMQL: "MQL", kindSessions: "Sessions", kindVisits: "Visits", kindEngagement: "Engagement touches"}
	labels := make([]string, 0, len(kinds))
	for _, k := range kinds {
		if w, known := words[k]; known {
			labels = append(labels, w)
		} else {
			labels = append(labels, k)
		}
	}
	return strings.Join(labels, " + ")
}

func boldCells(labels []string) []sheet.Cell {
	cells := make([]sheet.Cell, 0, len(labels))
	for _, l := range labels {
		cells = append(cells, sheet.Bold(l))
	}
	return cells
}

func textOrDash(s *string) sheet.Cell {
	if s == nil {
		return sheet.Text(noValue)
	}
	return sheet.Text(*s)
}

func moneyOrDash(m *money.Money) sheet.Cell {
	if m == nil {
		return sheet.Text(noValue)
	}
	return sheet.Money(m.Amount)
}
