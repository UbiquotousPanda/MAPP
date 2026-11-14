package projection

import (
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// Project runs the model forward from the goal stage only, never past the plan year.
func Project(in Inputs) Projection {
	start, end, covered := window(in)
	out := Projection{Stamp: Stamp{ModelName: in.Model.Name, ModelChangedAt: in.Model.ModelChangedAt}}
	if !hasGoal(in.Goals) {
		return out
	}
	out.Present = true
	if !covered {
		return out
	}
	if in.Goals.SetLaterStagesMyself {
		return typed(out, in, start, end)
	}
	return calculated(out, in, start, end)
}

func hasGoal(g Goals) bool {
	if g.SetLaterStagesMyself {
		return IsGoal(g.INQ) || IsGoal(g.MQL) || IsRevenueGoal(g.Revenue)
	}
	return IsGoal(g.INQ)
}

// IsGoal says whether a stage has a goal: zero is no goal, as the variance has it, never a target of nothing.
func IsGoal(goal *int64) bool {
	return goal != nil && *goal > 0
}

func IsRevenueGoal(goal *money.Money) bool {
	return goal != nil && goal.Amount.Sign() > 0
}

// typed phases each stage's own goal: the override means the rates and velocity change nothing.
func typed(out Projection, in Inputs, start, end date.Date) Projection {
	for _, stage := range []struct {
		name string
		goal *int64
	}{{StageINQ, in.Goals.INQ}, {StageMQL, in.Goals.MQL}} {
		if IsGoal(stage.goal) {
			out.Stages = append(out.Stages, seriesOf(stage.name, phase(*stage.goal, start, end)))
		}
	}
	if IsRevenueGoal(in.Goals.Revenue) {
		out.Revenue, out.Total = phaseMoney(*in.Goals.Revenue, start, end)
	}
	return out
}

func calculated(out Projection, in Inputs, start, end date.Date) Projection {
	inq := phase(*in.Goals.INQ, start, end)
	mql := shift(atRate(inq, in.Model.InqToMqlRate), in.Model.InqToMqlVelocityMonths)
	deals := shift(atRate(mql, in.Model.MqlToDealRate), in.Model.MqlToDealVelocityMonths)
	out.Stages = []Series{seriesOf(StageINQ, inq), seriesOf(StageMQL, mql), seriesOf(StageDeals, deals)}
	out.Revenue, out.Total = revenueOf(deals, in.Model.AverageDealSize)
	return out
}

// atRate carries each month's remainder into the next, as phase does, so the months add up to the rounded total.
func atRate(months []MonthFigure, rate money.Percent) []MonthFigure {
	converted := make([]MonthFigure, len(months))
	var running, placed int64
	for i, m := range months {
		running += m.Value
		share := rate.OfWhole(running)
		converted[i] = MonthFigure{Month: m.Month, Value: share - placed}
		placed = share
	}
	return converted
}

// shift drops what lands past the plan year: bunching it into December would invent a month.
func shift(months []MonthFigure, by int) []MonthFigure {
	shifted := make([]MonthFigure, len(months))
	for i, m := range months {
		shifted[i] = MonthFigure{Month: m.Month}
	}
	for i, m := range months {
		if landing := i + by; landing < len(shifted) {
			shifted[landing].Value = m.Value
		}
	}
	return shifted
}

func seriesOf(stage string, months []MonthFigure) Series {
	total := int64(0)
	for _, m := range months {
		total += m.Value
	}
	return Series{Stage: stage, Months: months, Total: total}
}

// revenueOf answers no series for a total past the money range; no month exceeds the total, so none can.
func revenueOf(deals []MonthFigure, size money.Money) ([]MoneyFigure, money.Money) {
	total, err := size.Amount.MulInt(seriesOf(StageDeals, deals).Total)
	if err != nil {
		return nil, money.Money{Currency: size.Currency}
	}
	revenue := make([]MoneyFigure, len(deals))
	for i, m := range deals {
		amount, _ := size.Amount.MulInt(m.Value)
		revenue[i] = MoneyFigure{Month: m.Month, Value: money.Money{Amount: amount, Currency: size.Currency}}
	}
	return revenue, money.Money{Amount: total, Currency: size.Currency}
}

func phaseMoney(goal money.Money, start, end date.Date) ([]MoneyFigure, money.Money) {
	cents := phase(goal.Amount.Cents(), start, end)
	revenue := make([]MoneyFigure, len(cents))
	for i, m := range cents {
		revenue[i] = MoneyFigure{Month: m.Month,
			Value: money.Money{Amount: money.FromCents(m.Value), Currency: goal.Currency}}
	}
	return revenue, goal
}
