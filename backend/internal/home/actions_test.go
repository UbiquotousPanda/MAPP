package home

import (
	"context"
	"slices"
	"testing"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/fake"
)

type fakeReminders map[string]Reminder

func (f fakeReminders) GetReminder(_ context.Context, personID string) (Reminder, bool, error) {
	r, found := f[personID]
	return r, found, nil
}

func (f fakeReminders) PutReminder(_ context.Context, r Reminder) error {
	f[r.PersonID] = r
	return nil
}

type actionFixture struct {
	approvals, requests, lineItems []ActionItem
	activities                     []Activity
}

func (f *actionFixture) service(reminders fakeReminders, at *time.Time) *ActionsService {
	read := func(items *[]ActionItem) actionRead {
		return func(context.Context, actor.Actor) ([]ActionItem, error) { return slices.Clone(*items), nil }
	}
	src := ActionSources{
		ApprovalsWaiting: read(&f.approvals), PurchaseRequestsToFix: read(&f.requests), LineItemsWaitingForSwbs: read(&f.lineItems),
		Activities: func(context.Context, actor.Actor, string) ([]Activity, error) { return slices.Clone(f.activities), nil },
	}
	return NewActionsService(fake.NewDB(), src, reminders, func() time.Time { return *at })
}

func record(recordType, id string) errs.RecordRef {
	return errs.RecordRef{Type: recordType, ID: id, Name: id}
}

func ownActivity(id, status string, start date.Date, missing int) Activity {
	missingFields := make([]MissingField, missing)
	return Activity{ID: id, Name: id, Status: status, StartDate: &start, Missing: missingFields}
}

func kindsAndIDs(items []ActionItem) []string {
	list := []string{}
	for _, item := range items {
		list = append(list, item.Kind+":"+item.Record.ID)
	}
	return list
}

func TestActionItems_OverdueComeFirst_186(t *testing.T) {
	t.Parallel()
	earlier, later := now.Add(-72*time.Hour), now.Add(-24*time.Hour)
	f := &actionFixture{
		approvals: []ActionItem{
			{Record: record("activity", "A-1"), Since: &later},
			{Record: record("purchaseRequest", "PR-9"), Since: &earlier, Overdue: true},
			{Record: record("activity", "A-2"), Since: &earlier},
		},
		requests:  []ActionItem{{Record: record("purchaseRequest", "PR-1")}},
		lineItems: []ActionItem{{Record: record("lineItem", "LI-1")}},
		activities: []Activity{
			ownActivity("A-10", "created", date.MustParse("2026-04-01"), 2),        // starts later: not overdue
			ownActivity("A-11", activityDeclined, date.MustParse("2026-03-01"), 1), // started already: overdue
			ownActivity("A-12", "approved", date.MustParse("2026-03-01"), 1),       // approved: nothing to do
			ownActivity("A-13", "created", date.MustParse("2026-03-01"), 0),        // complete: nothing to do
		},
	}
	page, err := f.service(fakeReminders{}, &now).ActionItems(context.Background(), alex)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{
		"approval:PR-9", "activityIncomplete:A-11",
		"approval:A-2", "approval:A-1", "purchaseRequestToFix:PR-1", "swbsRequest:LI-1", "activityIncomplete:A-10",
	}
	if got := kindsAndIDs(page.Items); !slices.Equal(got, want) {
		t.Errorf("items = %v\nwant    %v", got, want)
	}
	if !page.Show || page.Total != len(want) || page.HiddenUntil != nil {
		t.Errorf("show %v, total %d, hidden until %v; want shown with %d items", page.Show, page.Total, page.HiddenUntil, len(want))
	}
}

func TestActionItems_RemindLaterHidesUntilTomorrow_186(t *testing.T) {
	t.Parallel()
	at := now
	f := &actionFixture{requests: []ActionItem{{Record: record("purchaseRequest", "PR-1")}}}
	reminders := fakeReminders{}
	service := f.service(reminders, &at)

	view, err := service.RemindLater(context.Background(), alex)
	if err != nil {
		t.Fatal(err)
	}
	tomorrow := date.MustParse("2026-03-13")
	if view.HiddenUntil != tomorrow || reminders[alex.ID].HiddenUntil != tomorrow {
		t.Fatalf("hidden until %v (stored %v), want %v", view.HiddenUntil, reminders[alex.ID].HiddenUntil, tomorrow)
	}
	cases := []struct {
		name string
		at   time.Time
		show bool
	}{
		{"later the same day", now.Add(14 * time.Hour), false},
		{"the next day", time.Date(2026, 3, 13, 0, 0, 0, 0, time.UTC), true},
	}
	for _, tc := range cases {
		at = tc.at
		page, err := service.ActionItems(context.Background(), alex)
		if err != nil {
			t.Fatal(err)
		}
		if page.Show != tc.show || page.Total != 1 {
			t.Errorf("%s: show %v with %d items, want show %v with 1", tc.name, page.Show, page.Total, tc.show)
		}
	}
	if page, _ := service.ActionItems(context.Background(), priya); !page.Show {
		t.Error("Priya's dialog is hidden by Alex's reminder")
	}
}

func TestActionItems_NeverOpensWithNothingToDo_186(t *testing.T) {
	t.Parallel()
	f := &actionFixture{activities: []Activity{ownActivity("A-1", "submitted", date.MustParse("2026-03-01"), 3)}}
	page, err := f.service(fakeReminders{}, &now).ActionItems(context.Background(), alex)
	if err != nil {
		t.Fatal(err)
	}
	if page.Show || page.Total != 0 || page.Items == nil {
		t.Errorf("show %v with %v, want closed with an empty list", page.Show, page.Items)
	}
}
