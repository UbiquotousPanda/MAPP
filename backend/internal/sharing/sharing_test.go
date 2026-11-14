package sharing_test

import (
	"slices"
	"testing"

	"mapp/internal/sharing"
)

func TestTeamIDs_OneOrderOnceEach(t *testing.T) {
	t.Parallel()
	if got := sharing.TeamIDs([]string{"T-1000", "T-999", "T-1000"}); !slices.Equal(got, []string{"T-999", "T-1000"}) {
		t.Errorf("TeamIDs = %v, want [T-999 T-1000]", got)
	}
	if sharing.Changed([]string{"T-1000", "T-999"}, []string{"T-999", "T-1000"}) {
		t.Error("Changed = true for the same teams in another order, want false")
	}
	if sharing.Allowed([]string{"T-1", "T-3"}, []string{"T-1", "T-2"}) {
		t.Error("Allowed = true with a team the owner is not in, want false")
	}
}
