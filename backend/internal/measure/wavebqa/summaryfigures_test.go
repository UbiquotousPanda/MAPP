package wavebqa_test

import (
	"net/http"
	"slices"
	"strconv"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/projection"
)

type worded struct {
	Cards struct {
		Performance struct{ Variance string } `json:"performance"`
	} `json:"cards"`
}

func revenueWorded(t *testing.T, who person, query string) (revenueAnswer, string) {
	t.Helper()
	r := who.expect(t, get(reportPath("/reports/revenue", query)), http.StatusOK)
	return decode[revenueAnswer](t, r), decode[worded](t, r).Cards.Performance.Variance
}

func funnelWorded(t *testing.T, who person, query string) (funnelAnswer, string) {
	t.Helper()
	r := who.expect(t, get(reportPath("/reports/funnel", query)), http.StatusOK)
	return decode[funnelAnswer](t, r), decode[worded](t, r).Cards.Performance.Variance
}

func summaryQueries(t *testing.T, alexSees person) []string {
	t.Helper()
	queries := []string{"", "period=quarter", "currency=EUR", "activityStatus=submitted", "activityType=AT-1003"}
	for _, id := range frameOf(t, alexSees, "summary").planIDs() {
		queries = append(queries, "plan="+id)
	}
	for _, c := range append(categoryIDs(t, alexSees), uncategorised) {
		queries = append(queries, "category="+c)
	}
	return queries
}

func samePoint(a, b point) bool {
	return a.key == b.key && a.state == b.state && shown(a.goal) == shown(b.goal) && shown(a.actual) == shown(b.actual) &&
		shown(a.projected) == shown(b.projected)
}

func checkRevenueSection(t *testing.T, alexSees person, query string, got summaryAnswer) {
	t.Helper()
	revenue, word := revenueWorded(t, alexSees, query)
	s, r := got.shape(), revenue.shape()
	if shown(s.cards.goal) != shown(r.cards.goal) || shown(s.cards.projected) != shown(r.cards.projected) ||
		shown(got.Revenue.Performance) != shown(whole(revenue.Cards.Performance.Value)) || got.Revenue.Variance != word {
		t.Errorf("Summary %q: revenue %s, %s %s; want Revenue's cards %s, %s %s", query, s.cards,
			shown(got.Revenue.Performance), got.Revenue.Variance, r.cards, shown(whole(revenue.Cards.Performance.Value)), word)
	}
	if !slices.EqualFunc(s.periods, r.periods, samePoint) {
		t.Errorf("Summary %q: trend %v, want Revenue's periods %v (goal, actual, projected)", query, s.periods, r.periods)
	}
	if st := got.stage("revenue"); st.figures().String() != s.cards.String() || shown(st.Performance) != shown(got.Revenue.Performance) {
		t.Errorf("Summary %q: the funnel's revenue %s, want the revenue section's %s", query, st.figures(), s.cards)
	}
}

func checkFunnelSection(t *testing.T, alexSees person, query string, got summaryAnswer) {
	t.Helper()
	for _, stage := range []string{"inq", "mql"} {
		funnel, word := funnelWorded(t, alexSees, joined("stage="+stage, query))
		st, want := got.stage(stage), figures{goal: whole(funnel.Cards.Goal.Value), projected: whole(funnel.Cards.Projected.Value)}
		if st.figures().String() != want.String() || shown(st.Performance) != shown(whole(funnel.Cards.Performance.Value)) ||
			st.Variance != word || st.PlansWithout != funnel.UncoveredCount {
			t.Errorf("Summary %q %s: %s, %s %s, %d plans without; want Funnel stages' %s, %s %s, %d", query, stage,
				st.figures(), shown(st.Performance), st.Variance, st.PlansWithout, want,
				shown(whole(funnel.Cards.Performance.Value)), word, funnel.UncoveredCount)
		}
	}
}

