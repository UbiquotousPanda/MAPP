package postinvestment

import (
	"context"
	"strings"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/record"
)

type Service struct {
	tx         Transactor
	repo       Store
	ids        *ids.Generator
	history    *history.Service
	activities Activities
	now        clock.Clock
}

func NewService(tools history.Tools, repo Store, activities Activities) *Service {
	return &Service{tx: tools.Tx, repo: repo, ids: tools.IDs, history: tools.Log, activities: activities, now: tools.Now}
}

// List answers the reviews of the activities the person sees, newest change first; activityID keeps one.
func (s *Service) List(ctx context.Context, a actor.Actor, activityID string) (List, error) {
	var list List
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		var err error
		list.Items, err = s.visibleViews(ctx, a, activityID)
		return err
	})
	list.Export = authz.AvailableAnywhere(ctx, authz.DataExport)
	return list, err
}

func (s *Service) Get(ctx context.Context, a actor.Actor, id string) (View, error) {
	var view View
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		r, act, err := s.visible(ctx, id)
		if err != nil {
			return err
		}
		view, err = s.view(ctx, a, r, act)
		return err
	})
	return view, err
}

// Create starts an activity's only review as a Draft, its amount spent prefilled from the actual cost.
func (s *Service) Create(ctx context.Context, a actor.Actor, in CreateInput) (View, error) {
	activityID := strings.TrimSpace(in.ActivityID)
	if activityID == "" {
		return View{}, errs.Validation(errs.FieldError{Field: fieldActivity, Message: msgChooseActivity})
	}
	var view View
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		act, err := s.activityToReview(ctx, activityID)
		if err != nil {
			return err
		}
		r, err := s.draft(ctx, a, act)
		if err != nil {
			return err
		}
		if err = s.repo.Insert(ctx, r); err != nil {
			return err
		}
		if err = s.log(ctx, a, act, history.LogInput{RecordID: r.ID, Action: history.ActionCreated}); err != nil {
			return err
		}
		view, err = s.view(ctx, a, r, act)
		return err
	})
	return view, err
}

// Update saves the fields sent on a Draft; a save that changes nothing creates no version and no log entry.
func (s *Service) Update(ctx context.Context, a actor.Actor, id string, in UpdateInput) (View, error) {
	var view View
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		stored, act, err := s.editable(ctx, a, id)
		if err != nil {
			return err
		}
		currency, err := s.currencyFor(ctx, stored, in)
		if err != nil {
			return err
		}
		changed, problems := applied(stored, in, currency)
		if err = problems.Err(); err != nil {
			return err
		}
		if err = stored.CheckVersion(*in.Version, reviewNoun); err != nil {
			return err
		}
		if changed, err = s.save(ctx, a, act, edit{before: stored, after: changed}); err != nil {
			return err
		}
		view, err = s.view(ctx, a, changed, act)
		return err
	})
	return view, err
}

// Submit checks every field, answering all problems at once, and makes the review Submitted.
func (s *Service) Submit(ctx context.Context, a actor.Actor, id string, in SubmitInput) (View, error) {
	if in.Version == nil {
		return View{}, errs.Validation(errs.FieldError{Field: fieldVersion, Message: msgEnterVersion})
	}
	var view View
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		r, act, err := s.editable(ctx, a, id)
		if err != nil {
			return err
		}
		if err = r.CheckVersion(*in.Version, reviewNoun); err != nil {
			return err
		}
		if err = submitProblems(r).Err(); err != nil {
			return err
		}
		previous, now, by := r.Version, s.now(), a
		r.Status, r.SubmittedAt, r.SubmittedBy = StatusSubmitted, &now, &by
		r.Touch(a, now)
		if err = s.repo.Update(ctx, r, previous); err != nil {
			return err
		}
		if err = s.log(ctx, a, act, history.LogInput{RecordID: r.ID, Action: history.ActionStatusChanged, Verb: verbSubmitted}); err != nil {
			return err
		}
		view, err = s.view(ctx, a, r, act)
		return err
	})
	return view, err
}

func (s *Service) Delete(ctx context.Context, a actor.Actor, id string) (history.BinEntry, error) {
	var entry history.BinEntry
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		_, act, err := s.visible(ctx, id)
		if err != nil {
			return err
		}
		if err = authz.RequireIn(ctx, authz.ActivitiesDelete, act.Facts.Plan); err != nil {
			return err
		}
		entry, err = s.history.MoveToBin(ctx, a, kindReview, id)
		return err
	})
	return entry, err
}

func (s *Service) activityToReview(ctx context.Context, activityID string) (Activity, error) {
	found, err := s.activities.InScope(ctx, authz.ScopeOf(ctx), []string{activityID})
	if err != nil {
		return Activity{}, err
	}
	act, seen := found[activityID]
	if !seen {
		return Activity{}, errs.NotFound(msgActivityGone)
	}
	if err = authz.RequireIn(ctx, authz.ActivitiesEdit, act.Facts.Plan); err != nil {
		return Activity{}, err
	}
	existing, err := s.repo.IDsOfActivity(ctx, activityID)
	if err != nil {
		return Activity{}, err
	}
	if len(existing) > 0 {
		return Activity{}, errs.NameTaken(msgAlreadyReviewed)
	}
	return act, nil
}

func (s *Service) draft(ctx context.Context, a actor.Actor, act Activity) (Review, error) {
	live, err := s.activities.Live(ctx, a, act.ID)
	if err != nil {
		return Review{}, err
	}
	if live.Figures == nil {
		return Review{}, errs.Forbidden(msgFinanceHidden)
	}
	spent := live.Figures.Actual.Amount
	r := Review{ActivityID: act.ID, Status: StatusDraft, Currency: live.Figures.Actual.Currency, AmountSpent: &spent}
	if r.ID, err = s.ids.Next(ctx, ids.PrefixPostInvestmentReview); err != nil {
		return Review{}, err
	}
	r.Meta = record.NewMeta(a, s.now())
	return r, nil
}

// edit is a review as stored and as the person changed it.
type edit struct {
	before, after Review
}

func (s *Service) save(ctx context.Context, a actor.Actor, act Activity, e edit) (Review, error) {
	changes, err := history.Diff(editableFields(e.before), editableFields(e.after))
	if err != nil || len(changes) == 0 {
		return e.before, err
	}
	changed := e.after
	changed.Touch(a, s.now())
	if err = s.repo.Update(ctx, changed, e.before.Version); err != nil {
		return Review{}, err
	}
	return changed, s.log(ctx, a, act, history.LogInput{RecordID: changed.ID, Action: history.ActionChanged, Changes: changes})
}

// log writes in about the review in.RecordID, named after its activity.
func (s *Service) log(ctx context.Context, a actor.Actor, act Activity, in history.LogInput) error {
	in.Kind, in.RecordName, in.ParentID = kindReview, act.Name, act.ID
	_, err := s.history.Log(ctx, a, in)
	return err
}
