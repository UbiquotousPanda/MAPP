package core

import (
	"context"
	"fmt"

	"mapp/internal/modules/campaign/internal/sqlcdb"
)

func (s *PostgresStore) CountCampaignsOwnedBy(ctx context.Context, personID string) (int, error) {
	n, err := sqlcdb.New(s.db.Conn(ctx)).CountCampaignsOwnedBy(ctx, personID)
	if err != nil {
		return 0, fmt.Errorf("count campaigns of %s: %w", personID, err)
	}
	return n, nil
}

func (s *PostgresStore) CountInitiativesOwnedBy(ctx context.Context, personID string) (int, error) {
	n, err := sqlcdb.New(s.db.Conn(ctx)).CountInitiativesOwnedBy(ctx, personID)
	if err != nil {
		return 0, fmt.Errorf("count initiatives of %s: %w", personID, err)
	}
	return n, nil
}
