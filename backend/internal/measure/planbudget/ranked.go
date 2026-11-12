package planbudget

import (
	"slices"

	"mapp/internal/measure/ranking"
	"mapp/internal/platform/money"
)

func (r *records) ranked(level string, q RankedQuery) Ranked {
	return ranking.Build(r.Index, level, q, rankedFigures{r})
}

// rankedFigures is what the shared ranked list adds up, splits, shows and sorts by for this report.
type rankedFigures struct{ r *records }

func (f rankedFigures) Of(id string) sums {
	s := f.r.sumsOf(id)
	s.id = id
	return s
}

func (rankedFigures) Part(s sums, share money.Percent) sums {
	return s.times(share)
}

func (rankedFigures) Plus(a, b sums) sums {
	return a.plus(b)
}

// Shown counts a total's budget once per branch, as the cards do; % split parts keep their own budgets.
func (f rankedFigures) Shown(s sums) Figures {
	if len(s.kept) > 0 && !s.split {
		s.budget, s.finBudget = f.r.budgetOf(f.r.coveredBy(s.kept))
	}
	return f.r.figures(s)
}

// coveredBy is the kept entries with their ancestors and what is below them; the whole level is everything in view.
func (r *records) coveredBy(kept []string) func(string) bool {
	if len(kept) == len(r.LevelIDs(string(r.Node(kept[0]).Level))) {
		return r.InView
	}
	lineage, entries := map[string]bool{}, map[string]bool{}
	for _, id := range kept {
		entries[id] = true
		for n := id; n != ""; n = r.Node(n).ParentID {
			lineage[n] = true
		}
	}
	return func(id string) bool {
		if !r.InView(id) {
			return false
		}
		if lineage[id] {
			return true
		}
		for n := r.Node(id).ParentID; n != ""; n = r.Node(n).ParentID {
			if entries[n] {
				return true
			}
		}
		return false
	}
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
		budget: scaled(s.budget), finBudget: scaled(s.finBudget), finPlanned: scale(s.finPlanned), id: s.id,
		kept: s.kept, split: true}
}

func (s sums) plus(t sums) sums {
	return sums{planned: s.planned.Add(t.planned), committed: s.committed.Add(t.committed),
		actual: s.actual.Add(t.actual), financed: s.financed || t.financed, budget: addAmount(s.budget, t.budget),
		finBudget: addAmount(s.finBudget, t.finBudget), finPlanned: s.finPlanned.Add(t.finPlanned),
		kept: append(s.entries(), t.entries()...), split: s.split || t.split}
}

func (s sums) entries() []string {
	if s.id != "" {
		return []string{s.id}
	}
	return slices.Clone(s.kept)
}
