// Package wavebqa is the wave B quality pass of the Measure module (issue #47): 046 to 050 on the Measure demo
// under the demo roles, through the API. A finding goes to docs/sdd/measure-wave-b-qa.md; nothing is fixed here.
package wavebqa_test

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	alex   = "alex.morgan@shell.com"
	carlos = "carlos.mendes@shell.com"
	priya  = "priya.raman@shell.com"
	daniel = "daniel.okoro@shell.com"
	mei    = "mei.lin@shell.com"
	sara   = "sara.novak@shell.com"
	lea    = "lea.santos@shell.com"

	measurePlan     = "FY2026 Measure demo – Lubricants Benelux"
	lubricantsModel = "MOD-1001"

	helixFirstHalf    = "Helix search and social, first half"
	helixSecondHalf   = "Helix search and social, second half"
	tellusCaseStudies = "Tellus case studies"
	fleetExpo         = "Fleet expo Rotterdam"
	workshopRoadshow  = "Workshop roadshow Benelux"
	dealerSummit      = "Dealer summit"
	socialAlwaysOn    = "Social always-on"
	grandOpening      = "Grand opening Shanghai"

	factsHeader = "Ref,Date,Activity,Feed id,INQ,MQL,Revenue,Currency"
	measureFeed = "Measure demo feed"

	// The seed's INQ (seed/measure.json, feed): Helix first half 600 + 650 + 200 + 1, Tellus case studies 60 + 120 + 40 + 1.
	seededHelixINQ  = 1451
	seededTellusINQ = 221
)

type person struct {
	client *apitest.Client
	email  string
}

func signIn(t *testing.T, server *apitest.Server, email string) person {
	t.Helper()
	return person{client: server.SignIn(t, email), email: email}
}

type call struct {
	method, path string
	body         any
	opts         []apitest.RequestOption
}

func get(path string) call {
	return call{method: http.MethodGet, path: path}
}

func post(path string, body any) call {
	return call{method: http.MethodPost, path: path, body: body}
}

func (p person) send(t *testing.T, c call) *apitest.Response {
	t.Helper()
	return p.client.Do(t, c.method, "/api/v1"+c.path, c.body, c.opts...)
}

// expect stops the test unless the request answers want: what follows it depends on the answer.
func (p person) expect(t *testing.T, c call, want int) *apitest.Response {
	t.Helper()
	got := p.send(t, c)
	if got.Status != want {
		t.Fatalf("%s: %s %s = %d %s, want %d", p.email, c.method, c.path, got.Status, got.Body, want)
	}
	return got
}

func decode[T any](t *testing.T, r *apitest.Response) T {
	t.Helper()
	var v T
	r.Decode(t, &v)
	return v
}

// demoIDs maps every activity name Alex can see to its ID, so the tests read as the checklist does.
func demoIDs(t *testing.T, alexSees person) map[string]string {
	t.Helper()
	type named struct{ ID, Name string }
	plans := decode[struct{ Items []named }](t, alexSees.expect(t, get("/plans"), http.StatusOK))
	ids := map[string]string{}
	for _, plan := range plans.Items {
		page := alexSees.expect(t, get("/plans/"+plan.ID+"/activities"), http.StatusOK)
		for _, a := range decode[struct{ Items []named }](t, page).Items {
			ids[a.Name] = a.ID
		}
	}
	return ids
}

type counts struct {
	Read, Matched, Held, Unattributed, Rejected, Unmatched int
}

func (c counts) outcomes() int {
	return c.Matched + c.Held + c.Unattributed + c.Rejected + c.Unmatched
}

type load struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	Counts    counts `json:"counts"`
	Breakdown []struct {
		Stage  string `json:"stage"`
		Counts counts `json:"counts"`
	} `json:"breakdown"`
}

func upload(t *testing.T, who person, sourceID, file string) load {
	t.Helper()
	body := map[string]string{"fileName": "measure-demo.csv", "content": encoded(file)}
	return decode[load](t, who.expect(t, post("/performance/sources/"+sourceID+"/uploads", body), http.StatusCreated))
}

func encoded(file string) string {
	return base64.StdEncoding.EncodeToString([]byte(file))
}

func csvOf(rows ...string) string {
	return factsHeader + "\n" + strings.Join(rows, "\n") + "\n"
}

type demoFacts struct {
	ids    map[string]string
	source string
	first  load
}

// demoFeed is the seeded Measure demo feed, the one active source of Lubricants 1.0's INQ, MQL and revenue: 046
// refuses a second, so every check loads its own rows through it, beside the seeded ones.
func demoFeed(t *testing.T, who person) string {
	t.Helper()
	sources := decode[struct{ Items []struct{ ID, Name string } }](t, who.expect(t, get("/performance/sources"), http.StatusOK))
	for _, s := range sources.Items {
		if s.Name == measureFeed {
			return s.ID
		}
	}
	t.Fatalf("no source %q in %+v", measureFeed, sources.Items)
	return ""
}

// loadFacts adds four rows to the seeded facts: three for approved activities, one for Fleet expo Rotterdam, Submitted.
func loadFacts(t *testing.T, alexSees person) demoFacts {
	t.Helper()
	ids, source := demoIDs(t, alexSees), demoFeed(t, alexSees)
	first := upload(t, alexSees, source, csvOf(
		fmt.Sprintf("h1,2026-01-31,%s,,400,40,25000.00,USD", ids[helixFirstHalf]),
		fmt.Sprintf("h2,2026-02-28,%s,,300,30,,", ids[helixFirstHalf]),
		fmt.Sprintf("t1,2026-02-15,%s,,150,15,,", ids[tellusCaseStudies]),
		fmt.Sprintf("f1,2026-03-01,%s,,100,10,8000.00,USD", ids[fleetExpo])))
	return demoFacts{ids: ids, source: source, first: first}
}

type panel struct {
	State  string `json:"state"`
	Stages []struct {
		Stage  string `json:"stage"`
		Actual *int64 `json:"actual"`
	} `json:"stages"`
	Revenue struct {
		Actual *struct{ Amount string } `json:"actual"`
		Reason string                   `json:"reason"`
	} `json:"revenue"`
}

func panelOf(t *testing.T, who person, activityID string) panel {
	t.Helper()
	return decode[panel](t, who.expect(t, get("/activities/"+activityID+"/performance"), http.StatusOK))
}

// inq is the INQ actual, -1 when the panel has none: a missing figure is never 0 (FR-032).
func (p panel) inq() int64 {
	for _, s := range p.Stages {
		if s.Stage == "inq" && s.Actual != nil {
			return *s.Actual
		}
	}
	return -1
}
