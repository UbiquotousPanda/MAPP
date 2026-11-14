package performance_test

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"mapp/internal/performance"
	"mapp/internal/platform/errs"
)

func binActivity(t *testing.T, f *fixture) string {
	t.Helper()
	entry, err := f.history.MoveToBin(t.Context(), alex, "activity", "A-1")
	if err != nil {
		t.Fatalf("MoveToBin(activity): %v", err)
	}
	return entry.ID
}

func refusedToRestore(t *testing.T, err error) string {
	t.Helper()
	refusal, ok := errors.AsType[*errs.Error](err)
	if !ok || refusal.Code != errs.CodeCannotRestore {
		t.Fatalf("Restore() error = %v, want cannot_restore", err)
	}
	return refusal.Message
}

func TestRestoreActivity_FactsOfAnUploadUndoneMeanwhileStayOut_SMH5(t *testing.T) {
	t.Parallel()
	f, src := newImportFixture(t)
	run := f.runImport(t, src.ID, map[string]string{"r1": "5"})
	entryID := binActivity(t, f)
	if _, err := f.service.UndoImport(t.Context(), alex, run.ID); err != nil {
		t.Fatalf("UndoImport: %v", err)
	}

	result, err := f.history.Restore(t.Context(), alex, entryID)
	if err != nil {
		t.Fatalf("Restore: %v", err)
	}
	if facts, _ := f.store.ListFactsOfImport(t.Context(), run.ID); len(facts) != 0 {
		t.Errorf("the undone upload holds %d facts again after the restore, want none", len(facts))
	}
	if !strings.Contains(result.Details, "undone upload") {
		t.Errorf("restore details = %q, want them to say the undone upload's data was left out", result.Details)
	}
}

func TestRestoreActivity_ALaterLoadOfTheSameReferenceStaysCurrent_BEM1(t *testing.T) {
	t.Parallel()
	f, src := newImportFixture(t)
	f.runImport(t, src.ID, map[string]string{"r1": "5"})
	entryID := binActivity(t, f)
	f.runImport(t, src.ID, map[string]string{"r1": "7"})

	if _, err := f.history.Restore(t.Context(), alex, entryID); err != nil {
		t.Fatalf("Restore: %v", err)
	}
	current := f.currentFacts(t, src.ID, "r1")
	if len(current) != 1 || *current[0].Count != 7 {
		t.Errorf("current facts of r1 = %+v, want only the later load counting 7: two would double the figure", current)
	}
}

func TestRestoreActivity_AnAliasNowHeldElsewhereIsRefused_BEM1(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	if err := f.store.PutAlias(t.Context(), performance.Alias{ID: "EA-1", ActivityID: "A-1", Name: "Spring promo"}); err != nil {
		t.Fatalf("PutAlias: %v", err)
	}
	entryID := binActivity(t, f)
	if err := f.store.PutAlias(t.Context(), performance.Alias{ID: "EA-2", ActivityID: "A-2", Name: "spring promo"}); err != nil {
		t.Fatalf("PutAlias: %v", err)
	}

	_, err := f.history.Restore(t.Context(), alex, entryID)

	if message := refusedToRestore(t, err); !strings.Contains(message, "A-2") {
		t.Errorf("refusal = %q, want it to name activity A-2, which holds the name now", message)
	}
}

func TestRestoreActivity_AnIntegrationIDNowHeldElsewhereIsRefused_BEM1(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	if err := f.store.PutIntegrationID(t.Context(), performance.IntegrationID{ID: "IID-1", ActivityID: "A-1",
		SourceID: src.ID, Value: "ELQ-7"}); err != nil {
		t.Fatalf("PutIntegrationID: %v", err)
	}
	entryID := binActivity(t, f)
	if err := f.store.PutIntegrationID(t.Context(), performance.IntegrationID{ID: "IID-2", ActivityID: "A-2",
		SourceID: src.ID, Value: "elq-7"}); err != nil {
		t.Fatalf("PutIntegrationID: %v", err)
	}

	_, err := f.history.Restore(t.Context(), alex, entryID)

	refusedToRestore(t, err)
}

