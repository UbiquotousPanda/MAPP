package lineitem

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
)

// Section returns the activity's line items with their USD amounts at today's rates, spreads and SWBS status,
// the unassigned planned cost and the spread grid by month and by quarter, in a's display currency (D-213).
func (s *Service) Section(ctx context.Context, a actor.Actor, activityID string) (Section, error) {
	var section Section
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		f, err := s.facts(ctx, activityID)
		if err != nil {
			return err
		}
		items, err := s.repo.ListByActivity(ctx, activityID)
		if err != nil {
			return err
		}
		views, err := s.views(ctx, f, items)
		if err != nil {
			return err
		}
		d, err := s.displayOf(ctx, a)
		if err != nil {
			return err
		}
		grid := Grid(f, views)
		section = Section{
			Activity: activityView(f), Items: d.views(views), Balance: d.balance(balanceOf(f, views)), Grid: d.grid(grid),
			Quarters: d.grid(Quarterly(grid)),
			Access:   authz.LineItemAccessOf(ctx, f.Access),
		}
		return nil
	})
	if err != nil {
		return Section{}, err
	}
	return section, nil
}
