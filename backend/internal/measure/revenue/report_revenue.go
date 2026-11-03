package revenue

import (
	"context"
	"slices"
	"time"

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
	out := RevenueReport{Cards: revenueCards(sums, w, anyGoal, display), Period: periodShown(period),
		Periods: revenuePeriods(sums, period, w, display), Projection: stampOf(series)}
	if len(series) == 0 {
		out.Reason = ReasonNoData
	} else if !anyGoal {
		out.Reason = ReasonNoGoal
	}
	return out
}

func periodShown(period string) string {
	if period == measure.PeriodQuarter {
		return measure.PeriodQuarter
	}
	return measure.PeriodMonth
}

// stampOf names the first model behind a projected figure, so a reviewer can reproduce it; reports
// mixing models name one, and the ranked list's own entries carry the rest.
func stampOf(series []ActivitySeries) *Stamp {
	for _, a := range series {
		if a.HasProjection && a.ModelName != "" {
			return &Stamp{ModelName: a.ModelName, ModelChangedAt: a.ModelChangedAt.Format(time.RFC3339)}
		}
	}
	return nil
}