// TestWaveB_SummaryEqualsRevenueAndFunnel_048_SC002: same filters, same figures and words as Revenue and Funnel stages.
func TestWaveB_SummaryEqualsRevenueAndFunnel_048_SC002(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, query := range summaryQueries(t, alexSees) {
		got := summaryOf(t, alexSees, query)
		checkRevenueSection(t, alexSees, query, got)
		checkFunnelSection(t, alexSees, query, got)
	}
}

// rateText is 049's conversion rate in Summary's words, or nil without a previous stage.
func rateText(count, previous *int64) *string {
	if previous == nil {
		return nil
	}
	rate, ok := projection.ConversionRate(orZero(count), *previous)
	if !ok {
		return nil
	}
	text := strconv.FormatFloat(rate, 'f', 1, 64)
	return &text
}

func textOf(s *string) string {
	if s == nil {
		return "null"
	}
	return *s
}

func shownValue(p point) *int64 {
	if p.state == "planned" {
		return p.projected
	}
	return p.actual
}

// stagePair is Funnel stages' answer for INQ and for MQL under one query.
type stagePair struct{ inq, mql funnelAnswer }

func checkConversionCard(t *testing.T, label string, got summaryAnswer, funnel stagePair) {
	t.Helper()
	inq, mql := funnel.inq, funnel.mql
	var conversion *string
	if v := mql.Cards.Conversion.Value; v != nil {
		text := strconv.FormatFloat(*v, 'f', 1, 64)
		conversion = &text
	}
	goal := rateText(whole(mql.Cards.Goal.Value), whole(inq.Cards.Goal.Value))
	if len(got.Funnel.Conversions) != 1 || got.Funnel.Conversions[0].Stage != "mql" ||
		textOf(got.Funnel.Conversions[0].Rate) != textOf(conversion) || textOf(got.Funnel.Conversions[0].Goal) != textOf(goal) {
		t.Errorf("%s: conversions %+v, want MQL at Funnel stages' %s against %s (048-C7)", label, got.Funnel.Conversions,
			textOf(conversion), textOf(goal))
	}
}

func checkConversionTrend(t *testing.T, label string, got summaryAnswer, funnel stagePair) {
	t.Helper()
	inq, mql := funnel.inq.shape(), funnel.mql.shape()
	periods := got.Funnel.Trend.Periods
	if got.Funnel.Trend.Stage != "mql" || len(periods) != len(mql.periods) || len(inq.periods) != len(mql.periods) {
		t.Fatalf("%s: conversion trend %s over %d periods, want MQL over Funnel stages' %d", label,
			got.Funnel.Trend.Stage, len(periods), len(mql.periods))
	}
	for i, p := range periods {
		rate, goal := rateText(shownValue(mql.periods[i]), shownValue(inq.periods[i])), rateText(mql.periods[i].goal, inq.periods[i].goal)
		if p.Key != mql.periods[i].key || textOf(p.Rate) != textOf(rate) || textOf(p.Goal) != textOf(goal) {
			t.Errorf("%s %s: rate %s against %s, want %s against %s from Funnel stages", label, p.Key, textOf(p.Rate),
				textOf(p.Goal), textOf(rate), textOf(goal))
		}
	}
}

// TestWaveB_SummaryConversionAsFunnel_048_FR010: Summary's conversions are Funnel stages' counts through 049's one rate.
func TestWaveB_SummaryConversionAsFunnel_048_FR010(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	measureOnly := "plan=" + frameOf(t, alexSees, "summary").planID(measurePlan)
	for _, query := range []string{"", "period=quarter", "category=" + categoryNamed(t, alexSees, "Digital"), measureOnly} {
		got := summaryOf(t, alexSees, query)
		if again := summaryOf(t, alexSees, joined("stage=mql", query)); again.headline() != got.headline() ||
			again.Funnel.Trend.Stage != "mql" {
			t.Errorf("Summary %q with stage=mql: %q, trend %s; want the default's", query, again.headline(), again.Funnel.Trend.Stage)
		}
		funnel := stagePair{funnelOf(t, alexSees, joined("stage=inq", query)), funnelOf(t, alexSees, joined("stage=mql", query))}
		checkConversionCard(t, "Summary "+query, got, funnel)
		checkConversionTrend(t, "Summary "+query, got, funnel)
	}
}

