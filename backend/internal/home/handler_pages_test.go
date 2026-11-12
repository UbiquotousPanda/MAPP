package home_test

import (
	"net/http"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/approval"
	"mapp/internal/home"
	"mapp/internal/platform/apitest"
)

// Each attention row shows its page's fields still needed, line items needing attention and overspend.
func TestHome_PersonalCardsEqualTheirPages_SC002_FR017(t *testing.T) { //nolint:gocyclo // 14: every person, each card compared with its own page
	t.Parallel()
	server := apitest.New(t)
	for _, email := range everyone {
		client := server.SignIn(t, email)
		waiting := get[home.WaitingPage](t, client, "/api/v1/home/waiting")
		tab := get[approval.RowPage](t, client, "/api/v1/approvals?tab=waiting", apitest.SkipValidation())
		if waiting.Total != tab.Total {
			t.Errorf("%s: %d waiting, Approvals tab %d", email, waiting.Total, tab.Total)
		}
		for i, item := range waiting.Items {
			if item.ID != tab.Items[i].Activity.ID {
				t.Errorf("%s: waiting row %d is %s, Approvals tab %s", email, i, item.ID, tab.Items[i].Activity.ID)
			}
		}

		attention := get[home.HomeAttentionPage](t, client, "/api/v1/home/attention")
		for _, item := range attention.Items {
			if item.RecordType != "activity" {
				continue
			}
			page := get[activity.View](t, client, "/api/v1/activities/"+item.ID, apitest.SkipValidation())
			for _, reason := range item.Reasons {
				switch reason.Kind {
				case "missingFields":
					if len(reason.Missing) != page.Completeness.MissingFields || reason.ItemsBelow != page.Completeness.LineItemsNeedingAttention {
						t.Errorf("%s: %s needs %d fields and %d line items, its page %+v", email, item.ID, len(reason.Missing),
							reason.ItemsBelow, page.Completeness)
					}
				case "negativeBalance":
					if page.UnassignedPlannedCost == nil || reason.Amount.Amount != page.UnassignedPlannedCost.Amount.Neg() {
						t.Errorf("%s: %s exceeds by %v, its page %v", email, item.ID, reason.Amount, page.UnassignedPlannedCost)
					}
				}
			}
		}
	}
}

func TestHome_MyActivitiesEqualTheirPages_SC002_FR017(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	for _, email := range everyone {
		client := server.SignIn(t, email)
		view := get[home.MyActivitiesView](t, client, "/api/v1/home/my-activities")
		summary := get[home.SummaryView](t, client, "/api/v1/home/summary?scope=myTeams")
		if view.Total != summary.ActivitiesOwned.Count {
			t.Errorf("%s: My activities %d, card %d", email, view.Total, summary.ActivitiesOwned.Count)
		}
		for _, g := range view.Groups {
			for _, row := range g.Items {
				page := get[activity.View](t, client, "/api/v1/activities/"+row.ID, apitest.SkipValidation())
				// Home adds up plans in the display currency, so it shows the page's display amount.
				if row.Status != string(page.DisplayStatus) || !same(row.PlannedCost, page.Display.PlannedCost) ||
					len(row.Missing) != page.Completeness.MissingFields || row.ItemsBelow != page.Completeness.LineItemsNeedingAttention {
					t.Errorf("%s: %+v\nits page: %s, %v, %+v", email, row, page.DisplayStatus, page.PlannedCost, page.Completeness)
				}
			}
		}
	}
}

// Once Priya deletes Launch film, it leaves her cards, My activities, Needs your attention and her plan's row.
func TestHome_DeletedRecordsNeverCount_FR019(t *testing.T) { //nolint:gocyclo // 14: one delete, then every card that must lose the record
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	deleted := priya.DeleteSeen(t, "/api/v1/activities/A-1001")
	if deleted.Status != http.StatusOK {
		t.Fatalf("DELETE /api/v1/activities/A-1001 = %d %s", deleted.Status, deleted.Body)
	}
	summary := get[home.SummaryView](t, priya, "/api/v1/home/summary?scope=myTeams")
	view := get[home.MyActivitiesView](t, priya, "/api/v1/home/my-activities")
	attention := get[home.HomeAttentionPage](t, priya, "/api/v1/home/attention")
	rows := get[home.PlanPage](t, priya, "/api/v1/home/plans?scope=myTeams")

	// Priya also owns the two activities of the GBP plan P-1004 (016): 65,000.00 GBP = 86,666.67 USD.
	if summary.ActivitiesOwned.Count != 8 || view.Total != 8 || summary.PlannedCost.PlannedCost != usd(t, "426666.67") {
		t.Errorf("after the delete: %d owned, %d in My activities, planned %v; want 8, 8 and 426,666.67 USD",
			summary.ActivitiesOwned.Count, view.Total, summary.PlannedCost.PlannedCost)
	}
	for _, item := range attention.Items {
		if item.ID == "A-1001" {
			t.Errorf("Needs your attention still lists the deleted Launch film: %+v", item)
		}
	}
	var lubricants *home.PlanRow
	for i := range rows.Items {
		if rows.Items[i].ID == "P-1001" {
			lubricants = &rows.Items[i]
		}
	}
	if len(rows.Items) != 2 || lubricants == nil || lubricants.ActivityCount != 6 || lubricants.PlannedCost == nil ||
		*lubricants.PlannedCost != usd(t, "340000.00") {
		t.Errorf("plan rows = %+v, want P-1001 with 6 activities and 340,000.00 USD (and P-1004)", rows.Items)
	}
}
