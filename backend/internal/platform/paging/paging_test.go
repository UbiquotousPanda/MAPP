package paging_test

import (
	"testing"

	"mapp/internal/platform/paging"
)

func TestValid_D432_OnlyTheOneSet(t *testing.T) {
	t.Parallel()
	for _, n := range []int{25, 50, 100, 200} {
		if !paging.Valid(n) {
			t.Errorf("Valid(%d) = false, want true", n)
		}
	}
	for _, n := range []int{0, 5, 10, 20, 500} {
		if paging.Valid(n) {
			t.Errorf("Valid(%d) = true, want false", n)
		}
	}
}
