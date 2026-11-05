package approval

import "context"

// refuseUnready has feature 032 run a purchase request's checks again before its approval; an activity has none (D-404).
func (s *Service) refuseUnready(ctx context.Context, dg deciding) error {
	if !dg.sub.Kind.isPurchaseRequest() {
		return nil
	}
	return s.purchases.CheckToApprove(ctx, dg.sub.ID, dg.sub.Kind)
}
