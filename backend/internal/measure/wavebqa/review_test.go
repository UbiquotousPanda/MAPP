package wavebqa_test

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

type reviewRow struct {
	ID         string                  `json:"id"`
	Reason     string                  `json:"reason"`
	Status     string                  `json:"status"`
	Comment    string                  `json:"comment"`
	Candidates []string                `json:"candidates"`
	Faults     []struct{ Code string } `json:"faults"`
	Raw        map[string]string       `json:"raw"`
}

func rowsOf(t *testing.T, who person, query string) map[string]reviewRow {
	t.Helper()
	page := decode[struct{ Items []reviewRow }](t, who.expect(t, get("/performance/review-rows?"+query), http.StatusOK))
	byRef := map[string]reviewRow{}
	for _, row := range page.Items {
		byRef[row.Raw["Ref"]] = row
	}
	return byRef
}

func refsOf(rows map[string]reviewRow) []string {
	refs := []string{}
	for ref := range rows {
		refs = append(refs, ref)
	}
	slices.Sort(refs)
	return refs
}

// TestWaveB_ReviewQueue_046_FR023: every rejected and unmatched row waits with its reason, findable, and is worked.
func TestWaveB_ReviewQueue_046_FR023(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	facts := loadFacts(t, alexSees)
	helix, helixLater := facts.ids[helixFirstHalf], facts.ids[helixSecondHalf]
	alexSees.expect(t, put("/activities/"+helixLater+"/integration-ids/"+facts.source, map[string]string{"value": "helix-2h"}),
		http.StatusCreated)
	run := upload(t, alexSees, facts.source, csvOf("q1,2026-03-02,A-9999,,5,,,",
		fmt.Sprintf("q2,2026-03-02,%s,helix-2h,6,,,", helix), fmt.Sprintf("q3,2026-04-01,%s,,-4,,,", helix)))

	queue := rowsOf(t, alexSees, "importId="+run.ID)
	if len(queue) != 3 || len(queue) != run.Counts.Rejected+run.Counts.Unmatched {
		t.Fatalf("rows to review = %v for %+v, want the three bad rows, none discarded (SC-003)", refsOf(queue), run.Counts)
	}
	reasonsStated(t, queue, helix, helixLater)
	findable(t, alexSees, facts.source)
	byHand := alexSees.send(t, call{method: http.MethodPost, path: "/performance/review-rows",
		body: map[string]string{"reason": "unmatched:unknown"}, opts: []apitest.RequestOption{apitest.SkipValidation()}})
	if byHand.Status < http.StatusBadRequest {
		t.Errorf("POST /performance/review-rows = %d %s, want no row created by hand", byHand.Status, byHand.Body)
	}
	path := "/performance/review-rows/" + queue["q1"].ID
	dismissNeedsComment(t, alexSees, path)
	workTheRow(t, alexSees, path, helix)
	giveMei(t, alexSees, "plans.view", "performance.import")
	if hidden := rowsOf(t, signIn(t, server, mei), "reason=unmatched:disagree")["q2"]; len(hidden.Candidates) != 0 {
		t.Errorf("Mei's q2 = %+v, want it listed with no candidate: both lie outside her scope (046-C15)", hidden)
	}
}

func reasonsStated(t *testing.T, queue map[string]reviewRow, helix, helixLater string) {
	t.Helper()
	candidates := slices.Sorted(slices.Values(queue["q2"].Candidates))
	if queue["q1"].Reason != "unmatched:unknown" || queue["q2"].Reason != "unmatched:disagree" ||
		!slices.Equal(candidates, []string{helix, helixLater}) {
		t.Errorf("q1 %+v, q2 %+v: want an unknown key, and keys disagreeing that name both candidates (FR-019)",
			queue["q1"], queue["q2"])
	}
	if !strings.HasPrefix(queue["q3"].Reason, "rejected:") || len(queue["q3"].Faults) != 2 {
		t.Errorf("q3 = %+v, want rejected with both its faults, the future date and the negative count (FR-011)", queue["q3"])
	}
}

func findable(t *testing.T, alexSees person, sourceID string) {
	t.Helper()
	for query, want := range map[string][]string{
		"reason=unmatched:disagree": {"q2"}, "key=A-9999": {"q1"}, "status=dismissed": {},
		"sourceId=" + sourceID + "&status=open&since=2026-03-12&until=2026-03-12": {"q1", "q2", "q3"},
	} {
		if got := refsOf(rowsOf(t, alexSees, query)); !slices.Equal(got, want) {
			t.Errorf("rows to review with %s = %v, want %v", query, got, want)
		}
	}
}

// dismissNeedsComment keeps out the contract's 422: 046 answers 400 validation_failed (finding 1).
func dismissNeedsComment(t *testing.T, alexSees person, path string) {
	t.Helper()
	bare := alexSees.send(t, call{method: http.MethodPost, path: path + "/dismiss", body: map[string]string{"comment": ""},
		opts: []apitest.RequestOption{apitest.SkipRequestValidation()}})
	if bare.Status < http.StatusBadRequest || bare.Status >= http.StatusInternalServerError ||
		!strings.Contains(string(bare.Body), `"comment"`) {
		t.Errorf("dismiss without a comment = %d %s, want refused naming the comment (FR-024)", bare.Status, bare.Body)
	}
	if row := decode[reviewRow](t, alexSees.expect(t, get(path), http.StatusOK)); row.Status != "open" {
		t.Errorf("after a refused dismissal the row is %s, want open", row.Status)
	}
}

func workTheRow(t *testing.T, alexSees person, path, helix string) {
	t.Helper()
	dismissed := decode[reviewRow](t, alexSees.expect(t, post(path+"/dismiss", map[string]string{"comment": "Test key"}),
		http.StatusOK))
	reopened := decode[reviewRow](t, alexSees.expect(t, post(path+"/reopen", nil), http.StatusOK))
	if dismissed.Status != "dismissed" || dismissed.Comment != "Test key" || reopened.Status != "open" {
		t.Errorf("dismissed %+v, reopened %+v: want the comment kept and the row open again (FR-024)", dismissed, reopened)
	}
	fixed := decode[reviewRow](t, alexSees.expect(t, post(path+"/correct",
		map[string]any{"keys": map[string]string{"activityId": helix}}), http.StatusOK))
	if got := panelOf(t, alexSees, helix).inq(); fixed.Status != "resolved" || got != 705 {
		t.Errorf("corrected to %s: row %s, Helix's INQ %d; want resolved and its 5 INQ counted (700 + 5)", helix, fixed.Status, got)
	}
}
