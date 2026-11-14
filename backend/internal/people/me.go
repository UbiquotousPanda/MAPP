package people

import (
	"context"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
)

// CurrentUser gives the defaults for a display currency or date format never chosen; a person who no longer
// exists must sign in again.
func (s *Service) CurrentUser(ctx context.Context, a actor.Actor) (CurrentUser, error) {
	var user CurrentUser
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		person, err := s.signedInPerson(ctx, a)
		if err != nil {
			return err
		}
		user, err = s.currentUser(ctx, person)
		return err
	})
	if err != nil {
		return CurrentUser{}, err
	}
	return user, nil
}

// UpdateProfile changes only the name and job title: the e-mail is the sign-in name and changes only in
// Settings › People. A form that changes nothing writes nothing.
func (s *Service) UpdateProfile(ctx context.Context, a actor.Actor, update ProfileUpdate) (CurrentUser, error) {
	var user CurrentUser
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		p, err := s.signedInPerson(ctx, a)
		if err != nil {
			return err
		}
		var problems errs.Problems
		name := checkPersonName(&problems, update.Name)
		jobTitle := checkJobTitle(&problems, update.JobTitle)
		checkVersionSent(&problems, update.Version)
		if err = problems.Err(); err != nil {
			return err
		}
		if err = p.CheckVersion(*update.Version, personSingular); err != nil {
			return err
		}

		changed := p
		changed.Name, changed.JobTitle = name, jobTitle
		changes, err := history.Diff(p.logView(nil), changed.logView(nil)) // the teams do not change here
		if err != nil {
			return err
		}
		if len(changes) > 0 {
			changed.Touch(a, s.now())
			if err = s.repo.Put(ctx, changed); err != nil {
				return err
			}
			_, err = s.history.Log(ctx, a, history.LogInput{
				Kind: personKind, RecordID: changed.ID, RecordName: changed.Name, Action: history.ActionChanged, Changes: changes,
			})
			if err != nil {
				return err
			}
		}
		user, err = s.currentUser(ctx, changed)
		return err
	})
	if err != nil {
		return CurrentUser{}, err
	}
	return user, nil
}

func (s *Service) signedInPerson(ctx context.Context, a actor.Actor) (Person, error) {
	p, found, err := s.repo.Get(ctx, a.ID)
	if err != nil {
		return Person{}, err
	}
	if !found {
		return Person{}, errs.SignInRequired()
	}
	return p, nil
}

func (s *Service) currentUser(ctx context.Context, p Person) (CurrentUser, error) {
	prefs, err := s.preferences(ctx, p.ID)
	if err != nil {
		return CurrentUser{}, err
	}
	d, err := s.readDirectory(ctx)
	if err != nil {
		return CurrentUser{}, err
	}
	user := p.currentUser(prefs, d.teamRefs(d.teamIDsOf(p.ID)))
	user.Today = date.Today(s.now())
	if user.Access, err = s.accessOf(ctx, p.ID); err != nil {
		return CurrentUser{}, err
	}
	return user, nil
}
