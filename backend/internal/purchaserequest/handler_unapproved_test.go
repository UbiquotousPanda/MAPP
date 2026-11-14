package purchaserequest_test

import (
	"net/http"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/approval"
	"mapp/internal/platform/apitest"
	"mapp/internal/purchaserequest"
)

const (
	billboard      = "A-1003"
	approveAgainOn = "Activity 'Billboard winter wave' is no longer approved. The activity must be approved again."
)

// splitRestarting splits a little planned cost off Billboard winter wave, which sends it back to Created.
func splitRestarting(t *testing.T, c *apitest.Client) {
	t.Helper()
	a := decoded[activity.View](t, c.Do(t, http.MethodGet, "/api/v1/activities/"+billboard, nil), http.StatusOK)
	r := c.Do(t, http.MethodPost, "/api/v1/activities/"+billboard+"/split", map[string]any{
		"name": "Billboard part", "initiativeId": a.Initiative.ID, "lineItemIds": []string{}, "plannedCost": "1.00",
		"restartApproval": true, "version": a.Version})
	if r.Status != http.StatusCreated && r.Status != http.StatusOK {
		t.Fatalf("split = %d %s", r.Status, r.Body)
	}
}

func TestUnapprovedActivity_StopsApprovalOfASubmittedPurchaseRequest(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	receiveSwbsCodes(t, s)
	priya, daniel := s.SignIn(t, priyasEmail), s.SignIn(t, danielsEmail)
	pr := create(t, priya, body(standBuild, "EUR", "9200.00"))
	submitted := decoded[purchaserequest.ApprovalView](t, priya.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/submit",
		map[string]any{"version": pr.Version}), http.StatusOK)
	splitRestarting(t, priya)

	round := openRound(t, submitted)
	refused := decoded[apiError](t, daniel.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/approve",
		map[string]any{"roundId": round.ID, "level": round.CurrentLevel}), http.StatusConflict)
	section := decoded[purchaserequest.ApprovalView](t, daniel.Do(t, http.MethodGet, prs+"/"+pr.ID+"/approval", nil), http.StatusOK)
	inbox := decoded[approval.RowPage](t, daniel.Do(t, http.MethodGet, "/api/v1/approvals?tab=waiting", nil), http.StatusOK)
	reasons := map[string]string{}
	for _, row := range inbox.Items {
		reasons[row.Subject.ID] = row.BlockedReason
	}
	after := get(t, priya, pr.ID)

	same(t, "refused approval, approve action, inbox row, status", []any{"not_allowed", approveAgainOn, false, approveAgainOn,
		approveAgainOn, purchaserequest.StatusSubmitted},
		[]any{refused.Error.Code, refused.Error.Message, section.Sections[0].Actions.Approve.Available,
			section.Sections[0].Actions.Approve.Reason, reasons[pr.ID], after.Status})
}

func TestUnapprovedActivity_StopsTheGSAPOrderOfAnApprovedPurchaseRequest(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	pr := approved(t, s)
	priya, lea := s.SignIn(t, priyasEmail), s.SignIn(t, leasEmail)
	splitRestarting(t, priya)

	shown := get(t, lea, pr.ID)
	refused := decoded[apiError](t, lea.Do(t, http.MethodPost, gsapRun+pr.ID+"/purchase-order",
		map[string]any{"version": shown.Version}), http.StatusConflict)

	same(t, "GSAP order", []any{false, approveAgainOn, approveAgainOn},
		[]any{shown.Access.GSAPOrder.Available, shown.Access.GSAPOrder.Reason, refused.Error.Message})
}
