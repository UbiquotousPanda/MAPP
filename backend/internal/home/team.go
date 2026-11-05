package home

import (
	"cmp"
	"context"
	"slices"
	"strings"

	"mapp/internal/platform/actor"
)

// The sources read by owner or approver, not by what a may see, so My team keeps only what a may see.

func (s *Service) peopleFor(ctx context.Context, a actor.Actor, f For) ([]string, error) {
	if f != ForTeam {
		return []string{a.ID}, nil
	}
	ids, err := s.src.TeamMemberIDs(ctx, a)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(ids, a.ID) {
		ids = append(ids, a.ID)
	}
	return ids, nil
}

func (s *Service) activitiesFor(ctx context.Context, a actor.Actor, f For) ([]Activity, error) {
	if f != ForTeam {
		return s.src.Activities(ctx, a, a.ID)
	}
	all, err := eachPerson(ctx, s, a, func(id string) ([]Activity, error) { return s.src.Activities(ctx, a, id) })
	if err != nil {
		return nil, err
	}
	seen, err := s.visible(ctx, a, idsOf(all, func(act Activity) string { return act.ID }))
	if err != nil {
		return nil, err
	}
	return slices.DeleteFunc(all, func(act Activity) bool { return !seen[act.ID] }), nil
}

// Campaigns and initiatives are seen through their plan: visible is the plans a may see.
func (s *Service) containersFor(ctx context.Context, a actor.Actor, f For, visible []Plan) ([]Container, error) {
	if f != ForTeam {
		return s.src.Containers(ctx, a, a.ID)
	}
	all, err := eachPerson(ctx, s, a, func(id string) ([]Container, error) { return s.src.Containers(ctx, a, id) })
	if err != nil {
		return nil, err
	}
	inPlan := map[string]bool{}
	for _, p := range visible {
		inPlan[p.ID] = true
	}
	return slices.DeleteFunc(all, func(c Container) bool { return !inPlan[c.Plan.ID] }), nil
}

func (s *Service) waitingFor(ctx context.Context, a actor.Actor, f For) ([]Waiting, error) {
	if f != ForTeam {
		return s.src.WaitingForMe(ctx, a)
	}
	rows, err := eachPerson(ctx, s, a, func(id string) ([]Waiting, error) { return s.src.WaitingFor(ctx, a, id) })
	if err != nil {
		return nil, err
	}
	all := earliestWaits(rows)
	seen, err := s.visible(ctx, a, idsOf(all, func(w Waiting) string { return w.ActivityID }))
	if err != nil {
		return nil, err
	}
	return slices.DeleteFunc(all, func(w Waiting) bool { return !seen[w.ActivityID] }), nil
}

// earliestWaits keeps an activity waiting on several members once, with its earliest wait, oldest first.
func earliestWaits(rows []Waiting) []Waiting {
	byActivity := map[string]Waiting{}
	for _, w := range rows {
		if prev, found := byActivity[w.ActivityID]; !found || w.WaitingSince.Before(prev.WaitingSince) {
			byActivity[w.ActivityID] = w
		}
	}
	all := make([]Waiting, 0, len(byActivity))
	for _, w := range byActivity {
		all = append(all, w)
	}
	slices.SortFunc(all, func(x, y Waiting) int {
		return cmp.Or(x.WaitingSince.Compare(y.WaitingSince), strings.Compare(x.ActivityID, y.ActivityID))
	})
	return all
}

func (s *Service) visible(ctx context.Context, a actor.Actor, activityIDs []string) (map[string]bool, error) {
	if len(activityIDs) == 0 {
		return map[string]bool{}, nil
	}
	return s.src.SeesActivities(ctx, a, activityIDs)
}

func eachPerson[T any](ctx context.Context, s *Service, a actor.Actor, read func(personID string) ([]T, error)) ([]T, error) {
	people, err := s.peopleFor(ctx, a, ForTeam)
	if err != nil {
		return nil, err
	}
	var all []T
	for _, id := range people {
		list, readErr := read(id)
		if readErr != nil {
			return nil, readErr
		}
		all = append(all, list...)
	}
	return all, nil
}

func idsOf[T any](list []T, id func(T) string) []string {
	ids := make([]string, 0, len(list))
	for _, item := range list {
		ids = append(ids, id(item))
	}
	return ids
}
