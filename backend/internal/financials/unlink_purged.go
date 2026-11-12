package financials

import (
	"context"
	"fmt"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
)

const lineItemKind = "lineItem"

// UnlinkPurged is history's purge hook: a transaction linked to a line item deleted for good stops showing
// as "in the recycle bin" and becomes not linked, with the reason.
func (s *Service) UnlinkPurged(ctx context.Context, a actor.Actor, snapshots []history.Snapshot) error {
	var ids []string
	for _, snapshot := range snapshots {
		if snapshot.Kind == lineItemKind {
			ids = append(ids, snapshot.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	linked, err := s.repo.TransactionsOnLineItems(ctx, ids)
	if err != nil {
		return err
	}
	for i := range linked {
		t := &linked[i]
		before := t.LineItemID
		t.LineItemID, t.MatchedBy, t.ManualLink = "", "", nil
		t.NotLinkedReason = fmt.Sprintf(reasonLineItemPurged, before)
		if err = s.save(ctx, a, t, linkChange{verb: unlinkedVerb, before: before}); err != nil {
			return err
		}
	}
	return nil
}
