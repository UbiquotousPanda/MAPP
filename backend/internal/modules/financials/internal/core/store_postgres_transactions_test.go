package core_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/modules/financials/internal/core"
)

// A widget reads every transaction type of the line items in its scope only, never another market's (L-1002).
func TestPostgresStoreTransactionsOnLineItems_ScopeIsolation_051_FR007(t *testing.T) {
	t.Parallel()
	db, s := pgStore(t)
	of := func(id, lineItemID string, typ core.Type) core.Transaction {
		p := pgTransaction(id, lineItemID)
		p.Type = typ
		return p
	}
	pgWrite(t, db, func(ctx context.Context) error {
		return errors.Join(s.PutTransaction(ctx, of("FT-1005", "L-1001", core.TypeInvoice)),
			s.PutTransaction(ctx, of("FT-1006", "L-1002", core.TypePayment)),
			s.PutTransaction(ctx, of("FT-1007", "L-1001", core.TypePurchaseOrder)))
	})
	tests := []struct {
		name        string
		lineItemIDs []string
		want        []string
	}{
		{name: "the line item of team T-1001's plan", lineItemIDs: []string{"L-1001"}, want: []string{"FT-1001", "FT-1005", "FT-1007"}},
		{name: "another market's line item only when asked", lineItemIDs: []string{"L-1002"}, want: []string{"FT-1002", "FT-1006"}},
		{name: "none", lineItemIDs: []string{}, want: []string{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			read, err := s.TransactionsOnLineItems(t.Context(), tt.lineItemIDs)
			if err != nil {
				t.Fatalf("TransactionsOnLineItems() error: %v", err)
			}
			ids := []string{}
			for _, transaction := range read {
				ids = append(ids, transaction.ID)
			}
			if diff := cmp.Diff(tt.want, ids); diff != "" {
				t.Errorf("TransactionsOnLineItems(%v) mismatch (-want +got):\n%s", tt.lineItemIDs, diff)
			}
		})
	}
}