func TestCloseRowsOfUndoneImport_ClosesEveryRowBeyondAPage_SMH10(t *testing.T) {
	t.Parallel()
	f, src := newImportFixture(t)
	run := f.runImport(t, src.ID, map[string]string{"r1": "5"})
	for i := range 501 {
		row := performance.ReviewRow{ID: fmt.Sprintf("PRV-%d", 1000+i),
			ImportID: run.ID, SourceID: src.ID, Status: performance.ReviewOpen}
		if err := f.store.PutReviewRow(t.Context(), row); err != nil {
			t.Fatalf("PutReviewRow: %v", err)
		}
	}

	if _, err := f.service.UndoImport(t.Context(), alex, run.ID); err != nil {
		t.Fatalf("UndoImport: %v", err)
	}
	open, err := f.store.ListReviewRows(t.Context(), performance.ReviewFilter{ImportID: run.ID, StatusNot: "resolved"})
	if err != nil {
		t.Fatalf("ListReviewRows: %v", err)
	}
	if len(open) != 0 {
		t.Errorf("%d rows of the undone upload are still open, want none: a page size must not decide which close", len(open))
	}
}

func TestReactivateSource_RefusedWhenAnotherSourceNowSuppliesItsStage_SMH6(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	first, second := f.createSource(t, "Eloqua"), f.createSource(t, "Marketo")
	mql := performance.MappingInput{ColumnName: "mql", Meaning: performance.MeaningStage, Stage: "mql", ModelID: "MOD-1"}
	if _, err := f.service.CreateMapping(t.Context(), alex, first.ID, mql); err != nil {
		t.Fatalf("CreateMapping(first): %v", err)
	}
	if err := f.setSourceStatus(t, first.ID, performance.StatusInactive); err != nil {
		t.Fatalf("deactivate: %v", err)
	}
	if _, err := f.service.CreateMapping(t.Context(), alex, second.ID, mql); err != nil {
		t.Fatalf("CreateMapping(second): %v", err)
	}

	err := f.setSourceStatus(t, first.ID, performance.StatusActive)

	if refusal, ok := errors.AsType[*errs.Error](err); !ok || refusal.Code != errs.CodeNotAllowed {
		t.Errorf("reactivating a second supplier of mql = %v, want not_allowed", err)
	}
}

func TestUpdateMapping_RefusedWhenItWouldMakeASecondSupplier_SMH6(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	first, second := f.createSource(t, "Eloqua"), f.createSource(t, "Marketo")
	stage := func(s string) performance.MappingInput {
		return performance.MappingInput{ColumnName: s, Meaning: performance.MeaningStage, Stage: s, ModelID: "MOD-1"}
	}
	if _, err := f.service.CreateMapping(t.Context(), alex, first.ID, stage("mql")); err != nil {
		t.Fatalf("CreateMapping(first): %v", err)
	}
	inq, err := f.service.CreateMapping(t.Context(), alex, second.ID, stage("inq"))
	if err != nil {
		t.Fatalf("CreateMapping(second): %v", err)
	}
	edit := stage("mql")
	edit.Version = inq.Version

	_, err = f.service.UpdateMapping(t.Context(), alex, inq.ID, edit)

	if refusal, ok := errors.AsType[*errs.Error](err); !ok || refusal.Code != errs.CodeNotAllowed {
		t.Errorf("editing a mapping into a second supplier of mql = %v, want not_allowed", err)
	}
}

func TestSourceFreshness_AnUndoneLaterLoadDoesNotHideAFailure_SMM14(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")
	for i, status := range []performance.ImportStatus{performance.ImportFailed, performance.ImportUndone} {
		run := performance.Import{ID: fmt.Sprintf("PIM-%d", i+1), SourceID: src.ID, FileName: "load.csv",
			Origin: performance.OriginUpload, Status: status}
		run.CreatedAt = noon.Add(time.Duration(i) * time.Hour)
		if err := f.store.PutImport(t.Context(), run); err != nil {
			t.Fatalf("PutImport: %v", err)
		}
	}

	view, err := f.service.Source(t.Context(), alex, src.ID)
	if err != nil {
		t.Fatalf("Source: %v", err)
	}
	if !view.LastLoadFailed {
		t.Error("the source hides its failed load behind a later upload that was undone, want Failed")
	}
}

func TestSetSourceStatus_RefusesAStaleVersionAndNoChange_SMM9(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	src := f.createSource(t, "Eloqua")

	stale := f.service.SetSourceStatus(t.Context(), alex, src.ID,
		performance.StatusChange{Status: performance.StatusInactive, Version: src.Version + 1})
	same := f.service.SetSourceStatus(t.Context(), alex, src.ID,
		performance.StatusChange{Status: performance.StatusActive, Version: src.Version})

	if refusal, ok := errors.AsType[*errs.Error](stale); !ok || refusal.Code != errs.CodeVersionConflict {
		t.Errorf("a change against another version = %v, want version_conflict", stale)
	}
	if refusal, ok := errors.AsType[*errs.Error](same); !ok || refusal.Code != errs.CodeNotAllowed {
		t.Errorf("activating an active source = %v, want not_allowed", same)
	}
}
