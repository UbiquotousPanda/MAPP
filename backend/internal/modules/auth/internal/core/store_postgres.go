package core

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"mapp/internal/modules/auth/internal/sqlcdb"
	"mapp/internal/platform/database"
)

type PostgresStore struct {
	db *database.DB
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) Get(ctx context.Context, id string) (Session, bool, error) {
	row, err := sqlcdb.New(s.db.Conn(ctx)).GetSession(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, false, nil
	}
	if err != nil {
		return Session{}, false, fmt.Errorf("select session: %w", err)
	}
	return Session(row), true, nil
}

func (s *PostgresStore) Put(ctx context.Context, session Session) error {
	if err := sqlcdb.New(s.db.Conn(ctx)).PutSession(ctx, sqlcdb.PutSessionParams(session)); err != nil {
		return fmt.Errorf("save session of %s: %w", session.PersonID, err)
	}
	return nil
}

func (s *PostgresStore) Delete(ctx context.Context, id string) error {
	if err := sqlcdb.New(s.db.Conn(ctx)).DeleteSession(ctx, id); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (s *PostgresStore) List(ctx context.Context) ([]Session, error) {
	rows, err := sqlcdb.New(s.db.Conn(ctx)).ListSessions(ctx)
	if err != nil {
		return nil, fmt.Errorf("select sessions: %w", err)
	}
	sessions := make([]Session, 0, len(rows))
	for _, row := range rows {
		sessions = append(sessions, Session(row))
	}
	return sessions, nil
}
