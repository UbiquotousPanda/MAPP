package history_test

import (
	"testing"

	"mapp/internal/history"
)

func TestStatusAfterRestore_RestoreResetsUndoKeeps(t *testing.T) {
	t.Parallel()
	tests := []struct {
		undo         bool
		status, want string
		wantChanged  bool
	}{
		{false, "approved", "created", true},
		{false, "created", "created", false},
		{true, "approved", "approved", false},
	}
	for _, tt := range tests {
		got, changed := history.StatusAfterRestore(history.RestoreContext{Undo: tt.undo}, tt.status, "created")
		if got != tt.want || changed != tt.wantChanged {
			t.Errorf("StatusAfterRestore(undo %v, %s) = %s, %v; want %s, %v", tt.undo, tt.status, got, changed, tt.want, tt.wantChanged)
		}
	}
}
