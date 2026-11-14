package record_test

import (
	"slices"
	"testing"

	"mapp/internal/platform/record"
)

type marked struct {
	id    string
	isDef bool
}

func TestOtherDefaults_LeavesOneDefault(t *testing.T) {
	t.Parallel()
	items := []marked{{"V-1", true}, {"V-2", false}, {"V-3", true}}
	got := record.OtherDefaults(items, "V-3", func(m marked) string { return m.id }, func(m marked) bool { return m.isDef })
	if !slices.Equal(got, []marked{{"V-1", true}}) {
		t.Errorf("OtherDefaults = %v, want only V-1", got)
	}
}
