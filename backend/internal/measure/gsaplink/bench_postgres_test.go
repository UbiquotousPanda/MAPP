package gsaplink_test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/apibench"
	"mapp/internal/platform/ids"
	"mapp/internal/purchaserequest"
	"mapp/internal/stores"
)

const (
	waitingLines    = 20_000
	linesPerRequest = 4
	volumePlans     = "Volume Lubricants"
	volumeYear      = 2026
)

type benchPage struct {
	name, who, path string
}

// BenchmarkGsapLinkOnPostgres_SC001 sends each tab's requests to the API on PostgreSQL, holding the demo data and then
// 028's volume with 20,000 purchase-request lines waiting for GSAP, and reports the time and statements of each.
func BenchmarkGsapLinkOnPostgres_SC001(b *testing.B) {
	for _, data := range []apibench.Data{apibench.Demo, apibench.Volume} {
		b.Run(string(data), func(b *testing.B) {
			server := onPostgres(b, data)
			if data == apibench.Volume {
				routeRequests(b, server)
			}
			clients := map[string]*apibench.Client{alex: server.SignIn(b, alex), priya: server.SignIn(b, priya)}
			for _, p := range gsapLinkPages() {
				b.Run(p.name, func(b *testing.B) { clients[p.who].Measure(b, http.MethodGet, p.path, nil) })
			}
		})
	}
}

func gsapLinkPages() []benchPage {
	return []benchPage{
		{"frame", alex, "/api/v1/reports/frame?report=gsapLink&year=2026"},
		{"swbs", alex, report + "&tab=swbs"},
		{"waiting", alex, report + "&tab=waiting"},
		{"orders", alex, report + "&tab=orders"},
		{"waiting one market", priya, report + "&tab=waiting"},
		{"waiting sorted page 2", alex, report + "&tab=waiting&sort=amount&page=2"},
		{"export xlsx", alex, exported + "&format=xlsx"},
	}
}

func onPostgres(b *testing.B, data apibench.Data) *apibench.Server {
	b.Helper()
	if testing.Short() || os.Getenv("TEST_DATABASE_URL") == "" {
		b.Skip("needs PostgreSQL at TEST_DATABASE_URL, and no -short")
	}
	return apibench.New(b, data)
}

type planItems struct {
	planID      string
	lineItemIDs []string
}

type router struct {
	ctx       context.Context
	b         *testing.B
	set       stores.Set
	generator *ids.Generator
	template  purchaserequest.PurchaseRequest
}

func routeRequests(b *testing.B, server *apibench.Server) {
	b.Helper()
	set := server.Set()
	template, found, err := set.PurchaseRequests.Get(b.Context(), routedRequest)
	if err != nil || !found || len(template.Lines) == 0 {
		b.Fatalf("the demo purchase request %s: found %v, %v", routedRequest, found, err)
	}
	plans := volumeLineItems(b, server)
	err = set.Tx.Write(b.Context(), func(ctx context.Context) error {
		r := router{ctx: ctx, b: b, set: set, generator: ids.NewGenerator(set.Counters), template: template}
		return r.routeAll(plans)
	})
	if err != nil {
		b.Fatalf("routing the volume's purchase requests: %v", err)
	}
}

func volumeLineItems(b *testing.B, server *apibench.Server) []planItems {
	b.Helper()
	set := server.Set()
	all, err := set.Plans.List(b.Context())
	if err != nil {
		b.Fatal(err)
	}
	var plans []planItems
	for _, p := range all {
		if p.Year != volumeYear || !strings.HasPrefix(p.Name, volumePlans) {
			continue
		}
		items, listErr := set.LineItems.ListByActivities(b.Context(), server.ActivityIDs(b, p.ID))
		if listErr != nil {
			b.Fatal(listErr)
		}
		found := planItems{planID: p.ID}
		for _, li := range items {
			found.lineItemIDs = append(found.lineItemIDs, li.ID)
		}
		plans = append(plans, found)
	}
	return plans
}

func (r router) routeAll(plans []planItems) error {
	sent := 0
	for _, p := range plans {
		for from := 0; from+linesPerRequest <= len(p.lineItemIDs) && sent < waitingLines; from += linesPerRequest {
			if err := r.route(p.planID, p.lineItemIDs[from:from+linesPerRequest], sent/linesPerRequest); err != nil {
				return err
			}
			sent += linesPerRequest
		}
	}
	if sent < waitingLines {
		return fmt.Errorf("the volume has line items for %d waiting lines, want %d", sent, waitingLines)
	}
	return nil
}

func (r router) route(planID string, lineItemIDs []string, n int) error {
	pr := r.template
	pr.ID, pr.PlanID, pr.Name = r.next(ids.PrefixPurchaseRequest), planID, fmt.Sprintf("Volume waiting %04d", n)
	pr.Status, pr.ChangePending, pr.ClosedAt, pr.Lines = purchaserequest.StatusApproved, false, nil, nil
	sentAt := seededAt.Add(-time.Duration(n) * time.Hour)
	approved := purchaserequest.Version{Name: pr.Name, OwnerID: pr.OwnerID, MoAApproverID: pr.MoAApproverID,
		Attributes: pr.Attributes, Vendor: pr.Vendor, ApprovedAt: sentAt.Add(-time.Hour)}
	for i, lineItemID := range lineItemIDs {
		l := r.template.Lines[0]
		l.ID, l.PurchaseRequestID, l.Position, l.LineItemID = r.next(ids.PrefixPurchaseRequestLine), pr.ID, i+1, lineItemID
		l.PO = purchaserequest.PurchaseOrderLine{}
		pr.Lines = append(pr.Lines, l)
		approved.Lines = append(approved.Lines, purchaserequest.VersionLine{ID: l.ID, LineItemID: lineItemID,
			Currency: l.Currency, Amount: l.Amount, DeliveryDate: l.DeliveryDate, Attributes: l.Attributes})
	}
	pr.Approved = &approved
	if err := r.set.PurchaseRequests.Put(r.ctx, pr); err != nil {
		return err
	}
	return r.set.PurchaseRequests.AddRouting(r.ctx, purchaserequest.Routing{
		ID: r.next(ids.PrefixPurchaseRequestRouting), PurchaseRequestID: pr.ID, Type: purchaserequest.RoutingOriginal,
		RoutedAt: sentAt, RoutedBy: actor.System, Recipients: []string{"requisitioner@shell.com"},
		Form: []purchaserequest.FormRow{{PurchaseRequestID: pr.ID}},
	})
}

func (r router) next(prefix string) string {
	id, err := r.generator.Next(r.ctx, prefix)
	if err != nil {
		r.b.Fatalf("next %s: %v", prefix, err)
	}
	return id
}
