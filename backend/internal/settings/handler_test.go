package settings_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
)

// The handler tests run the real API on the demo data (002 data model §13) and check every request and
// answer against the contract. Seeded Settings may be used by the seeded plans once features 004–007
// report their records, so the tests assert the usage of records they create themselves only.

const (
	alexsEmail   = "alex.morgan@shell.com"
	danielsEmail = "daniel.okoro@shell.com"
)

const (
	modelGoneBody = `{"error":{"code":"not_found","message":"This model no longer exists — someone may have deleted it.","fields":[]}}`
	unusedBody    = `{"inUse":false,"summary":"Not used yet","parts":[],"records":[]}`
	alexAtStart   = `"createdAt":"2026-03-12T09:00:00Z","createdBy":{"id":"U-1001","name":"Alex Morgan"},` +
		`"updatedAt":"2026-03-12T09:00:00Z","updatedBy":{"id":"U-1001","name":"Alex Morgan"}`
)

func TestOverview_API_FR001(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	response := alex.Do(t, http.MethodGet, "/api/v1/settings/overview", nil)

	assertAnswer(t, response, http.StatusOK, `{"models":2,"activityTypes":6,"shellAttributes":56,"currencies":5,"financeBudgetItems":8}`)
}

func mustCreate(t *testing.T, c *apitest.Client, path string, body any) *apitest.Response {
	t.Helper()
	response := c.Do(t, http.MethodPost, path, body)
	if response.Status != http.StatusCreated {
		t.Fatalf("POST %s = %d %s", path, response.Status, response.Body)
	}
	return response
}

func validationBody(fields string) string {
	return `{"error":{"code":"validation_failed","message":"Some fields need your attention.","fields":[` + fields + `]}}`
}

func assertAnswer(t *testing.T, response *apitest.Response, status int, body string) {
	t.Helper()
	if response.Status != status || string(response.Body) != body {
		t.Errorf("answer = %d %s\nwant     %d %s", response.Status, response.Body, status, body)
	}
}

func replace(s, old, new string) string {
	i := index(s, old)
	if i < 0 {
		panic("replace: " + old + " not in " + s)
	}
	return s[:i] + new + s[i+len(old):]
}

func index(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func itoa(n int) string {
	return string(rune('0' + n))
}
