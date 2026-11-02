package app_test

import (
	"net/http"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/platform/apitest"
	"mapp/internal/platform/date"
	"mapp/internal/widgetdata"
)

const helixUK = "C-1005"

// startHelixUKIn2026 moves the FY2027 campaign's start into 2026, which a campaign may do (only flagged); the
// body sends only the fields that change.
func startHelixUKIn2026(t *testing.T, priya *apitest.Client) {
	t.Helper()
	var stored struct {
		Name    string `json:"name"`
		EndDate string `json:"endDate"`
		Version int    `json:"version"`
	}
	priya.Do(t, http.MethodGet, "/api/v1/campaigns/"+helixUK, nil).Decode(t, &stored)
	answer := priya.Do(t, http.MethodPatch, "/api/v1/campaigns/"+helixUK, map[string]any{
		"version": stored.Version, "name": stored.Name, "startDate": "2026-11-01", "endDate": stored.EndDate,
	}, apitest.SkipRequestValidation())
	if answer.Status != http.StatusOK {
		t.Fatalf("PATCH %s = %d %s", helixUK, answer.Status, answer.Body)
	}
}

func TestQuery_DateRangeCountsRecordsOfPlansOfAnotherYear_FR022(t *testing.T) {
	t.Parallel()
	priya := apitest.New(t).SignIn(t, priyasEmail)
	startHelixUKIn2026(t, priya)
	from, to := date.New(2026, 11, 1), date.New(2026, 12, 31)
	r := widgetdata.Request{Type: "table", Query: widgetdata.Query{
		Source: "campaigns", Dimension: &widgetdata.GroupBy{Field: "plan"}, Measures: []widgetdata.Measure{measure("count", "")},
		Filters: []widgetdata.Filter{}, Sort: widgetdata.Sort{By: "dimension", Direction: "asc"}, Limit: 50,
	}, Filters: &widgetdata.Filters{DateFrom: &from, DateTo: &to, PlanIDs: []string{}, TeamIDs: []string{}}}

	data := ask(t, priya, r, http.StatusOK)

	if diff := cmp.Diff([]string{lubricantsUK}, groupLabels(data)); diff != "" {
		t.Errorf("campaigns starting in Nov–Dec 2026 by plan (-want +got):\n%s", diff)
	}
}
