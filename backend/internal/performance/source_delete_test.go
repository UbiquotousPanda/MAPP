package performance_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"mapp/internal/performance"
	"mapp/internal/platform/errs"
)

func (f *fixture) write(t *testing.T, fn func(ctx context.Context) error) {
	t.Helper()
	if err := f.tools.Tx.Write(t.Context(), fn); err != nil {
		t.Fatalf("Write: %v", err)
	}
}

func refusedInUse(t *testing.T, f *fixture, sourceID, want string) {
	t.Helper()
	err := f.service.DeleteSource(t.Context(), alex, sourceID)
	var refusal *errs.Error
	if !errors.As(err, &refusal) || refusal.Code != "in_use" || !strings.Contains(refusal.Message, want) ||
		!strings.Contains(refusal.Message, "Deactivate it instead") {
		t.Fatalf("DeleteSource = %v, want in_use naming %q and offering Deactivate", err, want)
	}
	if sources, _ := f.store.ListSources(t.Context(), sourceID); len(sources) != 1 {
		t.Errorf("the refused source is gone")
	}
}

func TestDeleteSource_RefusedWhileALoadStaysInItsHistory_FR002(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	f.write(t, func(ctx context.Context) error {
		return f.store.PutImport(ctx, performance.Import{ID: "PIM-1", SourceID: src.ID, FileName: "load.csv",
			Origin: performance.OriginUpload, Status: performance.ImportUndone, Meta: src.Meta})
	})

	refusedInUse(t, f, src.ID, "1 load")
}

func TestDeleteSource_RefusedWhileRowsWaitForReview_FR002(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	f.write(t, func(ctx context.Context) error {
		return errors.Join(
			f.store.PutImport(ctx, performance.Import{ID: "PIM-1", SourceID: src.ID, FileName: "load.csv",
				Origin: performance.OriginUpload, Status: performance.ImportCompleted, Meta: src.Meta}),
			f.store.PutReviewRow(ctx, performance.ReviewRow{ID: "PRV-1", ImportID: "PIM-1", SourceID: src.ID,
				Raw: []byte("{}"), Reason: "No activity matched", Status: performance.ReviewOpen, Meta: src.Meta}),
			f.store.PutReviewRow(ctx, performance.ReviewRow{ID: "PRV-2", ImportID: "PIM-1", SourceID: src.ID,
				Raw: []byte(`{"a":1}`), Reason: "No activity matched", Status: performance.ReviewOpen, Meta: src.Meta}),
		)
	})

	refusedInUse(t, f, src.ID, "2 rows to review")
}

func TestDeleteSource_RefusedWhileAnActivityCarriesItsIntegrationID_FR002_FR037(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	f.write(t, func(ctx context.Context) error {
		return f.store.PutIntegrationID(ctx, performance.IntegrationID{ID: "IID-1", ActivityID: "A-1",
			SourceID: src.ID, Value: "ext-1", Meta: src.Meta})
	})

	refusedInUse(t, f, src.ID, "1 activity's integration ID")
}

// The binned activity's integration ID comes back with it on restore, so its source must still be there.
func TestDeleteSource_RefusedWhileABinnedActivityCarriesItsIntegrationID_FR002_FR021(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	f.write(t, func(ctx context.Context) error {
		return f.store.PutIntegrationID(ctx, performance.IntegrationID{ID: "IID-1", ActivityID: "A-1",
			SourceID: src.ID, Value: "ext-1", Meta: src.Meta})
	})
	if _, err := f.history.MoveToBin(t.Context(), alex, "activity", "A-1"); err != nil {
		t.Fatalf("MoveToBin(activity): %v", err)
	}

	refusedInUse(t, f, src.ID, "1 activity's integration ID")
}

// deletedSource deletes the source and answers its recycle-bin entry, checking its mappings went with it.
func (f *fixture) deletedSource(t *testing.T, sourceID string) string {
	t.Helper()
	if err := f.service.DeleteSource(t.Context(), alex, sourceID); err != nil {
		t.Fatalf("DeleteSource: %v", err)
	}
	if left, _ := f.store.ListMappings(t.Context(), []string{sourceID}); len(left) != 0 {
		t.Fatalf("after the delete %d mappings remain, want them in the bin with their source", len(left))
	}
	bin, err := f.history.ListBin(t.Context(), alex)
	if err != nil || len(bin) != 1 {
		t.Fatalf("ListBin = %d entries, %v; want the source's", len(bin), err)
	}
	return bin[0].ID
}

func TestDeleteSource_UndoBringsItsMappingsBack_FR002_FR045(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	mapping, err := f.service.CreateMapping(t.Context(), alex, src.ID,
		performance.MappingInput{ColumnName: "Ref", Meaning: performance.MeaningReference})
	if err != nil {
		t.Fatalf("CreateMapping: %v", err)
	}
	entryID := f.deletedSource(t, src.ID)

	if _, err = f.history.Undo(t.Context(), alex, entryID); err != nil {
		t.Fatalf("Undo: %v", err)
	}

	back, err := f.store.ListMappings(t.Context(), []string{src.ID})
	if err != nil || len(back) != 1 || back[0].ID != mapping.ID {
		t.Errorf("after Undo the mappings are %+v, %v; want %s back", back, err, mapping.ID)
	}
}
