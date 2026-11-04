package settings

import (
	"reflect"
	"strings"
	"testing"
)

// The assignment is keyed by the type, so restoring a category moves its types back from wherever they went
// while it was in the bin; the restore says so, as it says a released default.
func TestRestoreActivityCategory_NotesTheTypesItTakesBack_FR021_047C14(t *testing.T) {
	t.Parallel()
	f := newTestService(t)
	event := f.addType(t, "Event", true)
	webinar := f.addType(t, "Webinar", true)
	digital := f.createCategory(t, categoryInput("Digital", false, event.ID, webinar.ID))
	entry, err := f.service.DeleteActivityCategory(t.Context(), alex, digital.ID)
	if err != nil {
		t.Fatalf("DeleteActivityCategory: %v", err)
	}
	f.createCategory(t, categoryInput("Promotion", false, webinar.ID))

	result, err := f.history.Undo(t.Context(), alex, entry.ID)
	if err != nil {
		t.Fatalf("Undo: %v", err)
	}

	if got := typeNames(f.categoryNamed(t, "Digital")); !reflect.DeepEqual(got, []string{"Event", "Webinar"}) {
		t.Errorf("Digital's types after Undo = %v, want Event and Webinar: it restores the assignments it held", got)
	}
	if got := typeNames(f.categoryNamed(t, "Promotion")); len(got) != 0 {
		t.Errorf("Promotion's types after Undo = %v, want none: Webinar went back to Digital", got)
	}
	if !strings.Contains(result.Details, "'Webinar'") || !strings.Contains(result.Details, "'Promotion'") {
		t.Errorf("Undo details = %q, want a note that Webinar was taken back from Promotion", result.Details)
	}
}
