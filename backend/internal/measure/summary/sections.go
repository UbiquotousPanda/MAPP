package summary

import (
	"slices"
	"strconv"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

// builder turns the series into the report's sections in the display currency.
type builder struct {
	display   money.Display
	year      int
	quarterly bool
}

func newBuilder(sc measure.Scope, periodParam string) builder {
	return builder{display: money.DisplayIn(sc.Currency.Code, sc.Currency.Rate.String()), year: sc.Year,
		quarterly: periodParam == measure.PeriodQuarter}
}

func (b builder) money(c int64) *money.Money {
	m := b.display.Money(money.USD(money.FromCents(c)))
	return &m
}

func (b builder) revenueSection(series []revenue.ActivitySeries, plans map[string]revenue.Goal) RevenueSection {
	t := sumSeries(series, revenuePick())
	out := RevenueSection{PeriodLabel: "FY " + strconv.Itoa(b.year), ActualOrProjected: b.total(t),
		Performance: performanceOf(t.actualOrProjected(), t.goal), GoalCoverage: coverageOf(series, plans),
		Trend: []TrendPeriod{}}
	if t.anyGoal {
		out.Goal = b.money(t.goal)
	}
	for _, p := range periodsOf(t.months, b.quarterly) {
		out.Trend = append(out.Trend, b.trendPeriod(p))
	}
	out.TrendTotals = b.trendTotals(t)
	return out
}

// trendTotals adds the months in USD and converts once, so the row is the same in month and quarter view.
func (b builder) trendTotals(t totals) TrendTotals {
	year := period{state: PeriodActual}
	for _, m := range periodsOf(t.months, false) {
		year = year.with(m)
	}
	p := b.trendPeriod(year)
	return TrendTotals{Actual: p.Actual, Projected: p.Projected, Goal: p.Goal,
		GoalAfterYear: revenue.GoalAfterYear(b.display, t.goal, &year.goal)}
}

func (b builder) trendPeriod(p period) TrendPeriod {
	out := TrendPeriod{Key: p.key, Label: p.label, State: p.state}
	if p.goal != 0 {
		out.Goal = b.money(p.goal)
	}
	if p.counted {
		out.Actual = b.money(p.actual)
	}
	if p.projects {
		out.Projected = b.money(p.projected)
	}
	return out
}

func (b builder) total(t totals) *money.Money {
	if !t.anyTotal {
		return nil
	}
	return b.money(t.actualOrProjected())
}

func coverageOf(series []revenue.ActivitySeries, plans map[string]revenue.Goal) []Coverage {
	var activities, planned [3]int64
	for _, s := range series {
		addGoals(&activities, s.Goal)
	}
	for _, g := range plans {
		addGoals(&planned, g)
	}
	out := make([]Coverage, 0, len(activities))
	for i, stage := range []Stage{StageINQ, StageMQL, StageRevenue} {
		out = append(out, Coverage{Stage: stage, Percent: goalCoverage(activities[i], planned[i])})
	}
	return out
}

func addGoals(sums *[3]int64, g revenue.Goal) {
	sums[0] += valueOf(g.INQ)
	sums[1] += valueOf(g.MQL)
	sums[2] += valueOf(cents(g.RevenueUSD))
}

func (b builder) funnelSection(series []revenue.ActivitySeries) FunnelSection {
	counted := countedStages(series)
	figures := map[Stage]Figures{}
	out := FunnelSection{Conversions: []Conversion{}, Trend: ConversionTrend{Stage: StageMQL, Periods: []RatePeriod{}}}
	for _, stage := range counted {
		t := sumSeries(series, stagePick(stage))
		figures[stage] = Figures{Actual: t.actual(), Goal: t.goal}
		out.Stages = append(out.Stages, StageFigures{Stage: stage, ActualOrProjected: figureIfAny(countOf(t)),
			Goal: optionalCount(t), Performance: performanceOf(t.actualOrProjected(), t.goal),
			PlansWithout: plansWithout(series, stage)})
	}
	out.Stages = append(out.Stages, b.revenueStage(series))
	goal, periodGoals := b.conversionGoals(series)
	out.Conversions = append(out.Conversions, conversions(counted, figures, goal)...)
	if slices.Contains(counted, StageMQL) && slices.Contains(counted, StageINQ) {
		out.Trend.Periods = b.conversionTrend(series, periodGoals)
	}
	return out
}

func (b builder) revenueStage(series []revenue.ActivitySeries) StageFigures {
	t := sumSeries(series, revenuePick())
	out := StageFigures{Stage: StageRevenue, ActualOrProjected: figureIfAny(b.total(t)),
		Performance: performanceOf(t.actualOrProjected(), t.goal)}
	if t.anyGoal {
		out.Goal = b.money(t.goal)
	}
	return out
}

func countOf(t totals) *int64 {
	if !t.anyTotal {
		return nil
	}
	total := t.actualOrProjected()
	return &total
}

// figureIfAny keeps a missing figure a plain nil, so a stage's "—" is null however its figure is typed.
func figureIfAny[T any](v *T) any {
	if v == nil {
		return nil
	}
	return v
}

func optionalCount(t totals) *int64 {
	if !t.anyGoal {
		return nil
	}
	return &t.goal
}

func (b builder) conversionTrend(series []revenue.ActivitySeries, goals []*int64) []RatePeriod {
	inq := periodsOf(sumSeries(series, stagePick(StageINQ)).months, b.quarterly)
	mql := periodsOf(sumSeries(series, stagePick(StageMQL)).months, b.quarterly)
	out := make([]RatePeriod, 0, len(mql))
	for i, p := range mql {
		if i >= len(inq) {
			break
		}
		var goal *int64
		if i < len(goals) {
			goal = goals[i]
		}
		out = append(out, RatePeriod{Key: p.key, Label: p.label, State: p.state,
			Rate: rateOf(p.shownValue(), inq[i].shownValue()), Goal: tenthsText(goal)})
	}
	return out
}

// countedStages are the counted stages any model in view allows, in funnel order, as Revenue's Funnel offers them.
func countedStages(series []revenue.ActivitySeries) []Stage {
	var out []Stage
	for _, stage := range []Stage{StageINQ, StageMQL} {
		if slices.ContainsFunc(series, func(s revenue.ActivitySeries) bool { return allows(s, stage) }) {
			out = append(out, stage)
		}
	}
	return out
}

// plansWithout counts the plans whose model does not allow the stage; a plan without a model is not counted.
func plansWithout(series []revenue.ActivitySeries, stage Stage) int {
	plans := map[string]bool{}
	for _, s := range series {
		if len(s.AllowedStages) > 0 && !allows(s, stage) {
			plans[s.PlanID] = true
		}
	}
	return len(plans)
}

func allows(s revenue.ActivitySeries, stage Stage) bool {
	return slices.Contains(s.AllowedStages, string(stage))
}
