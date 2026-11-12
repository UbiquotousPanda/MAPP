package activity_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"mapp/internal/campaign/campaigntest"
	"mapp/internal/plan/plantest"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
)

func restoreRefusal(t *testing.T, err error) string {
	t.Helper()
	refusal, ok := errors.AsType[*errs.Error](err)
	if !ok || refusal.Code != errs.CodeCannotRestore {
		t.Fatalf("Restore() error = %v, want cannot_restore", err)
	}
	return refusal.Message
}

func TestRestore_RefusedOutsideTheInitiativesDatesNow_BEM2(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	entry, err := f.service.Delete(t.Context(), priya, "A-1001")
	if err != nil {
		t.Fatalf("Delete: %v", err)
	}
	repo := campaigntest.NewStore(f.db)
	f.change(t, func(ctx context.Context) error {
		initiative, _, readErr := repo.GetInitiative(ctx, digitalAndSocial)
		if readErr != nil {
			return readErr
		}
		april := date.MustParse("2026-04-01")
		initiative.StartDate = &april
		return repo.PutInitiative(ctx, initiative)
	})

	_, err = f.history.Restore(t.Context(), daniel, entry.ID)

	if message := restoreRefusal(t, err); !strings.Contains(message, "inside the initiative's dates") {
		t.Errorf("refusal = %q, want it to say the dates must be inside the initiative's", message)
	}
	if _, found := f.stored(t, "A-1001"); found {
		t.Error("the activity came back outside its initiative's dates")
	}
}

func TestUndo_RefusedOnceThePlanCurrencyChanged_BEH1(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	before, _ := f.stored(t, "A-1001")
	if before.PlannedCost == nil {
		t.Fatal("A-1001 has no planned cost in the demo data; this test needs one")
	}
	entry, err := f.service.Delete(t.Context(), priya, "A-1001")
	if err != nil {
		t.Fatalf("Delete: %v", err)
	}
	plans := plantest.NewStore(f.db)
	f.change(t, func(ctx context.Context) error {
		p, _, readErr := plans.Get(ctx, "P-1001")
		if readErr != nil {
			return readErr
		}
		p.Currency = "EUR"
		return plans.Put(ctx, p)
	})

	_, err = f.history.Undo(t.Context(), priya, entry.ID)

	if message := restoreRefusal(t, err); !strings.Contains(message, "EUR") {
		t.Errorf("refusal = %q, want it to name the plan's currency now, EUR", message)
	}
}
