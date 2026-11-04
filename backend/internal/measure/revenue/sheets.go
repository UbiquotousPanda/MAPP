package revenue

import (
	"context"
	"math"
	"net/url"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

const (
	widgetCards   = "cards"
	widgetPeriods = "periods"
	widgetRanked  = "ranked"
	noValue       = "—"

	sheetCards       = "Cards"
	sheetPeriods     = "Periods"
	sheetRanked      = "Ranked list"
	labelPerformance = "Performance (%)"
	labelOwner       = "Owner"
	labelModel       = "Model"
)

func levelWords() map[string]string {
	return map[string]string{"plan": "Plan", "campaign": "Campaign", "initiative": "Initiative", "activity": "Activity"}
}

// revenueSheets are Revenue's widgets as 039's export writes them; the ranked list has every page.
func (s *Service) revenueSheets(ctx context.Context, a actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	report, err := s.Report(ctx, a, f)
	if err != nil {
		return nil, err
	}
	q, err := unboundedRanked(f.Own, revenueSorts(), SortProjectedRevenue)
	if err != nil {
		return nil, err
	}
	ranked, err := s.RankedRevenue(ctx, a, f, q)
	if err != nil {
		return nil, err
	}
	return []measure.WidgetSheet{
		{Key: widgetCards, Sheet: revenueCardsSheet(report.Cards)},
		{Key: widgetPeriods, Sheet: revenuePeriodsSheet(report.Periods)},
		{Key: widgetRanked, Sheet: revenueRankedSheet(ranked)},
	}, nil
}

func unboundedRanked(own url.Values, sorts []string, defaultSort string) (RankedQuery, error) {
	q, err := ranking.Parse(own, sorts, defaultSort)
	q.Page, q.Size = 1, math.MaxInt32
	return rankedQueryOf(q, ""), err
}

func revenueCardsSheet(c RevenueCards) sheet.Sheet {
	rows := [][]sheet.Cell{{sheet.Bold("Figure"), sheet.Bold("Value")}}
	for _, row := range []struct {
		label string
		value sheet.Cell
	}{
		{"Revenue goal", moneyCardCell(c.Goal)}, {"Actual revenue", moneyCardCell(c.Actual)},
		{"Actual or projected", moneyCardCell(c.Projected)}, {labelPerformance, numberCardCell(c.Performance.NumberCard)},
	} {
		rows = append(rows, []sheet.Cell{sheet.Text(row.label), row.value})
	}
	return sheet.Sheet{Name: sheetCards, Rows: rows}
}

func revenuePeriodsSheet(periods []RevenuePeriod) sheet.Sheet {
	rows := [][]sheet.Cell{boldRow("Period", "Goal", "Actual", "Projected")}
	for _, p := range periods {
		rows = append(rows, []sheet.Cell{sheet.Text(p.Key), moneyCell(p.Goal), moneyCell(p.Actual), moneyCell(p.Projected)})
	}
	return sheet.Sheet{Name: sheetPeriods, Rows: rows}
}

func revenueRankedSheet(r RevenueRanked) sheet.Sheet {
	rows := [][]sheet.Cell{boldRow("Group", "Level", "Name", "Goal", "Actual", "Projected", labelPerformance,
		"Attributed revenue ("+r.Attribution.Model+")", "Actual cost", "ROI (%, "+r.Attribution.Words()+")", labelOwner, labelModel)}
	for _, g := range r.Groups {
		for _, e := range g.Entries {
			rows = append(rows, revenueEntryRow(g.Label, e, ""))
			for _, child := range e.Children {
				rows = append(rows, revenueEntryRow(g.Label, child, "  "))
			}
		}
	}
	return sheet.Sheet{Name: sheetRanked, Rows: rows}
}

func revenueEntryRow(group string, e RevenueEntry, indent string) []sheet.Cell {
	f := e.Figures
	return []sheet.Cell{sheet.Text(group), sheet.Text(levelWords()[e.Level]), sheet.Text(indent + e.Name),
		moneyCell(f.Goal), moneyCell(f.Actual), moneyCell(f.Projected), numberCell(f.Performance),
		moneyCell(f.AttributedRevenue), moneyCell(f.ActualCost), numberCell(f.ROI), ownerCell(e.Owner), modelCell(f.Projection)}
}

func boldRow(labels ...string) []sheet.Cell {
	row := make([]sheet.Cell, 0, len(labels))
	for _, label := range labels {
		row = append(row, sheet.Bold(label))
	}
	return row
}

func moneyCell(m *money.Money) sheet.Cell {
	if m == nil {
		return sheet.Text(noValue)
	}
	return sheet.Money(m.Amount)
}

func moneyCardCell(c MoneyCard) sheet.Cell { return moneyCell(c.Value) }

// numberCell keeps a figure with decimals, such as a 2.5% conversion, in sheet's one decimal kind.
func numberCell(n *float64) sheet.Cell {
	if n == nil {
		return sheet.Text(noValue)
	}
	if whole := math.Trunc(*n); whole == *n {
		return sheet.Number(int64(whole))
	}
	return sheet.Money(money.FromCents(int64(math.Round(*n * 100))))
}

func numberCardCell(c NumberCard) sheet.Cell { return numberCell(c.Value) }

// funnelSheets are Funnel stages' widgets as 039's export writes them.
func (s *Service) funnelSheets(ctx context.Context, a actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	report, err := s.FunnelReport(ctx, a, f, f.Own.Get(paramStage))
	if err != nil {
		return nil, err
	}
	q, err := unboundedRanked(f.Own, funnelSorts(), SortProjected)
	if err != nil {
		return nil, err
	}
	q.Stage = report.Stage
	ranked, err := s.RankedFunnel(ctx, a, f, q)
	if err != nil {
		return nil, err
	}
	return []measure.WidgetSheet{
		{Key: widgetCards, Sheet: funnelCardsSheet(report.Stage, report.Cards)},
		{Key: widgetPeriods, Sheet: funnelPeriodsSheet(report.Periods)},
		{Key: widgetRanked, Sheet: funnelRankedSheet(ranked)},
	}, nil
}

func funnelCardsSheet(stage string, c FunnelCards) sheet.Sheet {
	name, _ := stageWords(stage)
	rows := [][]sheet.Cell{{sheet.Bold("Figure"), sheet.Bold("Value")}}
	for _, row := range []struct {
		label string
		value sheet.Cell
	}{
		{name + " goal", numberCardCell(c.Goal)}, {name + " actual", numberCardCell(c.Actual)},
		{name + " actual or projected", numberCardCell(c.Projected)},
		{labelPerformance, numberCardCell(c.Performance.NumberCard)}, {"Conversion (%)", numberCardCell(c.Conversion)},
	} {
		rows = append(rows, []sheet.Cell{sheet.Text(row.label), row.value})
	}
	return sheet.Sheet{Name: sheetCards, Rows: rows}
}

func funnelPeriodsSheet(periods []FunnelPeriod) sheet.Sheet {
	rows := [][]sheet.Cell{boldRow("Period", "Goal", "Actual", "Projected")}
	for _, p := range periods {
		rows = append(rows, []sheet.Cell{sheet.Text(p.Key), int64Cell(p.Goal), int64Cell(p.Actual), int64Cell(p.Projected)})
	}
	return sheet.Sheet{Name: sheetPeriods, Rows: rows}
}

func funnelRankedSheet(r FunnelRanked) sheet.Sheet {
	rows := [][]sheet.Cell{boldRow("Group", "Level", "Name", "Goal", "Actual", "Projected", labelPerformance,
		"Conversion (%)", labelOwner, labelModel)}
	for _, g := range r.Groups {
		for _, e := range g.Entries {
			rows = append(rows, funnelEntryRow(g.Label, e, ""))
			for _, child := range e.Children {
				rows = append(rows, funnelEntryRow(g.Label, child, "  "))
			}
		}
	}
	return sheet.Sheet{Name: sheetRanked, Rows: rows}
}

func funnelEntryRow(group string, e FunnelEntry, indent string) []sheet.Cell {
	f := e.Figures
	return []sheet.Cell{sheet.Text(group), sheet.Text(levelWords()[e.Level]), sheet.Text(indent + e.Name),
		int64Cell(f.Goal), int64Cell(f.Actual), int64Cell(f.Projected), numberCell(f.Performance), numberCell(f.Conversion),
		ownerCell(e.Owner), modelCell(f.Projection)}
}

func ownerCell(o *allwork.Owner) sheet.Cell {
	if o == nil {
		return sheet.Text(noValue)
	}
	return sheet.Text(o.Name)
}

func modelCell(s *Stamp) sheet.Cell {
	if s == nil {
		return sheet.Text(noValue)
	}
	return sheet.Text(s.ModelName)
}

func int64Cell(n *int64) sheet.Cell {
	if n == nil {
		return sheet.Text(noValue)
	}
	return sheet.Number(*n)
}
