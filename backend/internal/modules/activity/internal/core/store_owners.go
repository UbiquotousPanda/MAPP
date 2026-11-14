package core

import (
	"context"
	"fmt"

	"mapp/internal/modules/activity/internal/sqlcdb"
)

func (s *PostgresStore) CountOwnedBy(ctx context.Context, personID string) (int, error) {
	n, err := sqlcdb.New(s.db.Conn(ctx)).CountActivitiesOwnedBy(ctx, personID)
	if err != nil {
		return 0, fmt.Errorf("count activities of %s: %w", personID, err)
	}
	return n, nil
}
