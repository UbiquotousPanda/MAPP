package people_test

import (
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"

	"mapp/internal/people"
	"mapp/internal/platform/apitest"
)

const priyasEmail = "priya.raman@shell.com"

const (
	signInRequiredBody = `{"error":{"code":"sign_in_required","message":"Please sign in to continue.","fields":[]}}`
	sessionExpiredBody = `{"error":{"code":"session_expired","message":"Please sign in again","fields":[]}}`
)

const (
	defaultPreferencesBody = `{"theme":"system","sidebarCollapsed":false,"displayCurrency":"USD","dateFormat":"DD MMM YYYY","homeScope":"myTeams","historyIncludeInside":false,"pinnedPlanIds":[]}`
	lubricantsEuropeBody   = `{"id":"T-1001","name":"Lubricants Europe","colour":"blue","active":true}`
	priyasTeamsBody        = `[` + lubricantsEuropeBody + `]`
)

var priyasAccessBody = `{"roles":[{"id":"RA-1005","role":{"id":"RL-1003","name":"Planner","builtIn":"planner"},` +
	`"scope":{"type":"myTeams","teams":` + priyasTeamsBody + `,"text":"My teams"},"scopeEmpty":false}],` +
	`"permissions":[` + inLubricantsEurope("plans.view", "plans.create", "plans.edit", "plans.publish", "campaigns.edit",
	"campaigns.delete", "activities.edit", "activities.delete", "activities.submit", "data.export", "reports.view", "finance.view",
	"purchaseRequests.edit", "purchaseRequests.delete", "purchaseRequests.submit") + "," + everywhere("dashboards.view", "dashboards.build") + `],` +
	`"administrators":[{"id":"U-1001","name":"Alex Morgan","initials":"AM","jobTitle":"Marketing administrator","active":true}],` +
	`"noSelfApproval":true}`

func inLubricantsEurope(keys ...string) string {
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, `{"key":"`+key+`","all":false,"teams":[`+lubricantsEuropeBody+`]}`)
	}
	return strings.Join(parts, ",")
}

func everywhere(keys ...string) string {
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, `{"key":"`+key+`","all":true,"teams":[]}`)
	}
	return strings.Join(parts, ",")
}

// GET /api/v1/me answers who is signed in, with everything the sidebar and the account menu show (FR-012),
// and what My profile shows: the version, the five preferences, the person's teams (003 FR-021, FR-026) and
// their access (014 FR-024).
func TestGetMe_SignedInPerson_FR012(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodGet, "/api/v1/me", nil)

	assertAnswer(t, response, http.StatusOK, `{"id":"U-1002","name":"Priya Raman","firstName":"Priya",`+
		`"email":"priya.raman@shell.com","jobTitle":"Marketer","initials":"PR",`+
		`"preferences":`+defaultPreferencesBody+`,"version":1,"teams":`+priyasTeamsBody+`,"access":`+priyasAccessBody+`}`)
}

// After more than 12 hours without a request the session has expired, and the person must sign in again.
func TestGetMe_SessionExpired_FR006(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	server.Advance(12*time.Hour + 2*time.Minute)

	response := priya.Do(t, http.MethodGet, "/api/v1/me", nil)

	assertAnswer(t, response, http.StatusUnauthorized, sessionExpiredBody)
}

