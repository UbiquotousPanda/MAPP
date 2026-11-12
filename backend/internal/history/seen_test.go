package history

import (
	"errors"
	"testing"

	"mapp/internal/platform/errs"
)

func TestMoveToBin_RefusesAStaleSeenVersionAndChecksOnlyThatRecord_SMM10(t *testing.T) {
	t.Parallel()
	f := newBareFixture(t)
	f.register(t, f.standardKinds()...)
	f.addTree(t)

	_, stale := f.service.MoveToBin(WithSeenVersion(t.Context(), "P-1", 2), priya, "parent", "P-1")
	_, other := f.service.MoveToBin(WithSeenVersion(t.Context(), "P-1", 2), priya, "child", "C-1")
	_, seen := f.service.MoveToBin(WithSeenVersion(t.Context(), "P-1", 1), priya, "parent", "P-1")

	apiErr, refused := errors.AsType[*errs.Error](stale)
	if !refused || apiErr.Code != errs.CodeVersionConflict || other != nil || seen != nil {
		t.Errorf("stale = %v, another record = %v, the version seen = %v", stale, other, seen)
	}
}
