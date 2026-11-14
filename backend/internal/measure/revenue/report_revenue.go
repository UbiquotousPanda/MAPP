package revenue

import (
	"context"
	"slices"

	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// Report is Revenue against goal: the cards and the period series for the activities in view.
func (s *Service) Report(ctx context.Context, a actor.Actor, f measure.Filter) (RevenueReport, error) {
	var out RevenueReport
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		sc, series, err := s.series(ctx, a, f, categoryOf(f.Own))
		if err != nil {
			return err
		}
		out = s.buildRevenueReport(series, f.Period, sc)
		return nil
	})
	return out, err
}

func (s *Service) buildRevenueReport(series []ActivitySeries, period string, sc measure.Scope) RevenueReport {
	w := window{today: date.Today(s.now()), year: sc.Year}
	display := money.DisplayIn(sc.Currency.Code, sc.Currency.Rate.String())
	sums := sumMonths(series, revenueMeasure())
	anyGoal := slices.ContainsFunc(series, func(a ActivitySeries) bool { return a.HasProjection })
	cards := revenueCards(sums, anyGoal, display)
	cards.Actual = actualMoneyCard(series, display, sums)
	if !anyTotal(series, revenueMeasure()) {
		cards.Projected = MoneyCard{Reason: reportReason(series, false)}
	}
	return RevenueReport{Cards: cards, Period: periodShown(period), Periods: revenuePeriods(sums, period, w, display),
		Totals: revenueTotals(sums, display), Projection: stampOf(series), Projections: stampsOf(series), Reason: reportReason(series, anyGoal)}
}

func periodShown(period string) string {
	if period == measure.PeriodQuarter {
		return measure.PeriodQuarter
	}
	return measure.PeriodMonth
}

// stampOf names the first model behind a projected figure, kept for compatibility; stampsOf names every one.
func stampOf(series []ActivitySeries) *Stamp {
	if stamps := stampsOf(series); len(stamps) > 0 {
		return &stamps[0]
	}
	return nil
}
