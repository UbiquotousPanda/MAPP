package auth

import (
	"fmt"
	"math"
	"slices"
	"strings"
	"sync"
	"time"

	"mapp/internal/platform/clock"
)

const (
	keyEmail     = "e-mail"
	keyClient    = "client"
	window       = 15 * time.Minute
	lockFor      = 15 * time.Minute
	emailLimit   = 5
	clientLimit  = 20
	retryWording = "Too many sign-in attempts. Try again in %d %s."
)

// attempts lives in memory: one API process serves every sign-in in this phase (D-361).
type attempts struct {
	mu   sync.Mutex
	now  clock.Clock
	keys map[string]*attemptLog
}

type attemptLog struct {
	failures    []failure
	lockedUntil time.Time
}

type failure struct {
	at    time.Time
	email string
}

func newAttempts(now clock.Clock) *attempts {
	return &attempts{now: now, keys: map[string]*attemptLog{}}
}

func emailKey(email string) string {
	return keyEmail + ":" + strings.ToLower(strings.TrimSpace(email))
}

func clientKey(client string) string {
	return keyClient + ":" + client
}

// wait is how long the e-mail or the client must still wait; zero when neither is locked.
func (a *attempts) wait(email, client string) time.Duration {
	a.mu.Lock()
	defer a.mu.Unlock()
	now := a.now()
	return max(a.waitOf(emailKey(email), now), a.waitOf(clientKey(client), now))
}

func (a *attempts) waitOf(key string, now time.Time) time.Duration {
	entry, found := a.keys[key]
	if !found || !now.Before(entry.lockedUntil) {
		return 0
	}
	return entry.lockedUntil.Sub(now)
}

// failed records a failure for both keys and returns the kinds of key it locked.
func (a *attempts) failed(email, client string) []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	now := a.now()
	a.forget(now)
	var locked []string
	if a.fail(emailKey(email), failure{at: now, email: emailKey(email)}, emailLimit) {
		locked = append(locked, keyEmail)
	}
	if a.fail(clientKey(client), failure{at: now, email: emailKey(email)}, clientLimit) {
		locked = append(locked, keyClient)
	}
	return locked
}

func (a *attempts) fail(key string, f failure, limit int) bool {
	entry, found := a.keys[key]
	if !found {
		entry = &attemptLog{}
		a.keys[key] = entry
	}
	entry.failures = append(recent(entry.failures, f.at), f)
	if len(entry.failures) < limit {
		return false
	}
	entry.failures = nil
	entry.lockedUntil = f.at.Add(lockFor)
	return true
}

// succeeded clears the e-mail and the client's failures with that e-mail: a success with one account must
// not wipe the client's guesses at others.
func (a *attempts) succeeded(email, client string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	key := emailKey(email)
	delete(a.keys, key)
	if entry, found := a.keys[clientKey(client)]; found {
		entry.failures = slices.DeleteFunc(entry.failures, func(f failure) bool { return f.email == key })
	}
}

// forget drops keys with no failure in the window and no lock, so the map cannot grow without end.
func (a *attempts) forget(now time.Time) {
	for key, entry := range a.keys {
		entry.failures = recent(entry.failures, now)
		if len(entry.failures) == 0 && !now.Before(entry.lockedUntil) {
			delete(a.keys, key)
		}
	}
}

func recent(failures []failure, now time.Time) []failure {
	kept := failures[:0]
	for _, f := range failures {
		if now.Sub(f.at) < window {
			kept = append(kept, f)
		}
	}
	return kept
}

func retryMessage(wait time.Duration) string {
	minutes := int(math.Ceil(wait.Minutes()))
	if minutes == 1 {
		return fmt.Sprintf(retryWording, minutes, "minute")
	}
	return fmt.Sprintf(retryWording, minutes, "minutes")
}
