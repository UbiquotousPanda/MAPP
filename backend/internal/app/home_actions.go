package app

import (
	"context"
	"errors"

	"mapp/internal/approval"
	"mapp/internal/home"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/purchaserequest"
)

const maxDeclinedRequests = 200

// actionSources reads Home's action items through the services whose pages they link to, so each item is
// what that page shows.
func (h homeReaders) actionSources(prs *purchaserequest.Service, items swbsLineItems) home.ActionSources {
	return home.ActionSources{
		ApprovalsWaiting: h.approvalsWaiting,
		PurchaseRequestsToFix: func(ctx context.Context, a actor.Actor) ([]home.ActionItem, error) {
			return declinedRequests(ctx, a, prs)
		},
		LineItemsWaitingForSwbs: func(ctx context.Context, _ actor.Actor) ([]home.ActionItem, error) { return readyForSwbs(ctx, items) },
		Activities:              h.sources().Activities,
	}
}

func (h homeReaders) approvalsWaiting(ctx context.Context, a actor.Actor) ([]home.ActionItem, error) {
	rows, err := h.approvals.Inbox(ctx, a, approval.TabWaiting)
	if err != nil {
		return nil, err
	}
	list := make([]home.ActionItem, 0, len(rows))
	for _, row := range rows {
		recordType := kindPurchaseRequest
		if row.Subject.Kind == approval.KindActivity {
			recordType = string(approval.KindActivity)
		}
		item := home.ActionItem{Record: errs.RecordRef{Type: recordType, ID: row.Subject.ID, Name: row.Subject.Name},
			Overdue: row.Overdue, Since: row.WaitingSince}
		if item.Since == nil {
			item.Since = &row.SubmittedAt
		}
		if len(row.Path) > 0 {
			item.Plan = &row.Path[0]
		}
		list = append(list, item)
	}
	return list, nil
}

// declinedRequests are a's Declined purchase requests, to fix and submit again; none while purchase requests
// are switched off.
func declinedRequests(ctx context.Context, a actor.Actor, prs *purchaserequest.Service) ([]home.ActionItem, error) {
	page, err := prs.List(ctx, a, purchaserequest.ListQuery{Statuses: []purchaserequest.Status{purchaserequest.StatusDeclined},
		OwnerIDs: []string{a.ID}, Sort: "-created", Page: 1, PageSize: maxDeclinedRequests})
	var refused *errs.Error
	if errors.As(err, &refused) && refused.Code == errs.CodeNotAllowed {
		return []home.ActionItem{}, nil
	}
	if err != nil {
		return nil, err
	}
	list := make([]home.ActionItem, 0, len(page.Items))
	for _, row := range page.Items {
		plan := row.Plan
		list = append(list, home.ActionItem{Record: errs.RecordRef{Type: kindPurchaseRequest, ID: row.ID, Name: row.Name}, Plan: &plan})
	}
	return list, nil
}

// readyForSwbs are the line items ready to send for an SWBS code, for a person who may send SWBS requests.
func readyForSwbs(ctx context.Context, items swbsLineItems) ([]home.ActionItem, error) {
	list := []home.ActionItem{}
	if !authz.Has(ctx, authz.FinanceImport) {
		return list, nil
	}
	candidates, err := items.Candidates(ctx, authz.PermissionScopeOf(ctx, authz.FinanceImport), nil)
	if err != nil {
		return nil, err
	}
	for _, c := range candidates {
		if c.Ready {
			list = append(list, home.ActionItem{Record: errs.RecordRef{Type: lineItemKind, ID: c.LineItemID, Name: c.LineItemName}})
		}
	}
	return list, nil
}
