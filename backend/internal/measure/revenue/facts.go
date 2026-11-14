package revenue

import (
	"context"

	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

const stageRevenue = "revenue"

// activityTotals lays one activity's counted facts out month by month; a month without a fact stays nil, so it shows
// "—" while a month whose facts sum to zero shows 0.
type activityTotals struct {
	inq, mql [projection.Months]*int64
	revenue  [projection.Months]*money.Amount
	excluded int
}

// factsByActivity reads the facts in one query whatever the number of activities and converts revenue at the
// current rate; a fact in a currency with no rate is left out and counted.
func (s *Service) factsByActivity(ctx context.Context, scope authz.Scope, activityIDs []string, year int) (map[string]activityTotals, error) {
	if len(activityIDs) == 0 {
		return map[string]activityTotals{}, nil
	}
	rows, err := s.deps.Facts.ReportTotals(ctx, scope, activityIDs, year)
	if err != nil {
		return nil, err
	}
	rates, err := s.deps.Rates.Rates(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]activityTotals, len(activityIDs))
	for _, r := range rows {
		s.addRow(out, r, year, rates)
	}
	return out, nil
}

func (s *Service) addRow(out map[string]activityTotals, r FactTotal, year int, rates money.Rates) {
	i := monthIndex(r.Month, year)
	if i < 0 {
		return
	}
	t := out[r.ActivityID]
	switch r.Stage {
	case stageRevenue:
		t = addRevenue(t, r, i, rates)
	case StageINQ:
		t.inq[i] = new(int64Of(t.inq[i]) + r.Counts)
	case StageMQL:
		t.mql[i] = new(int64Of(t.mql[i]) + r.Counts)
	}
	out[r.ActivityID] = t
}

func addRevenue(t activityTotals, r FactTotal, i int, rates money.Rates) activityTotals {
	converted, err := rates.Convert(money.Money{Amount: money.FromCents(r.AmountMinor), Currency: r.Currency},
		money.BaseCurrency)
	if err != nil {
		t.excluded += r.FactCount
		return t
	}
	var sum money.Amount
	if t.revenue[i] != nil {
		sum = *t.revenue[i]
	}
	sum = sum.Add(converted.Amount)
	t.revenue[i] = &sum
	return t
}

// monthIndex places a fact month ("2026-01") in the plan year, or -1 when it belongs to another year.
func monthIndex(month string, year int) int {
	if len(month) < 7 {
		return -1
	}
	y := 0
	for _, r := range month[:4] {
		if r < '0' || r > '9' {
			return -1
		}
		y = y*10 + int(r-'0')
	}
	if y != year {
		return -1
	}
	m := 0
	for _, r := range month[5:7] {
		if r < '0' || r > '9' {
			return -1
		}
		m = m*10 + int(r-'0')
	}
	return m - 1
}
