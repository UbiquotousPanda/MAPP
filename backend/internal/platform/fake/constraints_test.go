package fake_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"mapp/internal/platform/fake"
)

type tag struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	NoteID string `json:"noteId"`
}

func tagsOf(db *fake.DB) *fake.Table[tag] {
	return fake.TableOf(db, "tags", func(x tag) string { return x.ID }).
		Unique("tags_name_key", func(x tag) string { return strings.ToLower(x.Name) }).
		Check("tags_name_check", func(x tag) bool { return len(x.Name) <= 10 }).
		References("tags_note_id_fkey", "notes", func(x tag) string { return x.NoteID })
}

func refusedBy(t *testing.T, err error, name string) {
	t.Helper()
	if constraint, ok := errors.AsType[*fake.ConstraintError](err); !ok || constraint.Name != name {
		t.Errorf("error = %v, want constraint %s", err, name)
	}
}

func TestTable_UniqueAndCheckRefuseAsPostgreSQL(t *testing.T) {
	t.Parallel()
	db := fake.NewDB()
	tags := tagsOf(db)
	if err := tags.Put(t.Context(), tag{ID: "T-1", Name: "Red"}, tag{ID: "T-2", Name: ""}); err != nil {
		t.Fatalf("Put() error: %v", err)
	}

	refusedBy(t, tags.Put(t.Context(), tag{ID: "T-3", Name: "RED"}), "tags_name_key")
	refusedBy(t, tags.Put(t.Context(), tag{ID: "T-4", Name: "far too long a name"}), "tags_name_check")
	if err := tags.Put(t.Context(), tag{ID: "T-1", Name: "red"}, tag{ID: "T-5", Name: ""}); err != nil {
		t.Errorf("Put() of the same row renamed, and a second empty key: %v; want both kept", err)
	}
	if all := len(listedTags(t, tags)); all != 3 {
		t.Errorf("%d rows, want 3: a refused row is never kept", all)
	}
}

func TestTable_ReferencesRestrictsAtCommit(t *testing.T) {
	t.Parallel()
	db := fake.NewDB()
	notes, tags := notesOf(db), tagsOf(db)
	if err := notes.Put(t.Context(), note{ID: "N-1"}); err != nil {
		t.Fatalf("Put() error: %v", err)
	}
	inOrderOfAWrite := db.Write(t.Context(), func(ctx context.Context) error {
		if err := tags.Put(ctx, tag{ID: "T-1", Name: "a", NoteID: "N-2"}); err != nil {
			return err
		}
		return notes.Put(ctx, note{ID: "N-2"})
	})

	deleteUsed := db.Write(t.Context(), func(ctx context.Context) error { return notes.Delete(ctx, "N-2") })
	missingParent := tags.Put(t.Context(), tag{ID: "T-2", Name: "b", NoteID: "N-9"})
	copied := fake.TableOf(db.Copy(), "notes", func(n note) string { return n.ID })

	if inOrderOfAWrite != nil {
		t.Errorf("parent written after its child in one Write: %v; want it accepted at commit", inOrderOfAWrite)
	}
	refusedBy(t, deleteUsed, "tags_note_id_fkey")
	refusedBy(t, missingParent, "tags_note_id_fkey")
	refusedBy(t, copied.Delete(t.Context(), "N-2"), "tags_note_id_fkey")
	if _, found, _ := notes.Get("N-2"); !found {
		t.Error("N-2 deleted; want the refused delete undone")
	}
}

func listedTags(t *testing.T, tags *fake.Table[tag]) []tag {
	t.Helper()
	all, err := tags.List()
	if err != nil {
		t.Fatalf("List() error: %v", err)
	}
	return all
}
