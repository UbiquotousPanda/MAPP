package wavebqa_test

import (
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

func activityReads(activityID string) []string {
	base := "/activities/" + activityID
	return []string{base + "/performance", base + "/performance/facts", base + "/performance/sources",
		base + "/integration-ids", base + "/external-name-aliases", base + "/media-codes"}
}

func withExport(activityID string) []string {
	return append(activityReads(activityID), "/activities/"+activityID+"/performance/facts/export")
}

type errorBody struct {
	Error struct{ Code, Message string } `json:"error"`
}

// sight is who reads which activities; each sends every path of every activity as that person.
type sight map[string][]string

func (s sight) each(t *testing.T, server *apitest.Server, paths func(string) []string,
	check func(who, path string, r *apitest.Response)) {
	t.Helper()
	for who, activities := range s {
		p := signIn(t, server, who)
		for _, id := range activities {
			for _, path := range paths(id) {
				check(who, path, p.send(t, get(path)))
			}
		}
	}
}

// TestWaveB_PerformanceScope_046_FR044: outside a scope (an approver sees what he approves) answers as missing.
func TestWaveB_PerformanceScope_046_FR044(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	facts := loadFacts(t, signIn(t, server, alex))
	measure, lubricants, mobility := facts.ids[helixFirstHalf], facts.ids[socialAlwaysOn], facts.ids[grandOpening]
	missing := decode[errorBody](t, signIn(t, server, alex).expect(t, get("/activities/A-9999/performance"), http.StatusNotFound))

	hidden := sight{priya: {measure, mobility}, daniel: {facts.ids[dealerSummit], mobility}, mei: {measure, lubricants},
		sara: {measure}}
	hidden.each(t, server, withExport, func(who, path string, r *apitest.Response) {
		if r.Status != http.StatusNotFound || decode[errorBody](t, r) != missing {
			t.Errorf("%s GET %s = %d %s, want 404 as for an activity that does not exist", who, path, r.Status, r.Body)
		}
	})
	seen := sight{alex: {measure, lubricants, mobility}, carlos: {measure, lubricants, mobility},
		lea: {measure, lubricants, mobility}, priya: {lubricants}, daniel: {lubricants, measure}, mei: {mobility},
		sara: {lubricants, mobility}}
	seen.each(t, server, activityReads, func(who, path string, r *apitest.Response) {
		if r.Status != http.StatusOK {
			t.Errorf("%s GET %s = %d %s, want 200: the activity is in scope", who, path, r.Status, r.Body)
		}
	})
}

// TestWaveB_ExportRights_FR022: the 046 part; Summary, Revenue and Funnel stages join when 048 and 049 land.
func TestWaveB_ExportRights_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	facts := loadFacts(t, signIn(t, server, alex))
	export := get("/activities/" + facts.ids[helixFirstHalf] + "/performance/facts/export")

	file := signIn(t, server, alex).expect(t, export, http.StatusOK)
	lines := strings.Split(strings.TrimSpace(string(file.Body)), "\n")
	if !strings.HasPrefix(lines[0], "Date,Source,Stage or metric,Value,Currency") || len(lines) != 1+5 {
		t.Errorf("Alex's facts export = %q, want the header and Helix's five facts (two INQ, two MQL, one revenue)", lines)
	}
	if r := signIn(t, server, lea).send(t, export); r.Status != http.StatusForbidden {
		t.Errorf("Lea exporting the facts = %d %s, want 403: no data.export", r.Status, r.Body)
	}
}
