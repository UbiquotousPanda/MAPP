package purchaserequest_test

import (
	"context"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/activity/activitytest"
	"mapp/internal/approval/approvaltest"
	"mapp/internal/lineitem/lineitemtest"
	"mapp/internal/people/peopletest"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/fake"
	"mapp/internal/platform/money"
	"mapp/internal/settings/settingstest"
)

const (
	meisID    = "U-1004"
	danielsID = "U-1003"
)

// alteration changes the demo data directly, as other features would while a purchase request waits.
type alteration func(t *testing.T, db *fake.DB)

func onDemoData(t *testing.T) (*apitest.Server, *fake.DB) {
	t.Helper()
	db := apitest.DemoDB(t, false)
	return apitest.New(t, apitest.WithDB(db)), db
}

func orPut(err error, put func() error) error {
	if err != nil {
		return err
	}
	return put()
}

func altering(fn func(ctx context.Context, db *fake.DB) error) alteration {
	return func(t *testing.T, db *fake.DB) {
		t.Helper()
		if err := db.Write(t.Context(), func(ctx context.Context) error { return fn(ctx, db) }); err != nil {
			t.Fatalf("changing the demo data: %v", err)
		}
	}
}

func deactivatePerson(id string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := peopletest.NewStore(db)
		person, _, err := store.Get(ctx, id)
		person.Active = false
		return orPut(err, func() error { return store.Put(ctx, person) })
	})
}

func deactivateCurrency(code string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := settingstest.NewStore(db)
		currency, _, err := store.GetCurrency(ctx, code)
		currency.Active = false
		return orPut(err, func() error { return store.PutCurrency(ctx, currency) })
	})
}

func deactivateOption(id string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := settingstest.NewStore(db)
		option, _, err := store.GetOption(ctx, id)
		option.Active = false
		return orPut(err, func() error { return store.PutOption(ctx, option) })
	})
}

func deactivateWorkflow(id string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := approvaltest.NewStore(db)
		workflow, _, err := store.GetWorkflow(ctx, id)
		workflow.Active = false
		return orPut(err, func() error { return store.PutWorkflow(ctx, workflow) })
	})
}

// leaveApproval takes the activity out of its approval, as an edit of an approved activity does.
func leaveApproval(id string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := activitytest.NewStore(db)
		act, _, err := store.Get(ctx, id)
		act.Status = activity.StatusCreated
		return orPut(err, func() error { return store.Put(ctx, act) })
	})
}

func lowerLineItemCost(id string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := lineitemtest.NewStore(db)
		item, _, err := store.Get(ctx, id)
		item.PlannedCost = money.FromCents(100000)
		return orPut(err, func() error { return store.Put(ctx, item) })
	})
}

func lowerPlannedCost(id string) alteration {
	return altering(func(ctx context.Context, db *fake.DB) error {
		store := activitytest.NewStore(db)
		act, _, err := store.Get(ctx, id)
		low := money.USD(money.FromCents(100))
		act.PlannedCost = &low
		return orPut(err, func() error { return store.Put(ctx, act) })
	})
}
