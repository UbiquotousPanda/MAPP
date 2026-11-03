package summary

import (
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

const (
	dash        = "—"
	wordRevenue = "Revenue"
)

func heads(names ...string) []sheet.Cell {
	row := make([]sheet.Cell, 0, len(names))
	for _, n := range names {
		row = append(row, sheet.Bold(n))
	}
	return row
}

func moneyCell(m *money.Money) sheet.Cell {
	if m == nil {
		return sheet.Text(dash)
	}
	return sheet.Money(m.Amount)
}

func percentCell(p *int) sheet.Cell {
	if p == nil {
		return sheet.Text(dash)
	}
	return sheet.Percent(int64(*p))
}

func textCell(s *string) sheet.Cell {
	if s == nil {
		return sheet.Text(dash)
	}
	return sheet.Text(*s)
}

// figureCell writes what a stage or league value holds: money, a count or a per cent, or "—".
func figureCell(v any) sheet.Cell {
	switch x := v.(type) {
	case *money.Money:
		return moneyCell(x)
	case int64:
		return sheet.Number(x)
	case *int64:
		if x != nil {
			return sheet.Number(*x)
		}
	}
	return sheet.Text(dash)
}

func revenueSheet(r RevenueSection, currency string) sheet.Sheet {
	rows := [][]sheet.Cell{
		heads("Figure", "Value"),
		{sheet.Text("Period"), sheet.Text(r.PeriodLabel)},
		{sheet.Text(inCurrency("Actual or projected", currency)), moneyCell(r.ActualOrProjected)},
		{sheet.Text(inCurrency("Goal", currency)), moneyCell(r.Goal)},
		{sheet.Text("Performance (%)"), percentCell(r.Percent)},
		{sheet.Text("Variance"), sheet.Text(varianceWord(r.Variance))},
	}
	for _, c := range r.GoalCoverage {
		rows = append(rows, []sheet.Cell{sheet.Text("Goal coverage, " + stageWord(c.Stage) + " (%)"), percentCell(c.Percent)})
	}
	return sheet.Sheet{Name: "Revenue against goal", Rows: rows}
}

func trendSheet(periods []TrendPeriod, currency string) sheet.Sheet {
	rows := [][]sheet.Cell{heads("Period", "State", inCurrency("Actual", currency), inCurrency("Projected", currency),
		inCurrency("Goal", currency))}
	for _, p := range periods {
		rows = append(rows, []sheet.Cell{sheet.Text(p.Label), sheet.Text(stateWord(p.State)), moneyCell(p.Actual),
			moneyCell(p.Projected), moneyCell(p.Goal)})
	}
	return sheet.Sheet{Name: "Revenue trend", Rows: rows}
}

func funnelSheet(f FunnelSection, currency string) sheet.Sheet {
	rows := [][]sheet.Cell{heads("Stage", "Actual or projected", "Goal", "Performance (%)", "Variance")}
	for _, s := range f.Stages {
		name := stageWord(s.Stage)
		if s.Stage == StageRevenue {
			name = inCurrency(name, currency)
		}
		rows = append(rows, []sheet.Cell{sheet.Text(name), figureCell(s.ActualOrProjected),
			figureCell(s.Goal), percentCell(s.Percent), sheet.Text(varianceWord(s.Variance))})
	}
	return sheet.Sheet{Name: "Funnel stages", Rows: rows}
}

func conversionSheet(f FunnelSection) sheet.Sheet {
	rows := [][]sheet.Cell{heads("Stage", "Rate (%)", "Goal (%)", "Variance")}
	for _, c := range f.Conversions {
		rows = append(rows, []sheet.Cell{sheet.Text(stageWord(c.Stage)), textCell(c.Rate), textCell(c.Goal),
			sheet.Text(varianceWord(c.Variance))})
	}
	rows = append(rows, []sheet.Cell{}, heads("Period", "State", stageWord(f.Trend.Stage)+" rate (%)", "Goal (%)"))
	for _, p := range f.Trend.Periods {
		rows = append(rows, []sheet.Cell{sheet.Text(p.Label), sheet.Text(stateWord(p.State)), textCell(p.Rate),
			textCell(p.Goal)})
	}
	return sheet.Sheet{Name: "Conversions", Rows: rows}
}

// leagueSheet lists every value of the segment, not only the five the page shows.
func leagueSheet(l LeagueTable) sheet.Sheet {
	segment := dash
	if l.Segment != nil {
		segment = l.Segment.Label
	}
	figure := tableWord(l.Table)
	if l.Table == TableRevenue || l.Table == TableCost {
		figure = inCurrency(figure, l.currency)
	}
	rows := [][]sheet.Cell{heads(segment, figure)}
	for _, r := range l.every {
		rows = append(rows, []sheet.Cell{sheet.Text(r.Name), figureCell(r.Value)})
	}
	rows = append(rows, []sheet.Cell{sheet.Bold("Total"), figureCell(l.Total)})
	return sheet.Sheet{Name: "Top " + tableWord(l.Table) + " by " + segment, Rows: rows}
}

func inCurrency(label, currency string) string {
	return label + " (" + currency + ")"
}

func varianceWord(v string) string {
	return map[string]string{VarianceAbovePlan: "Above plan", VarianceOnPlan: "On plan", VarianceBelowPlan: "Below plan",
		VarianceNoGoal: "No goal"}[v]
}

func stageWord(s Stage) string {
	return map[Stage]string{StageINQ: "INQ", StageMQL: "MQL", StageRevenue: wordRevenue}[s]
}

func stateWord(s string) string {
	return map[string]string{PeriodActual: "Actual", PeriodInProgress: "In progress", PeriodProjected: "Projected"}[s]
}

func tableWord(t string) string {
	return map[string]string{TableRevenue: wordRevenue, TablePerformance: "Performance (%)", TableCost: "Actual cost",
		TableROI: "ROI (%)"}[t]
}
