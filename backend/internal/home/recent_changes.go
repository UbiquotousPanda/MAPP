package home

import (
	"context"

	"mapp/internal/platform/actor"
)

// maxRecentChanges is how many entries Recent changes shows (FR-015).
const maxRecentChanges = 10

// RecentChanges returns Recent changes for the scope (FR-015, FR-016): the 10 newest activity-log entries
// about plans, campaigns, initiatives, activities and line items, for My teams only those of the plans in
// scope and whatever is or was inside them, for Everything those of every plan, and how many match. A
// deleted record keeps its entries, with where the record is now (in the recycle bin). For My teams without
// team plans the page is empty and the log is not read.
func (s *Service) RecentChanges(ctx context.Context, a actor.Actor, scopeText, forText string) (RecentChangesPage, error) {
	f, forErr := ParseFor(forText)
	if forErr != nil {
		return RecentChangesPage{}, forErr
	}
	scope, scopeErr := ParseScope(scopeText)
	if scopeErr != nil {
		return RecentChangesPage{}, scopeErr
	}
	page := RecentChangesPage{Items: []any{}}
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		q, found, err := s.recentChangesQuery(ctx, a, scope, f)
		if err != nil || !found {
			return err
		}
		log, err := s.src.RecentChanges(ctx, a, q)
		if err != nil {
			return err
		}
		page.Total = log.Total
		if log.Items != nil {
			page.Items = log.Items
		}
		return nil
	})
	if err != nil {
		return RecentChangesPage{}, err
	}
	return page, nil
}

// recentChangesQuery reports false when My teams has no team plans, so the log is not read.
func (s *Service) recentChangesQuery(ctx context.Context, a actor.Actor, scope Scope, f For) (RecentChangesQuery, bool, error) {
	q := RecentChangesQuery{Limit: maxRecentChanges}
	if scope == ScopeMyTeams {
		ps, err := s.planScope(ctx, a)
		if err != nil {
			return q, false, err
		}
		for _, p := range ps.in(scope) {
			q.PlanIDs = append(q.PlanIDs, p.ID)
		}
		if len(q.PlanIDs) == 0 {
			return q, false, nil
		}
	}
	if f == ForTeam {
		people, err := s.peopleFor(ctx, a, f)
		if err != nil {
			return q, false, err
		}
		q.ActorIDs = people
	}
	return q, true, nil
}