// One contract test of PATCH /api/v1/me/preferences: only the sent preferences change, a repeated pinned plan
// is pinned once, and every refused value is listed at once and changes nothing; the rules are the service's.
func TestPatchPreferences_Contract_FR003_FR004_FR014_FR023(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	collapse := priya.Do(t, http.MethodPatch, "/api/v1/me/preferences", map[string]any{"sidebarCollapsed": true})
	assertAnswer(t, collapse, http.StatusOK, `{"theme":"system","sidebarCollapsed":true,"displayCurrency":"USD","dateFormat":"DD MMM YYYY","homeScope":"myTeams","historyIncludeInside":false,"pinnedPlanIds":[]}`)

	response := priya.Do(t, http.MethodPatch, "/api/v1/me/preferences", map[string]any{"theme": "dark", "homeScope": "everything",
		"pinnedPlanIds": []string{"P-1002", "P-1001", "P-1002"}, "displayCurrency": "EUR", "dateFormat": "DD/MM/YYYY"})
	refused := priya.Do(t, http.MethodPatch, "/api/v1/me/preferences", map[string]any{"homeScope": "all",
		"pinnedPlanIds": []string{"plan-7"}, "displayCurrency": "XYZ", "dateFormat": "DD.MM.YYYY"}, apitest.SkipRequestValidation())

	saved := `{"theme":"dark","sidebarCollapsed":true,"displayCurrency":"EUR","dateFormat":"DD/MM/YYYY","homeScope":"everything","historyIncludeInside":false,"pinnedPlanIds":["P-1002","P-1001"]}`
	assertAnswer(t, response, http.StatusOK, saved)
	assertAnswer(t, refused, http.StatusBadRequest, validationBody(`{"field":"displayCurrency","message":"Choose one of the active currencies."},`+
		`{"field":"dateFormat","message":"Choose one of the date formats."},{"field":"homeScope","message":"Choose My teams or Everything."},`+
		`{"field":"pinnedPlanIds","message":"Pin plans by their id, like P-1001."}`))
	var me people.CurrentUser
	priya.Do(t, http.MethodGet, "/api/v1/me", nil).Decode(t, &me)
	if me.Preferences.Theme != "dark" || me.Preferences.HomeScope != "everything" || !slices.Equal(me.Preferences.PinnedPlanIDs, []string{"P-1002", "P-1001"}) {
		t.Errorf("GET /api/v1/me preferences = %+v, want the saved ones (the refusal changed nothing)", me.Preferences)
	}
}

func TestPatchPreferences_WithoutSession_FR005(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)

	response := server.Do(t, http.MethodPatch, "/api/v1/me/preferences", map[string]any{"theme": "dark"})

	assertAnswer(t, response, http.StatusUnauthorized, signInRequiredBody)
}

func TestPatchMe_UpdatesProfile_FR021_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	alex := server.SignIn(t, alexsEmail)

	response := priya.Do(t, http.MethodPatch, "/api/v1/me", map[string]any{"name": "Priya Sharma", "jobTitle": "Senior marketer", "version": 1})

	assertAnswer(t, response, http.StatusOK, `{"id":"U-1002","name":"Priya Sharma","firstName":"Priya",`+
		`"email":"priya.raman@shell.com","jobTitle":"Senior marketer","initials":"PS",`+
		`"preferences":`+defaultPreferencesBody+`,"version":2,"teams":`+priyasTeamsBody+`,"access":`+priyasAccessBody+`}`)
	var me people.CurrentUser
	priya.Do(t, http.MethodGet, "/api/v1/me", nil).Decode(t, &me)
	var details people.PersonDetails
	alex.Do(t, http.MethodGet, "/api/v1/people/U-1002", nil).Decode(t, &details)
	if me.Name != "Priya Sharma" || details.Name != "Priya Sharma" || details.UpdatedBy.Name != "Priya Raman" {
		t.Errorf("after the change: GET /api/v1/me %q, GET /api/v1/people/U-1002 %q changed by %q; want the new name",
			me.Name, details.Name, details.UpdatedBy.Name)
	}
}

func TestGetDisplayCurrencies_FR023(t *testing.T) {
	t.Parallel()
	daniel := apitest.New(t).SignIn(t, danielsEmail)

	got := daniel.Do(t, http.MethodGet, "/api/v1/me/display-currencies", nil)

	assertAnswer(t, got, http.StatusOK, `{"items":[{"code":"CNY","name":"Chinese yuan","active":true},`+
		`{"code":"EUR","name":"Euro","active":true},{"code":"GBP","name":"Pound sterling","active":true},`+
		`{"code":"INR","name":"Indian rupee","active":true},{"code":"USD","name":"US dollar","active":true}],"total":5}`)
}

func TestPreferences_SameInAnotherBrowser_FR025(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	firstBrowser := server.SignIn(t, priyasEmail)
	secondBrowser := server.SignIn(t, priyasEmail)

	firstBrowser.Do(t, http.MethodPatch, "/api/v1/me/preferences", map[string]any{"displayCurrency": "EUR", "dateFormat": "YYYY-MM-DD"})
	var me people.CurrentUser
	secondBrowser.Do(t, http.MethodGet, "/api/v1/me", nil).Decode(t, &me)

	if me.Preferences.DisplayCurrency != "EUR" || me.Preferences.DateFormat != "YYYY-MM-DD" {
		t.Errorf("preferences in the second browser = %+v, want EUR and YYYY-MM-DD", me.Preferences)
	}
}

func assertAnswer(t *testing.T, response *apitest.Response, status int, body string) {
	t.Helper()
	if response.Status != status || string(response.Body) != body {
		t.Errorf("answer = %d %s\nwant %d %s", response.Status, response.Body, status, body)
	}
}
