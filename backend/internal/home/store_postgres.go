package home

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"mapp/internal/platform/database"
	"mapp/internal/platform/database/sqlcdb"
	"mapp/internal/platform/date"
)

type PostgresStore struct {
	db *database.DB
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) GetReminder(ctx context.Context, personID string) (Reminder, bool, error) {
	row, err := s.db.Queries(ctx).GetHomeActionReminder(ctx, personID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Reminder{}, false, nil
	}
	if err != nil {
		return Reminder{}, false, fmt.Errorf("select the action-items reminder of %s: %w", personID, err)
	}
	return Reminder{PersonID: row.PersonID, HiddenUntil: date.Today(row.HiddenUntil), UpdatedAt: row.UpdatedAt}, true, nil
}

func (s *PostgresStore) PutReminder(ctx context.Context, r Reminder) error {
	params := sqlcdb.PutHomeActionReminderParams{PersonID: r.PersonID, HiddenUntil: r.HiddenUntil.Time(), UpdatedAt: r.UpdatedAt}
	if err := s.db.Queries(ctx).PutHomeActionReminder(ctx, params); err != nil {
		return fmt.Errorf("save the action-items reminder of %s: %w", r.PersonID, err)
	}
	return nil
}
