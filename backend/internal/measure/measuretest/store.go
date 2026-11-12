// Package measuretest is the in-memory fake of the measure store: the saved report views.
package measuretest

import (
	"context"
	"fmt"
	"slices"

	"mapp/internal/measure"
	"mapp/internal/platform/fake"
)

type Store struct {
	views *fake.Table[measure.StoredView]
}

func NewStore(db *fake.DB) Store {
	return Store{views: fake.TableOf(db, "report_views", func(v measure.StoredView) string { return v.ID })}
}

func (s Store) ListViews(_ context.Context, personID, report string) ([]measure.StoredView, error) {
	return s.views.Where(func(v measure.StoredView) bool { return v.PersonID == personID && v.Report == report })
}

func (s Store) GetView(_ context.Context, id string) (measure.StoredView, bool, error) {
	return s.views.Get(id)
}

// PutView refuses a report outside the five, as the report_views CHECK does.
func (s Store) PutView(ctx context.Context, v measure.StoredView) error {
	reports := []string{measure.KeyPerformance, measure.KeyBudget, measure.KeyPurchasing, measure.KeyApprovals,
		measure.KeyPlanData}
	if !slices.Contains(reports, v.Report) {
		return fmt.Errorf("measuretest: report_views_report_check refuses %q", v.Report)
	}
	return s.views.Put(ctx, v)
}

func (s Store) DeleteView(ctx context.Context, id string) error {
	return s.views.Delete(ctx, id)
}
