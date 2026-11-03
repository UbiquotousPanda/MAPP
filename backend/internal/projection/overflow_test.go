package projection_test

import (
	"math"
	"testing"

	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

func TestProject_AHugeGoalPhasesExactlyWithoutOverflow_FR006_SC005(t *testing.T) {
	t.Parallel()
	in := inputs(math.MaxInt64)
	in.StartDate, in.EndDate = day("2026-01-01"), day("2026-12-31")

	inq, _ := projection.Project(in).Find(projection.StageINQ)

	for _, m := range inq.Months {
		if m.Value <= 0 {
			t.Fatalf("INQ %s = %d, want every month its share of the goal, never a wrapped negative", m.Month, m.Value)
		}
	}
	if inq.Total != math.MaxInt64 {
		t.Errorf("INQ totals %d, want the whole goal %d", inq.Total, int64(math.MaxInt64))
	}
}

func TestProject_RevenueBeyondTheMoneyRangeIsNoFigure_FR007_FR013(t *testing.T) {
	t.Parallel()
	in := inputs(1_000_000_000_000)
	in.StartDate, in.EndDate = day("2026-01-01"), day("2026-12-31")
	in.Model.InqToMqlRate, in.Model.MqlToDealRate = money.Hundred, money.Hundred
	in.Model.InqToMqlVelocityMonths, in.Model.MqlToDealVelocityMonths = 0, 0
	in.Model.AverageDealSize = money.USD(money.FromCents(10_000_000_000))

	got := projection.Project(in)

	if len(got.Revenue) != 0 || !got.Total.Amount.IsZero() {
		t.Errorf("revenue = %d months, total %s; want no revenue series: a product past the money range is no figure, never 0 or a wrapped amount",
			len(got.Revenue), got.Total.Amount)
	}
	if deals, found := got.Find(projection.StageDeals); !found || deals.Total != 1_000_000_000_000 {
		t.Errorf("deals = %+v, want the volumes still projected", deals)
	}
}

func TestProject_AHugeTypedRevenueGoalPhasesExactly_FR009(t *testing.T) {
	t.Parallel()
	in := inputs(1)
	goal := money.USD(money.FromCents(99_999_999_999_999_999))
	in.Goals = projection.Goals{Revenue: &goal, SetLaterStagesMyself: true}

	got := projection.Project(in)

	sum := money.Amount{}
	for _, m := range got.Revenue {
		if m.Value.Amount.Sign() < 0 {
			t.Fatalf("revenue %s = %s, want no wrapped negative month", m.Month, m.Value.Amount)
		}
		sum = sum.Add(m.Value.Amount)
	}
	if sum != goal.Amount {
		t.Errorf("revenue months add to %s, want the typed goal %s", sum, goal.Amount)
	}
}
