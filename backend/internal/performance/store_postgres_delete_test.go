package performance_test

import (
	"context"
	"errors"
	"testing"

	"mapp/internal/performance"
)

func TestPostgresStore_DeleteSourceRefusedWhileAnythingRefersToIt_FR002(t *testing.T) {
	t.Parallel()
	store, db := pgPerformanceDB(t)
	keyOnly := performance.Source{ID: "PS-2", Name: "Keys only", OwnerID: "U-2001",
		Category: performance.CategoryMarketingAutomation, Status: performance.StatusActive,
		DeliveryRoute: performance.RouteUpload, Cadence: performance.CadenceMonthly, Meta: pgMeta}
	unused := keyOnly
	unused.ID, unused.Name = "PS-3", "Unused"
	pgWrite(t, db, func(ctx context.Context) error {
		return errors.Join(store.PutSource(ctx, keyOnly), store.PutSource(ctx, unused),
			store.PutIntegrationID(ctx, performance.IntegrationID{ID: "IID-3", ActivityID: "A-1001",
				SourceID: "PS-2", Value: "ext-3", Meta: pgMeta}),
			store.PutMapping(ctx, performance.Mapping{ID: "PSM-3", SourceID: "PS-3", ColumnName: "Ref",
				Meaning: performance.MeaningReference, Meta: pgMeta}))
	})

	use, err := store.SourceUse(t.Context(), "PS-1")
	if err != nil || use != (performance.SourceUse{Facts: 2, Imports: 1, IntegrationIDs: 2}) {
		t.Errorf("SourceUse(PS-1) = %+v, %v; want 2 facts, 1 load and 2 integration IDs", use, err)
	}
	for id, want := range map[string]bool{"PS-1": false, "PS-2": false, "PS-3": true} {
		var deleted bool
		pgWrite(t, db, func(ctx context.Context) error {
			deleted, err = store.DeleteSource(ctx, id)
			return err
		})
		if deleted != want {
			t.Errorf("DeleteSource(%s) = %v, want %v", id, deleted, want)
		}
	}
}

// Binning an activity takes its facts and integration IDs, but the source keeps its load, so it cannot be
// deleted in between and the restore finds every row it refers to.
func TestPostgresStore_ABinnedActivitysFactsComeBackAfterADeleteOfTheirSourceWasRefused_FR002_FR021(t *testing.T) {
	t.Parallel()
	store, db := pgPerformanceDB(t)
	var binned []performance.Fact
	var keys []performance.IntegrationID
	pgWrite(t, db, func(ctx context.Context) error {
		for _, n := range []string{"1", "2"} {
			fact, _, err := store.GetFact(ctx, "PF-"+n)
			key, _, keyErr := store.GetIntegrationID(ctx, "IID-"+n)
			binned, keys = append(binned, fact), append(keys, key)
			if err = errors.Join(err, keyErr); err != nil {
				return err
			}
		}
		return errors.Join(store.DeleteFacts(ctx, []string{"PF-1", "PF-2"}),
			store.DeleteIntegrationIDs(ctx, []string{"IID-1", "IID-2"}))
	})

	var deleted bool
	pgWrite(t, db, func(ctx context.Context) (err error) {
		deleted, err = store.DeleteSource(ctx, "PS-1")
		return err
	})
	pgWrite(t, db, func(ctx context.Context) error {
		var err error
		for i := range binned {
			binned[i].Held = true
			err = errors.Join(err, store.PutFact(ctx, binned[i]), store.PutIntegrationID(ctx, keys[i]))
		}
		return err
	})

	if deleted {
		t.Errorf("DeleteSource(PS-1) = true while its load remains, want it refused")
	}
}
