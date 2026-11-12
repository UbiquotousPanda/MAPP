package bulk_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/bulk"
	"mapp/internal/platform/errs"
)

func TestRun_ARecordChangedSinceItWasSelectedIsLeftUnchanged_BEM9(t *testing.T) {
	t.Parallel()
	seen, changed := activity("A-1001", "Launch film", bulk.StatusCreated), activity("A-1002", "Trade fair", bulk.StatusCreated)
	seen.Version, changed.Version = 2, 5
	f := newFixture(t, seen, changed)

	result, err := f.service.Run(t.Context(), priya, bulk.Request{Action: bulk.ActionChangeOwner, OwnerID: "U-1003",
		RecordIDs: []string{"A-1001", "A-1002"}, Versions: map[string]int{"A-1001": 2, "A-1002": 4}})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	got := []any{result.Counts, result.Outcomes[1].Outcome, result.Outcomes[1].Reasons, f.stored(t, "A-1002").OwnerID}
	want := []any{bulk.Counts{Done: 1, Skipped: 1}, "skipped", []string{"Changed since you selected it — select it again to see the change"}, ""}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("counts, outcome, reasons and owner of the changed record (-want +got):\n%s", diff)
	}
}

func TestRun_ARecordWithoutTheVersionSeenIsRefused_BEM9(t *testing.T) {
	t.Parallel()
	f := newFixture(t, activity("A-1001", "Launch film", bulk.StatusCreated))

	_, err := f.service.Run(t.Context(), priya, bulk.Request{Action: bulk.ActionChangeOwner, OwnerID: "U-1003",
		RecordIDs: []string{"A-1001"}})

	assertValidation(t, err, errs.FieldError{Field: "versions", Message: "Select the records again, so the action is based on what you see."})
}
