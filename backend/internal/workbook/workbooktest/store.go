// Package workbooktest is the in-memory fake of the plan imports store, for tests that build the service or
// the whole API without a database. Like the PostgreSQL store, it reads only imports of plans the scope sees.
package workbooktest

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"mapp/internal/plan"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/fake"
	"mapp/internal/workbook"
)

// Plans finds a plan's access facts; a nil Plans lets every plan be seen.
type Plans interface {
	Get(ctx context.Context, id string) (plan.Plan, bool, error)
}

type Store struct {
	imports *fake.Table[workbook.Import]
	plans   Plans
}

func NewStore(db *fake.DB, plans Plans) Store {
	return Store{imports: fake.TableOf(db, "plan_imports", func(i workbook.Import) string { return i.ID }), plans: plans}
}

func (s Store) AddImport(ctx context.Context, imp workbook.Import) error {
	if used, err := s.CheckUsed(ctx, imp.CheckID); err != nil || used {
		return errors.Join(err, fmt.Errorf("plan_imports: check_id %q is not unique", imp.CheckID))
	}
	return s.imports.Put(ctx, imp)
}

func (s Store) CheckUsed(_ context.Context, checkID string) (bool, error) {
	used, err := s.imports.Where(func(i workbook.Import) bool { return i.CheckID == checkID })
	return len(used) > 0, err
}

func (s Store) ListImports(ctx context.Context, scope authz.Scope, planID string, limit int) ([]workbook.Import, error) {
	all, err := s.imports.Where(func(i workbook.Import) bool { return i.PlanID == planID })
	if err != nil {
		return nil, err
	}
	seen := []workbook.Import{}
	for _, imp := range all {
		ok, err := s.sees(ctx, scope, imp.PlanID)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		imp.Problems = []workbook.Problem{}
		seen = append(seen, imp)
	}
	slices.Reverse(seen)
	return seen[:min(limit, len(seen))], nil
}

func (s Store) GetImport(ctx context.Context, scope authz.Scope, id string) (workbook.Import, bool, error) {
	imp, found, err := s.imports.Get(id)
	if err != nil || !found {
		return workbook.Import{}, false, err
	}
	ok, err := s.sees(ctx, scope, imp.PlanID)
	if err != nil || !ok {
		return workbook.Import{}, false, err
	}
	return imp, true, nil
}

func (s Store) MarkUndone(ctx context.Context, id string, u workbook.Undone) error {
	imp, found, err := s.imports.Get(id)
	if err != nil || !found {
		return err
	}
	imp.Records = slices.Clone(imp.Records)
	for _, k := range u.Kept {
		for i := range imp.Records {
			if imp.Records[i].RecordID == k.ID {
				imp.Records[i].KeptReason = k.Reason
			}
		}
	}
	imp.UndoneAt, imp.UndoneBy = &u.At, &u.By
	return s.imports.Put(ctx, imp)
}

func (s Store) sees(ctx context.Context, scope authz.Scope, planID string) (bool, error) {
	if s.plans == nil {
		return true, nil
	}
	p, found, err := s.plans.Get(ctx, planID)
	return found && scope.Sees(plan.AccessFacts(p)), err
}
