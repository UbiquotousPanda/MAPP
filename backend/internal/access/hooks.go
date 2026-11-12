package access

import (
	"context"
	"fmt"
	"slices"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/record"
)

// Other packages call these through adapters in internal/app, inside the caller's transaction.

// AssignNewPerson runs in the save that creates the person, so they keep version 1.
func (s *Service) AssignNewPerson(ctx context.Context, a actor.Actor, personID string) error {
	return s.tx.Write(ctx, func(ctx context.Context) error {
		w, err := s.read(ctx)
		if err != nil {
			return err
		}
		r, known := w.roles[w.rules.NewPersonRoleID]
		p, personKnown := w.people[personID]
		if !known || !personKnown || r.administrator() {
			return nil
		}
		id, err := s.ids.Next(ctx, ids.PrefixRoleAssignment)
		if err != nil {
			return err
		}
		assignment := Assignment{ID: id, PersonID: personID, RoleID: r.ID, ScopeType: authz.ScopeMyTeams,
			TeamIDs: []string{}, Meta: record.NewMeta(a, s.now())}
		if err := s.repo.PutAssignment(ctx, assignment); err != nil {
			return err
		}
		return s.logRolesEntry(ctx, a, p, noRoleText, w.rolesText(personID, []Assignment{assignment}))
	})
}

func (s *Service) CheckDeactivate(ctx context.Context, personID string) error {
	w, err := s.read(ctx)
	if err != nil {
		return err
	}
	return w.checkAdministratorLeft(personID, nil, false)
}

// An assignment left with no team stays and grants nothing; restoring the team does not put it back.
func (s *Service) TeamDeleted(ctx context.Context, a actor.Actor, teamID string) error {
	return s.tx.Write(ctx, func(ctx context.Context) error {
		assignments, err := s.repo.ListAssignments(ctx)
		if err != nil {
			return err
		}
		for _, assignment := range assignments {
			if !slices.Contains(assignment.TeamIDs, teamID) {
				continue
			}
			assignment.TeamIDs = slices.DeleteFunc(slices.Clone(assignment.TeamIDs), func(id string) bool { return id == teamID })
			assignment.Touch(a, s.now())
			if err := s.repo.PutAssignment(ctx, assignment); err != nil {
				return err
			}
		}
		return nil
	})
}

// Approval workflows refuse new approvers without the approve permission and flag approvers who lost it.
func (s *Service) CanApprove(ctx context.Context, personIDs []string) (map[string]bool, error) {
	w, err := s.read(ctx)
	if err != nil {
		return nil, err
	}
	can := map[string]bool{}
	for _, id := range personIDs {
		can[id] = w.grantsOf(id, w.assignmentsOf(id)).Has(authz.ApprovalsDecide)
	}
	return can, nil
}

// HoldersOf answers the owners a global budget may have and whom approvals notify.
func (s *Service) HoldersOf(ctx context.Context, p authz.Permission, all bool) ([]string, error) {
	w, err := s.read(ctx)
	if err != nil {
		return nil, err
	}
	var holders []string
	for _, ref := range w.personRefs(w.activeIDs()) {
		g := w.grantsOf(ref.ID, w.assignmentsOf(ref.ID))
		everywhere, _ := g.Teams(p)
		if g.Has(p) && (!all || everywhere) {
			holders = append(holders, ref.ID)
		}
	}
	return holders, nil
}

func (s *Service) RoleHolders(ctx context.Context, roleID string, plan authz.PlanFacts) ([]string, error) {
	w, err := s.read(ctx)
	if err != nil {
		return nil, err
	}
	holders := []string{}
	if _, known := w.roles[roleID]; !known {
		return holders, nil
	}
	for _, ref := range w.personRefs(w.activeIDs()) {
		mine := w.assignmentsOf(ref.ID)
		i := slices.IndexFunc(mine, func(a Assignment) bool { return a.RoleID == roleID })
		if i >= 0 && coversPlan(w, ref.ID, mine[i], plan) {
			holders = append(holders, ref.ID)
		}
	}
	return holders, nil
}

// coversPlan looks at the scope only, whatever the role's permissions.
func coversPlan(w world, personID string, a Assignment, plan authz.PlanFacts) bool {
	switch a.ScopeType {
	case authz.ScopeAll:
		return true
	case authz.ScopeMyTeams:
		return slices.ContainsFunc(plan.TeamIDs, func(id string) bool { return slices.Contains(w.people[personID].TeamIDs, id) })
	}
	return slices.ContainsFunc(plan.TeamIDs, func(id string) bool { return slices.Contains(a.TeamIDs, id) })
}

func (s *Service) ApprovingRoles(ctx context.Context) ([]RoleView, error) {
	w, err := s.read(ctx)
	if err != nil {
		return nil, err
	}
	views := []RoleView{}
	for _, r := range sortedRoles(w.roles) {
		if slices.Contains(r.permissions(), authz.ApprovalsDecide) {
			views = append(views, w.roleView(r))
		}
	}
	return views, nil
}

func (w world) activeIDs() []string {
	var list []string
	for id, p := range w.people {
		if p.Ref.Active {
			list = append(list, id)
		}
	}
	return list
}

func fmtOnlyAdministrator(name string) string {
	return fmt.Sprintf(msgOnlyAdministrator, name)
}