func checkCategories(t *testing.T, got summaryAnswer, ids []string) {
	t.Helper()
	listed := []string{}
	for _, c := range got.Categories {
		listed = append(listed, c.ID)
	}
	if !slices.Equal(slices.Sorted(slices.Values(listed)), slices.Sorted(slices.Values(ids))) {
		t.Errorf("Summary's categories %v, want the seeded %v and Uncategorised (048-C8)", listed, ids)
	}
}

// TestWaveB_SummaryCategoriesLoseNothing_049_FR020: each category plus Uncategorised adds up to Summary's whole.
func TestWaveB_SummaryCategoriesLoseNothing_049_FR020(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	all, choices := summaryOf(t, alexSees, ""), append(categoryIDs(t, alexSees), uncategorised)
	checkCategories(t, all, choices)
	parts, stages := []shape{}, map[string][]figures{}
	for _, c := range choices {
		part := summaryOf(t, alexSees, "category="+c)
		if len(part.Revenue.Trend) != len(all.Revenue.Trend) {
			t.Fatalf("Summary of %s: %d trend periods, want %d", c, len(part.Revenue.Trend), len(all.Revenue.Trend))
		}
		parts = append(parts, part.shape())
		for _, stage := range []string{"inq", "mql"} {
			stages[stage] = append(stages[stage], part.stage(stage).figures())
		}
	}
	checkPartsAddUp(t, "Summary", all.shape(), parts)
	for stage, figs := range stages {
		if got, want := add(figs...), add(all.stage(stage).figures()); got.String() != want.String() {
			t.Errorf("Summary %s: the categories add to %s, all categories %s", stage, got, want)
		}
	}
}

type planGoals struct {
	Goals struct {
		Plan struct {
			INQ, MQL *int64
			Revenue  *amount
		} `json:"plan"`
	} `json:"goals"`
}

func percentOf(n, d int64) *int64 {
	if d <= 0 {
		return nil
	}
	p := (2*n*100 + d) / (2 * d)
	return &p
}

func checkCoverage(t *testing.T, alexSees person, query string, planned [3]int64) []coverage {
	t.Helper()
	got := summaryOf(t, alexSees, query)
	activities := []*int64{got.stage("inq").figures().goal, got.stage("mql").figures().goal, cents(got.Revenue.Goal)}
	for i, stage := range []string{"inq", "mql", "revenue"} {
		want := coverage{stage, percentOf(orZero(activities[i]), planned[i])}
		if c := got.Revenue.GoalCoverage; len(c) != 3 || c[i].Stage != stage || shown(c[i].Percent) != shown(want.Percent) {
			t.Errorf("Summary %q: goal coverage %+v, want %s at %s: %s ÷ %d (048-C2)", query, c, stage,
				shown(want.Percent), shown(activities[i]), planned[i])
		}
	}
	return got.Revenue.GoalCoverage
}

// TestWaveB_SummaryGoalCoverage_048_FR006: per stage, the activities' goals over the plans'; the Measure plan's INQ 84 %.
func TestWaveB_SummaryGoalCoverage_048_FR006(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	frame := frameOf(t, alexSees, "summary")
	var all [3]int64
	for _, id := range frame.planIDs() {
		g := decode[planGoals](t, alexSees.expect(t, get("/plans/"+id), http.StatusOK)).Goals.Plan
		planned := [3]int64{orZero(g.INQ), orZero(g.MQL), orZero(cents(g.Revenue))}
		for i := range all {
			all[i] += planned[i]
		}
		if c := checkCoverage(t, alexSees, "plan="+id, planned); id == frame.planID(measurePlan) && shown(c[0].Percent) != "84" {
			t.Errorf("%s: INQ coverage %s, want 84: 10,100 of 12,000 (Measure demo data)", measurePlan, shown(c[0].Percent))
		}
	}
	checkCoverage(t, alexSees, "", all)
}
