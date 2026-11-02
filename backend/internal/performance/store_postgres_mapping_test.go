package performance_test

import (
	"context"
	"testing"

	"mapp/internal/people"
	"mapp/internal/performance"
	"mapp/internal/platform/database/dbtest"
)

// A real defect: ListMappings(ctx, nil) is how mapping.go looks a mapping up by id, but on PostgreSQL
// ANY(NULL) matches no row, so every edit or delete answered "not found".
func TestPostgresStore_ListMappingsWithNoSourceIDsListsEveryMapping(t *testing.T) {
	t.Parallel()
	db := dbtest.NewDB(t)
	store := performance.NewPostgresStore(db)
	directory := people.NewPostgresStore(db)
	source := performance.Source{ID: "PS-1", Name: "Marketo", OwnerID: "U-1", Category: performance.CategoryMarketingAutomation,
		Status: performance.StatusActive, DeliveryRoute: performance.RouteUpload, Cadence: performance.CadenceDaily,
		Meta: pgMeta}
	mapping := performance.Mapping{ID: "PSM-1", SourceID: "PS-1", ColumnName: "note", Meaning: performance.MeaningReference, Meta: pgMeta}

	pgWrite(t, db, func(ctx context.Context) error {
		if err := directory.Put(ctx, people.Person{ID: "U-1", Name: "Sam Patel", Email: "sam@example.com", Meta: pgMeta}); err != nil {
			return err
		}
		if err := store.PutSource(ctx, source); err != nil {
			return err
		}
		return store.PutMapping(ctx, mapping)
	})

	for _, sourceIDs := range [][]string{nil, {}} {
		got, err := store.ListMappings(t.Context(), sourceIDs)
		if err != nil {
			t.Fatalf("ListMappings(%v) error: %v", sourceIDs, err)
		}
		if len(got) != 1 || got[0].ID != "PSM-1" {
			t.Errorf("ListMappings(%v) = %+v, want the one mapping", sourceIDs, got)
		}
	}
}
