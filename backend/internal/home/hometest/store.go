// Package hometest is the in-memory fake of Home's reminder store, for tests of the whole API.
package hometest

import (
	"context"

	"mapp/internal/home"
	"mapp/internal/platform/fake"
)

type Store struct {
	reminders *fake.Table[home.Reminder]
}

func NewStore(db *fake.DB) Store {
	return Store{reminders: fake.TableOf(db, "home_action_reminders", func(r home.Reminder) string { return r.PersonID })}
}

func (s Store) GetReminder(_ context.Context, personID string) (home.Reminder, bool, error) {
	return s.reminders.Get(personID)
}

func (s Store) PutReminder(ctx context.Context, r home.Reminder) error {
	return s.reminders.Put(ctx, r)
}
