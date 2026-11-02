package seed_test

import (
	"net/http"
	"slices"
	"testing"

	"mapp/internal/measure/gsaplink"
	"mapp/internal/measure/purchasereport"
	"mapp/internal/platform/apitest"
	"mapp/internal/purchaserequest"
)

const (
	alexEmail   = "alex.morgan@shell.com"
	carlosEmail = "carlos.mendes@shell.com"

	prCreated   = "PR for Social media, second half"
	prSubmitted = "PR for Webinar speaker fees"
	prInReview  = "PR for Search media, first half – extra flights"
	prDeclined  = "PR for Search media, second half – trial"
	prWaiting   = "PR for Search media, second half"
	prOrdered   = "PR for Search media, first half"
	prClosed    = "PR for Case study production"
)

// measurePRs serves the Measure demo and names its purchase requests' IDs.
func measurePRs(t *testing.T) (*apitest.Server, map[string]string) {
	t.Helper()
	db := apitest.MeasureDemoDB(t)
	byName := map[string]string{}
	for _, pr := range demoIn(t, db).purchaseRequests {
		byName[pr.Name] = pr.ID
	}
	return apitest.New(t, apitest.WithDB(db)), byName
}

// Each purchase request of the Measure demo opens with its status, approval section and routed PR forms.
func TestMeasurePurchases_EveryStatusOpens(t *testing.T) {
	t.Parallel()
	server, ids := measurePRs(t)
	want := map[string]purchaserequest.Status{
		prCreated: purchaserequest.StatusCreated, prSubmitted: purchaserequest.StatusSubmitted,
		prInReview: purchaserequest.StatusInReview, prDeclined: purchaserequest.StatusDeclined,
		prWaiting: purchaserequest.StatusApproved, prOrdered: purchaserequest.StatusApproved, prClosed: purchaserequest.StatusClosed,
	}
	for _, email := range []string{alexEmail, carlosEmail} {
		person := server.SignIn(t, email)
		for name, status := range want {
			var view purchaserequest.View
			person.Do(t, http.MethodGet, "/api/v1/purchase-requests/"+ids[name], nil).Decode(t, &view)
			if view.Status != status {
				t.Errorf("%s sees %s %q as %s, want %s", email, ids[name], name, view.Status, status)
			}
			if r := person.Do(t, http.MethodGet, "/api/v1/purchase-requests/"+ids[name]+"/approval", nil); r.Status != http.StatusOK {
				t.Errorf("%s: approval of %q = %d %s", email, name, r.Status, r.Body)
			}
			for _, routing := range view.Routings {
				path := "/api/v1/purchase-requests/" + ids[name] + "/routings/" + routing.ID + "/form?format=csv"
				if r := person.Do(t, http.MethodGet, path, nil, apitest.SkipValidation()); r.Status != http.StatusOK {
					t.Errorf("%s: PR form of %q routing %s = %d %s", email, name, routing.Type, r.Status, r.Body)
				}
			}
		}
	}
}

// The approved, routed and ordered requests carry what GSAP answered: a PR number on the ordered and closed ones only.
func TestMeasurePurchases_GsapAnswers(t *testing.T) {
	t.Parallel()
	server, ids := measurePRs(t)
	carlos := server.SignIn(t, carlosEmail)

	for name, want := range map[string]struct{ routings, waiting, numbered bool }{
		prWaiting: {true, true, false}, prOrdered: {true, false, true}, prClosed: {true, false, true},
		prSubmitted: {false, false, false},
	} {
		var view purchaserequest.View
		carlos.Do(t, http.MethodGet, "/api/v1/purchase-requests/"+ids[name], nil).Decode(t, &view)
		if got := (struct{ routings, waiting, numbered bool }{len(view.Routings) > 0, view.WaitingForGSAP,
			view.GSAPPRNumber != ""}); got != want {
			t.Errorf("%q routed, waiting for GSAP, numbered = %+v, want %+v", name, got, want)
		}
	}
}

// Carlos decides the Submitted request at its first level; the In review one waits for Alex at level 2 of 2.
func TestMeasurePurchases_WaitForTheirApprovers(t *testing.T) {
	t.Parallel()
	server, ids := measurePRs(t)

	waiting := func(email string) map[string][2]int {
		var page struct {
			Items []struct {
				Subject struct{ ID string }
				Round   struct{ CurrentLevel, LevelCount int }
			}
		}
		server.SignIn(t, email).Do(t, http.MethodGet, "/api/v1/approvals?tab=waiting", nil).Decode(t, &page)
		rows := map[string][2]int{}
		for _, row := range page.Items {
			rows[row.Subject.ID] = [2]int{row.Round.CurrentLevel, row.Round.LevelCount}
		}
		return rows
	}
	if got, found := waiting(carlosEmail)[ids[prSubmitted]]; !found || got != [2]int{1, 1} {
		t.Errorf("Carlos's waiting row for %q = %v (listed %v), want level 1 of 1", prSubmitted, got, found)
	}
	if got, found := waiting(alexEmail)[ids[prInReview]]; !found || got != [2]int{2, 2} {
		t.Errorf("Alex's waiting row for %q = %v (listed %v), want level 2 of 2", prInReview, got, found)
	}
}

// The GSAP link lists the routed request without a PR number as waiting, and the purchase orders with their invoices.
func TestMeasurePurchases_InTheGsapLink(t *testing.T) {
	t.Parallel()
	server, ids := measurePRs(t)
	carlos := server.SignIn(t, carlosEmail)

	var waiting gsaplink.Report
	carlos.Do(t, http.MethodGet, "/api/v1/reports/gsap-link?year=2026&tab=waiting", nil).Decode(t, &waiting)
	var listed []string
	for _, row := range waiting.Waiting.Rows {
		listed = append(listed, row.PurchaseRequestID)
	}
	if !slices.Contains(listed, ids[prWaiting]) || slices.Contains(listed, ids[prOrdered]) {
		t.Errorf("waiting for GSAP = %v, want %s (%q) and not %s", listed, ids[prWaiting], prWaiting, ids[prOrdered])
	}

	var orders gsaplink.Report
	carlos.Do(t, http.MethodGet, "/api/v1/reports/gsap-link?year=2026&tab=orders&pageSize=100", nil).Decode(t, &orders)
	invoiced := map[string]bool{}
	for _, row := range orders.Orders.Rows {
		invoiced[row.PurchaseRequestID] = row.Invoiced.Amount.Sign() > 0
	}
	if !invoiced[ids[prOrdered]] || !invoiced[ids[prClosed]] {
		t.Errorf("orders invoiced by purchase request = %v, want %s and %s with their invoices", invoiced, ids[prOrdered],
			ids[prClosed])
	}
}

// The Purchase requests report of 2026 has the Measure demo's requests in each of the six statuses.
func TestMeasurePurchases_InEveryStatusOfTheReport(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, alexEmail)

	var view purchasereport.View
	alex.Do(t, http.MethodGet, "/api/v1/reports/purchase-requests?year=2026", nil).Decode(t, &view)
	for _, item := range view.StatusMix.Items {
		if item.Count == 0 {
			t.Errorf("status %s has no purchase request, want the Measure demo in every status: %+v", item.Status,
				view.StatusMix.Items)
		}
	}
	if view.StatusMix.WaitingForGSAP != 1 || view.Cards.Invoiced == nil || view.Cards.Invoiced.Amount.Sign() <= 0 {
		t.Errorf("waiting for GSAP %d, invoiced %v; want 1 and the invoices", view.StatusMix.WaitingForGSAP, view.Cards.Invoiced)
	}
}
