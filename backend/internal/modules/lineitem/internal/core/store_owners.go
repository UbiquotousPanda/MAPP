package core

import (
	"context"
	"fmt"

	"mapp/internal/modules/lineitem/internal/sqlcdb"
)

func (s *PostgresStore) CountOwnedBy(ctx context.Context, personID string) (int, error) {
	n, err := sqlcdb.New(s.db.Conn(ctx)).CountLineItemsOwnedBy(ctx, personID)
	if err != nil {
		return 0, fmt.Errorf("count line items of %s: %w", personID, err)
	}
	return n, nil
}
