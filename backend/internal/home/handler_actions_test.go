package home_test

import (
	"net/http"
	"testing"

	"mapp/internal/home"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/date"
)

// Daniel has Trade magazine ads waiting for his approval; Priya owns Declined and incomplete activities.
func TestHomeActionItems_Contract_186(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	daniel := server.SignIn(t, danielsEmail)
	server.GrantRole(t, danielsEmail, "globalPlanner", "all")
	priya := server.SignIn(t, priyasEmail)
	server.GrantRole(t, priyasEmail, "globalPlanner", "all")

	for name, client := range map[string]*apitest.Client{"Daniel": daniel, "Priya": priya} {
		assertOpen(t, name, get[home.ActionItemsPage](t, client, "/api/v1/home/action-items"))
	}

	response := daniel.Do(t, http.MethodPost, "/api/v1/home/action-items/remind-later", nil)
	var reminder home.ReminderView
	response.Decode(t, &reminder)
	if response.Status != http.StatusOK || reminder.HiddenUntil != date.MustParse("2026-03-13") {
		t.Fatalf("remind later = %d %s, want 200 until 13 Mar 2026", response.Status, response.Body)
	}
	if page := get[home.ActionItemsPage](t, daniel, "/api/v1/home/action-items"); page.Show || page.Total == 0 {
		t.Errorf("after Remind me later: show %v with %d items, want hidden with the items still listed", page.Show, page.Total)
	}
	if page := get[home.ActionItemsPage](t, priya, "/api/v1/home/action-items"); !page.Show {
		t.Error("Daniel's reminder hid Priya's pop-up")
	}
}

func assertOpen(t *testing.T, name string, page home.ActionItemsPage) {
	t.Helper()
	if !page.Show || page.Total == 0 || page.Total != len(page.Items) || page.HiddenUntil != nil {
		t.Fatalf("%s: show %v, %d of %d items, hidden until %v; want the pop-up open", name, page.Show, len(page.Items), page.Total, page.HiddenUntil)
	}
	for i, item := range page.Items {
		if i > 0 && item.Overdue && !page.Items[i-1].Overdue {
			t.Errorf("%s: item %d (%s) is overdue after one that is not", name, i, item.Record.ID)
		}
	}
}
