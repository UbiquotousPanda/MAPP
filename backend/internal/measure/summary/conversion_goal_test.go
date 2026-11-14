package summary

import (
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

func withRate(s revenue.ActivitySeries, hundredths int64) revenue.ActivitySeries {
	rate := money.PercentFromHundredths(hundredths)
	s.InqToMqlRate = &rate
	return s
}

// The fixture's goals give 20 MQL of 100 INQ, 20.0 %; the model's rate is 18.00 %, so the goal must say 18.0.
func TestConversionGoal_IsTheModelsRate_048_FR010(t *testing.T) {
	t.Parallel()
	f := newFakes()
	f.series = []revenue.ActivitySeries{withRate(projected("A-1", planOne), 1800), unprojected("A-2", planTwo)}

	got := report(t, f, measure.Filter{}).Funnel

	if len(got.Conversions) != 1 || got.Conversions[0].Goal == nil || *got.Conversions[0].Goal != "18.0" {
		t.Fatalf("conversions = %+v, want the model's 18.0 as the goal", got.Conversions)
	}
	if v := got.Conversions[0].Variance; v == nil || *v != revenue.AbovePlan {
		t.Errorf("variance = %v, want %s: 20.4 against 18.0", v, revenue.AbovePlan)
	}
	for _, p := range got.Trend.Periods {
		if p.Goal == nil || *p.Goal != "18.0" {
			t.Errorf("trend %s goal = %v, want the model's 18.0", p.Key, p.Goal)
		}
	}
}

// Two models: 18 % on 100 INQ and 25 % on 300 INQ weigh to 23.25, shown 23.3; each month's goals are 8 and 8, so
// the trend weighs the two rates equally, 21.5.
func TestConversionGoal_WeighsEachModelsRateByItsINQGoal_048_FR010(t *testing.T) {
	t.Parallel()
	f := newFakes()
	heavy := withRate(projected("A-3", planTwo), 2500)
	heavy.Goal.INQ = ptr[int64](300)
	f.series = []revenue.ActivitySeries{withRate(projected("A-1", planOne), 1800), heavy}

	got := report(t, f, measure.Filter{}).Funnel

	if c := got.Conversions[0]; c.Goal == nil || *c.Goal != "23.3" || c.Variance == nil || *c.Variance != revenue.BelowPlan {
		t.Errorf("conversion = %+v, want the goal 23.3 and %s for 20.4", c, revenue.BelowPlan)
	}
	for _, p := range got.Trend.Periods {
		if p.Goal == nil || *p.Goal != "21.5" {
			t.Errorf("trend %s goal = %v, want 21.5", p.Key, p.Goal)
		}
	}
}

func TestConversionGoal_NoneWithoutAnINQGoal_048_FR010(t *testing.T) {
	t.Parallel()
	f := newFakes()
	none := withRate(projected("A-1", planOne), 1800)
	none.Goal.INQ = ptr[int64](0)
	for i := range none.Months {
		none.Months[i].INQ.Goal = nil
	}
	f.series = []revenue.ActivitySeries{none}

	got := report(t, f, measure.Filter{}).Funnel

	if c := got.Conversions[0]; c.Goal != nil || c.Variance == nil || *c.Variance != revenue.NoGoal {
		t.Errorf("conversion = %+v, want no goal and %s without an INQ goal", c, revenue.NoGoal)
	}
}
