package summary

import (
	"strconv"
	"time"

	"mapp/internal/measure/revenue"
)

const monthsPerQuarter = 3

// period is one point of a trend: a month, or a quarter summed from its months.
type period struct {
	key, label, state       string
	actual, projected, goal int64
}

func periodsOf(months []monthTotal, quarterly bool) []period {
	out := make([]period, 0, len(months))
	for i, m := range months {
		p := period{key: m.key, label: monthLabel(m.key), state: stateOf(m.state), actual: m.actual,
			projected: m.projected, goal: m.goal}
		if !quarterly {
			out = append(out, p)
			continue
		}
		if i%monthsPerQuarter == 0 {
			out = append(out, quarterOf(m.key, i))
		}
		out[len(out)-1] = out[len(out)-1].with(p)
	}
	return out
}

func quarterOf(monthKey string, index int) period {
	year := ""
	if len(monthKey) >= 4 {
		year = monthKey[:4]
	}
	q := "Q" + strconv.Itoa(index/monthsPerQuarter+1)
	return period{key: year + "-" + q, label: q + " " + year, state: PeriodActual}
}

// with adds a month to its quarter; one month in progress or ahead decides the quarter's state.
func (p period) with(m period) period {
	p.actual += m.actual
	p.projected += m.projected
	p.goal += m.goal
	if m.state == PeriodInProgress || (m.state == PeriodProjected && p.state == PeriodActual) {
		p.state = m.state
	}
	return p
}

func stateOf(monthState string) string {
	switch monthState {
	case revenue.StatePast:
		return PeriodActual
	case revenue.StateInProgress:
		return PeriodInProgress
	default:
		return PeriodProjected
	}
}

func monthLabel(key string) string {
	t, err := time.Parse("2006-01", key)
	if err != nil {
		return key
	}
	return t.Format("Jan 2006")
}

// shownValue is what a period counts toward a rate: its actual until today, its projection after.
func (p period) shownValue() int64 {
	if p.state == PeriodProjected {
		return p.projected
	}
	return p.actual
}
