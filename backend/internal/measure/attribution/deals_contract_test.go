package attribution_test

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"testing"

	"mapp/internal/platform/apitest"
)

func TestRevenueDealsContract_058_FR024(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alex, priya := server.SignIn(t, "alex.morgan@shell.com"), server.SignIn(t, "priya.raman@shell.com")
	webinar := demoActivityID(t, alex, "Tellus webinar series")
	path := "/api/v1/reports/revenue/activities/" + webinar + "/deals?year=2026"

	r := alex.Do(t, http.MethodGet, path, nil)
	if r.Status != http.StatusOK {
		t.Fatalf("Alex opens the webinar's deals = %d %s", r.Status, r.Body)
	}
	if got := dealsAnswer(t, r.Body); got != "18702.90 equallyDistributed 2 deals" {
		t.Errorf("webinar = %s; want 18702.90 equallyDistributed 2 deals (D-400)", got)
	}

	skip := apitest.SkipRequestValidation()
	refusals := []struct {
		name   string
		client *apitest.Client
		path   string
		want   int
	}{
		{"an unknown comparison model", alex, path + "&compare=halfLife", http.StatusBadRequest},
		{"page 0", alex, path + "&page=0", http.StatusBadRequest},
		{"an unknown activity", alex, "/api/v1/reports/revenue/activities/A-9999/deals?year=2026", http.StatusNotFound},
		{"Priya, whose teams don't hold the Measure demo plan", priya, path, http.StatusNotFound},
	}
	for _, tt := range refusals {
		if r := tt.client.Do(t, http.MethodGet, tt.path, nil, skip); r.Status != tt.want {
			t.Errorf("%s = %d, want %d", tt.name, r.Status, tt.want)
		}
	}
}

func dealsAnswer(t *testing.T, body []byte) string {
	t.Helper()
	var out struct {
		Credited struct{ Amount string } `json:"credited"`
		Model    struct{ Key string }    `json:"model"`
		Deals    []json.RawMessage       `json:"deals"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return out.Credited.Amount + " " + out.Model.Key + " " + strconv.Itoa(len(out.Deals)) + " deals"
}

func demoActivityID(t *testing.T, client *apitest.Client, name string) string {
	t.Helper()
	r := client.Do(t, http.MethodGet, "/api/v1/reports/revenue/ranked?year=2026&show=activity&q="+url.QueryEscape(name), nil)
	if r.Status != http.StatusOK {
		t.Fatalf("ranked list = %d %s", r.Status, r.Body)
	}
	var ranked struct {
		Groups []struct {
			Entries []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"entries"`
		} `json:"groups"`
	}
	if err := json.Unmarshal(r.Body, &ranked); err != nil {
		t.Fatalf("decode the ranked list: %v", err)
	}
	for _, g := range ranked.Groups {
		for _, e := range g.Entries {
			if e.Name == name {
				return e.ID
			}
		}
	}
	t.Fatalf("no activity named %q in the ranked list", name)
	return ""
}
