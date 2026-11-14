package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"log/slog"
	"strings"
	"time"

	"mapp/internal/people"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/errs"
)

type Service struct {
	tx           Transactor
	repo         Store
	people       People
	demoMode     bool
	demoPassword string
	now          clock.Clock
	attempts     *attempts
}

type Options struct {
	DemoMode     bool
	DemoPassword string
	Now          clock.Clock
}

func NewService(tx Transactor, repo Store, peopleRepo People, opts Options) *Service {
	return &Service{
		tx: tx, repo: repo, people: peopleRepo, demoMode: opts.DemoMode, demoPassword: opts.DemoPassword,
		now: opts.Now, attempts: newAttempts(opts.Now),
	}
}

func (s *Service) DemoMode() bool {
	return s.demoMode
}

// DemoPassword is shown openly on the sign-in page: all demo data is fictitious.
func (s *Service) DemoPassword() string {
	return s.demoPassword
}

// SignInAttempt is what one sign-in sends; Client is the address the trusted proxy reports.
type SignInAttempt struct {
	Email, Password, Client, OldToken string
}

// SignIn ends OldToken's session and every expired one of anyone, so old sessions do not pile up.
func (s *Service) SignIn(ctx context.Context, in SignInAttempt) (string, people.Person, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var problems errs.Problems
	if email == "" {
		problems.Add("email", "Enter your e-mail")
	}
	if in.Password == "" {
		problems.Add("password", "Enter the password")
	}
	if err := problems.Err(); err != nil {
		return "", people.Person{}, err
	}
	if err := s.refuseLocked(email, in.Client); err != nil {
		return "", people.Person{}, err
	}
	in.Email = email
	token, person, err := s.startSession(ctx, in)
	if err == nil {
		s.attempts.succeeded(email, in.Client)
	}
	return token, person, err
}

func (s *Service) refuseLocked(email, client string) error {
	if wait := s.attempts.wait(email, client); wait > 0 {
		return errs.TooManyAttempts(retryMessage(wait), wait)
	}
	return nil
}

func (s *Service) countFailure(ctx context.Context, email, client string, err error) {
	if apiErr, ok := errors.AsType[*errs.Error](err); !ok || apiErr.Code != errs.CodeIncorrectCredentials {
		return
	}
	for _, kind := range s.attempts.failed(email, client) {
		slog.WarnContext(ctx, "sign-in locked after too many failed attempts", "key", kind)
	}
}

// startSession checks the lock and counts a failure inside the Write, which runs one at a time (no race).
func (s *Service) startSession(ctx context.Context, in SignInAttempt) (string, people.Person, error) {
	token := newToken()
	var person people.Person
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		if err := s.refuseLocked(in.Email, in.Client); err != nil {
			return err
		}
		var err error
		person, err = s.checkCredentials(ctx, in.Email, in.Password)
		if err != nil {
			s.countFailure(ctx, in.Email, in.Client, err)
			return err
		}
		now := s.now()
		if err := s.removeOldSessions(ctx, in.OldToken, now); err != nil {
			return err
		}
		if err := s.repo.RecordSignIn(ctx, person.ID, now.UTC()); err != nil { // in the session's step
			return err
		}
		return s.repo.Put(ctx, Session{ID: hashToken(token), PersonID: person.ID, CreatedAt: now, LastUsedAt: now})
	})
	if err != nil {
		return "", people.Person{}, err
	}
	return token, person, nil
}

// checkCredentials returns one error whatever was wrong, so the answer never tells which e-mails exist.
func (s *Service) checkCredentials(ctx context.Context, email, password string) (people.Person, error) {
	person, found, err := s.people.FindByEmail(ctx, email)
	if err != nil {
		return people.Person{}, err
	}
	// Constant time: the time taken never hints at how much of the password was right.
	passwordRight := subtle.ConstantTimeCompare([]byte(password), []byte(s.demoPassword)) == 1
	if !found || !person.Active || !passwordRight {
		return people.Person{}, errs.IncorrectCredentials()
	}
	return person, nil
}

func (s *Service) removeOldSessions(ctx context.Context, oldToken string, now time.Time) error {
	if oldToken != "" {
		if err := s.repo.Delete(ctx, hashToken(oldToken)); err != nil {
			return err
		}
	}
	sessions, err := s.repo.List(ctx)
	if err != nil {
		return err
	}
	for _, session := range sessions {
		if session.expiredAt(now) {
			if err := s.repo.Delete(ctx, session.ID); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Service) SignOut(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.tx.Write(ctx, func(ctx context.Context) error {
		return s.repo.Delete(ctx, hashToken(token))
	})
}

// Authenticate deletes a refused session, all in one Write: a session signed out meanwhile never comes back.
func (s *Service) Authenticate(ctx context.Context, token string) (actor.Actor, error) {
	if token == "" {
		return actor.Actor{}, errs.SignInRequired()
	}

	var a actor.Actor
	// refusal is returned after the Write: an error from inside it would undo the deletion of the session.
	var refusal error
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		session, found, err := s.repo.Get(ctx, hashToken(token))
		if err != nil {
			return err
		}
		if !found {
			refusal = errs.SignInRequired()
			return nil
		}

		now := s.now()
		if session.expiredAt(now) {
			refusal = errs.SessionExpired()
			return s.repo.Delete(ctx, session.ID)
		}

		person, found, err := s.people.Get(ctx, session.PersonID)
		if err != nil {
			return err
		}
		if !found || !person.Active {
			refusal = errs.SignInRequired()
			return s.repo.Delete(ctx, session.ID)
		}

		if now.Sub(session.LastUsedAt) >= touchInterval {
			session.LastUsedAt = now
			if err := s.repo.Put(ctx, session); err != nil {
				return err
			}
		}
		a = person.Actor()
		return nil
	})
	if err != nil {
		return actor.Actor{}, err
	}
	if refusal != nil {
		return actor.Actor{}, refusal
	}
	return a, nil
}

// newToken writes 32 random bytes as base64url, so they fit in a cookie.
func newToken() string {
	random := make([]byte, 32)
	rand.Read(random) // never fails: Go stops the program when the system cannot give random bytes
	return base64.RawURLEncoding.EncodeToString(random)
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
