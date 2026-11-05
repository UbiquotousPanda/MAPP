package approval_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
)

type lineItemList struct {
	Items []struct {
		ID         string `json:"id"`
		Approval   string `json:"approval"`
		SwbsStatus string `json:"swbsStatus"`
	} `json:"items"`
}

func lineItemsOf(t *testing.T, c *apitest.Client, activityID string) lineItemList {
	t.Helper()
	response := c.Do(t, http.MethodGet, "/api/v1/activities/"+activityID+"/line-items", nil)
	var list lineItemList
	response.Decode(t, &list)
	return list
}

func TestApproveWithLineItemUnticked_ThenSendIt_Contract_053(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	daniel, priya := server.SignIn(t, danielsEmail), server.SignIn(t, priyasEmail)
	before := decodeApproval(t, daniel.Do(t, http.MethodGet, "/api/v1/activities/"+tradeMagazineAds+"/approval", nil))
	items := lineItemsOf(t, priya, tradeMagazineAds).Items
	if len(before.LineItems) != len(items) {
		t.Fatalf("US1 scenario 1: the round lists %d line items, want all %d", len(before.LineItems), len(items))
	}

	approved := decodeApproval(t, daniel.Do(t, http.MethodPost, "/api/v1/activities/"+tradeMagazineAds+"/approval/approve",
		map[string]any{"roundId": before.Rounds[0].ID, "level": 1, "approvedLineItemIds": []string{}}))

	after := lineItemsOf(t, priya, tradeMagazineAds).Items
	if len(after) != 1 {
		t.Fatalf("line items = %+v, want one", after)
	}
	type outcome struct {
		status, approval, swbs string
		send                   bool
	}
	got := outcome{approved.Status, after[0].Approval, after[0].SwbsStatus, approved.Actions.SendLineItems.Available}
	if want := (outcome{"approved", "notApproved", "waitingForApproval", true}); got != want {
		t.Fatalf("US1 scenarios 2 and 4, US2 scenario 2: %+v, want %+v", got, want)
	}
	sent := decodeApproval(t, priya.Do(t, http.MethodPost, "/api/v1/activities/"+tradeMagazineAds+"/approval/submit",
		map[string]any{"version": approved.ActivityVersion}))
	if sent.Status != "approved" || len(sent.Rounds[0].LineItemIDs) != 1 || sent.Rounds[0].LineItemIDs[0] != items[0].ID {
		t.Errorf("US2 scenario 3: activity %s, round's line items %v; want still Approved, a round for %s", sent.Status,
			sent.Rounds[0].LineItemIDs, items[0].ID)
	}
}

func TestApproveSomeLineItems_StaleSelectionRefused_Contract_053_FR002(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	daniel := server.SignIn(t, danielsEmail)
	before := decodeApproval(t, daniel.Do(t, http.MethodGet, "/api/v1/activities/"+tradeMagazineAds+"/approval", nil))

	refused := daniel.Do(t, http.MethodPost, "/api/v1/activities/"+tradeMagazineAds+"/approval/approve",
		map[string]any{"roundId": before.Rounds[0].ID, "level": 1, "approvedLineItemIds": []string{"L-9999"}})

	if refused.Status != http.StatusBadRequest {
		t.Errorf("status = %d %s, want 400", refused.Status, refused.Body)
	}
}
