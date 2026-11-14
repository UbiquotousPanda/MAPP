package revenue

import (
	"context"
	"slices"

	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
)

// FunnelReport is one funnel stage against goal: the stage selector, its cards and period series.
func (s *Service) FunnelReport(ctx context.Context, a actor.Actor, f measure.Filter, stage string) (FunnelReport, error) {
	var out FunnelReport
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		sc, series, err := s.series(ctx, a, f, categoryOf(f.Own))
		if err != nil {
			return err
		}
		available := availableStages(series)
		w := window{today: date.Today(s.now()), year: sc.Year}
		out = buildFunnelReport(funnelReportInput{series: series, stage: stageOf(stage, available), available: available,
			period: f.Period, w: w})
		return nil
	})
	return out, err
}

// availableStages lists every stage any activity's model allows, in funnel order; deals is never offered.
func availableStages(series []ActivitySeries) []string {
	stages := make([]string, 0, 2)
	for _, stage := range []string{StageINQ, StageMQL} {
		if slices.ContainsFunc(series, func(a ActivitySeries) bool { return slices.Contains(a.AllowedStages, stage) }) {
			stages = append(stages, stage)
		}
	}
	return stages
}

func stageOf(requested string, available []string) string {
	if slices.Contains(available, requested) {
		return requested
	}
	if len(available) > 0 {
		return available[0]
	}
	return StageINQ
}

// funnelReportInput groups FunnelReport's working parts so building it stays within the argument limit.
type funnelReportInput struct {
	series    []ActivitySeries
	stage     string
	available []string
	period    string
	w         window
}

func buildFunnelReport(in funnelReportInput) FunnelReport {
	m := stageMeasure(in.stage)
	series := AllowingStage(in.series, in.stage)
	sums := sumMonths(series, m)
	anyGoal := slices.ContainsFunc(series, func(a ActivitySeries) bool { return m.covers(a) && a.HasProjection })
	out := FunnelReport{Stage: in.stage, AvailableStages: in.available, UncoveredCount: uncoveredCount(in.series, in.stage),
		Period: periodShown(in.period), Periods: funnelPeriods(sums, in.period, in.w), Totals: funnelTotals(sums),
		Projection: stampOf(series), Projections: stampsOf(series)}
	out.Cards = funnelCards(sums, sums.total(), anyGoal, previousStageTotal(in.series, in.stage))
	out.Cards.Actual = intCard(sums.actualTotal(), counted(series, m), actualReason(series, m))
	if _, hasPrevious := previousStage(in.stage); hasPrevious && out.Cards.Actual.Value == nil {
		out.Cards.Conversion = NumberCard{Reason: out.Cards.Actual.Reason}
	}
	if !anyTotal(series, m) {
		out.Cards.Projected = NumberCard{Reason: reportReason(in.series, false)}
	}
	out.Reason = reportReason(in.series, anyGoal)
	return out
}

// uncoveredCount counts the plans whose model does not allow the stage; a plan without a model is not counted.
func uncoveredCount(series []ActivitySeries, stage string) int {
	uncovered := map[string]bool{}
	for _, a := range series {
		if excludesStage(a, stage) {
			uncovered[a.PlanID] = true
		}
	}
	return len(uncovered)
}

// previousStageTotal is the actual total of the stage before the selected one, for conversion.
func previousStageTotal(series []ActivitySeries, stage string) *int64 {
	previous, found := previousStage(stage)
	if !found {
		return nil
	}
	total := sumMonths(AllowingStage(series, previous), stageMeasure(previous)).actualTotal()
	return &total
}

func previousStage(stage string) (string, bool) {
	if stage == StageMQL {
		return StageINQ, true
	}
	return "", false
}
