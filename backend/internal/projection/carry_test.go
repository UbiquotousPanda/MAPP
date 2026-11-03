package projection_test

import (
	"testing"

	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

// helixSecondHalf is the Measure demo's activity: 4,000 INQ from July to December, no velocity, so every
// month's 13-odd MQL converts to 0.65 of a deal.
func helixSecondHalf() projection.Inputs {
	in := inputs(4_000)
	in.Model.InqToMqlVelocityMonths, in.Model.MqlToDealVelocityMonths = 0, 0
	in.StartDate, in.EndDate = day("2026-07-01"), day("2026-12-31")
	return in
}

func TestProject_LaterStagesCarryTheRemainder_FR007_047C16(t *testing.T) {
	t.Parallel()

	got := projection.Project(helixSecondHalf())

	mql, _ := got.Find(projection.StageMQL)
	deals, _ := got.Find(projection.StageDeals)
	if mql.Total != 80 || deals.Total != 4 {
		t.Errorf("MQL %v (total %d), deals %v (total %d); want 80 and 4: 2 %% and 5 %% of 4,000 with the remainder carried",
			values(mql), mql.Total, values(deals), deals.Total)
	}
	if got.Total.Amount.String() != "40000.00" {
		t.Errorf("projected revenue = %s, want 40000.00 (4 deals × 10,000), not six rounded-up months", got.Total.Amount)
	}
	sum := money.Amount{}
	for _, m := range got.Revenue {
		sum = sum.Add(m.Value.Amount)
	}
	if sum != got.Total.Amount {
		t.Errorf("revenue months add to %s, want the total %s", sum, got.Total.Amount)
	}
}

// halfUp is the stage total by hand: whole units of value × rate, a half and above rounded up.
func halfUp(value, hundredths int64) int64 {
	return (value*hundredths + 5_000) / 10_000
}

// keptSum adds the earlier stage's months whose conversions still land inside the plan year.
func keptSum(months []projection.MonthFigure, shift int) int64 {
	sum := int64(0)
	for i := 0; i+shift < len(months); i++ {
		sum += months[i].Value
	}
	return sum
}

func FuzzProject_LaterStagesAddUpToTheRoundedExactTotal_047C16(f *testing.F) {
	f.Add(int64(4_000), int64(200), int64(500), 7, 0, 0)
	f.Add(int64(365_000), int64(200), int64(500), 1, 1, 2)
	f.Add(int64(7), int64(3_333), int64(9_999), 3, 5, 0)
	f.Add(int64(1_000_000_000), int64(10_000), int64(1), 12, 24, 24)

	f.Fuzz(func(t *testing.T, goal, toMQL, toDeal int64, startMonth, inqVelocity, mqlVelocity int) {
		in := inputs(goal % 1_000_000_001)
		in.Model.InqToMqlRate = money.PercentFromHundredths(boundedRate(toMQL))
		in.Model.MqlToDealRate = money.PercentFromHundredths(boundedRate(toDeal))
		in.Model.InqToMqlVelocityMonths = boundedVelocity(inqVelocity)
		in.Model.MqlToDealVelocityMonths = boundedVelocity(mqlVelocity)
		start := date.New(2026, timeMonth(boundedMonth(startMonth)), 1)
		in.StartDate = &start

		got := projection.Project(in)

		inq, _ := got.Find(projection.StageINQ)
		mql, _ := got.Find(projection.StageMQL)
		deals, _ := got.Find(projection.StageDeals)
		wantMQL := halfUp(keptSum(inq.Months, in.Model.InqToMqlVelocityMonths), boundedRate(toMQL))
		wantDeals := halfUp(keptSum(mql.Months, in.Model.MqlToDealVelocityMonths), boundedRate(toDeal))
		if mql.Total != wantMQL || deals.Total != wantDeals {
			t.Fatalf("MQL %d, deals %d; want %d and %d: each stage's months add to its exact total rounded half-up",
				mql.Total, deals.Total, wantMQL, wantDeals)
		}
	})
}

func boundedRate(n int64) int64 {
	if n < 0 {
		n = -n
	}
	return n % 10_001
}
