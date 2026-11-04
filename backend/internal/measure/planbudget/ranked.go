package planbudget

import (
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/money"
)

func (r *records) ranked(level string, q RankedQuery) Ranked {
	return ranking.Build(r.Index, level, q, rankedFigures{r})
}

// rankedFigures is what the shared ranked list adds up, splits, shows and sorts by for this report.
type rankedFigures struct{ r *records }

func (f rankedFigures) Of(id string) sums {
	return f.r.sumsOf(id)
}

func (rankedFigures) Part(s sums, share money.Percent) sums {
	return s.times(share)
}

func (rankedFigures) Plus(a, b sums) sums {
	return a.plus(b)
}

func (f rankedFigures) Shown(s sums) Figures {
	return f.r.figures(s)
}

func (rankedFigures) Key(f Figures, sort string) (int64, bool) {
	m := map[string]*money.Money{SortBudget: f.Budget, SortPlanned: f.Planned, SortCommitted: f.Committed,
		SortActual: f.Actual, SortLeftToPlan: f.LeftToPlan, SortUnspent: f.Unspent}[sort]
	if m == nil {
		return 0, false
	}
	return m.Amount.Cents(), true
}

// times is the part of the sums a % split gives, each amount rounded half up to the cent.
func (s sums) times(part money.Percent) sums {
	scale := func(a money.Amount) money.Amount { return money.FromCents(part.OfWhole(a.Cents())) }
	scaled := func(a *money.Amount) *money.Amount {
		if a == nil {
			return nil
		}
		part := scale(*a)
		return &part
	}
	return sums{planned: scale(s.planned), committed: scale(s.committed), actual: scale(s.actual), financed: s.financed,
		budget: scaled(s.budget), finBudget: scaled(s.finBudget), finPlanned: scale(s.finPlanned)}
}

func (s sums) plus(t sums) sums {
	return sums{planned: s.planned.Add(t.planned), committed: s.committed.Add(t.committed),
		actual: s.actual.Add(t.actual), financed: s.financed || t.financed, budget: addAmount(s.budget, t.budget),
		finBudget: addAmount(s.finBudget, t.finBudget), finPlanned: s.finPlanned.Add(t.finPlanned)}
}
