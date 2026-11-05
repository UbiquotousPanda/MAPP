package postinvestment

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

// visible answers a review whose activity the person doesn't see exactly like a missing one.
func (s *Service) visible(ctx context.Context, id string) (Review, Activity, error) {
	gone := errs.NotFound(authz.NotFoundMessage(reviewNoun))
	r, found, err := s.repo.Get(ctx, id)
	if err != nil {
		return Review{}, Activity{}, err
	}
	if !found {
		return Review{}, Activity{}, gone
	}
	activities, err := s.activities.InScope(ctx, authz.ScopeOf(ctx), []string{r.ActivityID})
	if err != nil {
		return Review{}, Activity{}, err
	}
	act, seen := activities[r.ActivityID]
	if !seen {
		return Review{}, Activity{}, gone
	}
	return r, act, nil
}

// editable is a visible Draft the person may edit in its activity's plan and whose finance they see.
func (s *Service) editable(ctx context.Context, a actor.Actor, id string) (Review, Activity, error) {
	r, act, err := s.visible(ctx, id)
	if err != nil {
		return Review{}, Activity{}, err
	}
	if err = authz.RequireIn(ctx, authz.ActivitiesEdit, act.Facts.Plan); err != nil {
		return Review{}, Activity{}, err
	}
	if r.Status == StatusSubmitted {
		return Review{}, Activity{}, errs.Forbidden(msgSubmitted)
	}
	live, err := s.activities.Live(ctx, a, act.ID)
	if err != nil {
		return Review{}, Activity{}, err
	}
	if live.Figures == nil {
		return Review{}, Activity{}, errs.Forbidden(msgFinanceHidden)
	}
	return r, act, nil
}

func (s *Service) visibleViews(ctx context.Context, a actor.Actor, activityID string) ([]View, error) {
	reviews, err := s.repo.List(ctx, activityID)
	if err != nil || len(reviews) == 0 {
		return []View{}, err
	}
	activityIDs := make([]string, 0, len(reviews))
	for _, r := range reviews {
		activityIDs = append(activityIDs, r.ActivityID)
	}
	activities, err := s.activities.InScope(ctx, authz.ScopeOf(ctx), activityIDs)
	if err != nil {
		return nil, err
	}
	views := []View{}
	for _, r := range reviews {
		act, seen := activities[r.ActivityID]
		if !seen {
			continue
		}
		v, err := s.view(ctx, a, r, act)
		if err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	return views, nil
}

func (s *Service) view(ctx context.Context, a actor.Actor, r Review, act Activity) (View, error) {
	live, err := s.activities.Live(ctx, a, r.ActivityID)
	if err != nil {
		return View{}, err
	}
	hidden := live.Figures == nil
	v := View{
		ID: r.ID, Activity: ActivityRef{ID: act.ID, Name: act.Name}, Path: act.Path, Status: r.Status,
		BusinessCase: r.BusinessCase, AmountSpent: moneyOf(r.AmountSpent, r.Currency), Margin: moneyOf(r.Margin, r.Currency),
		ROI: ROI(r.AmountSpent, r.Margin), Remarks: r.Remarks, Figures: live.Figures, SubmittedAt: r.SubmittedAt,
		SubmittedBy: r.SubmittedBy, Access: accessOf(ctx, r, act, hidden), Meta: r.Meta,
	}
	if hidden { // the amount spent starts as the activity's Paid figure, so it is finance data
		v.AmountSpent, v.ROI = nil, nil
	}
	return v, nil
}

func accessOf(ctx context.Context, r Review, act Activity, financeHidden bool) Access {
	edit := authz.Available(ctx, authz.ActivitiesEdit, act.Facts.Plan)
	switch {
	case r.Status == StatusSubmitted:
		edit = authz.Unavailable(msgSubmitted)
	case financeHidden && edit.Available:
		edit = authz.Unavailable(msgFinanceHidden)
	}
	return Access{
		Edit: edit, Submit: edit, Delete: authz.Available(ctx, authz.ActivitiesDelete, act.Facts.Plan),
		Export: authz.AvailableAnywhere(ctx, authz.DataExport),
	}
}

func moneyOf(a *money.Amount, currency string) *money.Money {
	if a == nil {
		return nil
	}
	return &money.Money{Amount: *a, Currency: currency}
}

// reviewFields are the fields a person changes, so that the activity log shows only those.
type reviewFields struct {
	BusinessCase string       `json:"businessCase"`
	AmountSpent  *money.Money `json:"amountSpent"`
	Margin       *money.Money `json:"margin"`
	Remarks      string       `json:"remarks"`
}

func editableFields(r Review) reviewFields {
	return reviewFields{BusinessCase: r.BusinessCase, AmountSpent: moneyOf(r.AmountSpent, r.Currency),
		Margin: moneyOf(r.Margin, r.Currency), Remarks: r.Remarks}
}
