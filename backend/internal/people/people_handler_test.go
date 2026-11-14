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

const (
	alexsEmail   = "alex.morgan@shell.com"
	danielsEmail = "daniel.okoro@shell.com"
	janesEmail   = "jane.doe@shell.com"
)

const (
	personGoneBody      = `{"error":{"code":"not_found","message":"This person doesn't exist.","fields":[]}}`
	noSuchPathBody      = `{"error":{"code":"not_found","message":"This page or record doesn't exist.","fields":[]}}`
	incorrectSignInBody = `{"error":{"code":"incorrect_credentials","message":"Incorrect e-mail or password.","fields":[]}}`
)

// Every person picker filters GET /api/v1/people in the browser (D-069), so the list gives everyone with what
// the picker matches and shows — name, e-mail, job title, initials — whether they are active (inactive
// people are never offered but are labelled where a field holds them) and their teams, for the
// team-restricted mode (FR-017, FR-018, FR-019).
func TestListPeople_GivesPickerData_FR017_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodGet, "/api/v1/people", nil)

	if response.Status != http.StatusOK {
		t.Fatalf("GET /api/v1/people = %d %s", response.Status, response.Body)
	}
	var page people.PersonPage
	response.Decode(t, &page)
	var names []string
	for _, p := range page.Items {
		names = append(names, p.Name)
	}
	want := []string{"Alex Morgan", "Carlos Mendes", "Daniel Okoro", "Lea Santos", "Mei Lin", "Priya Raman", "Sara Novak"}
	if !slices.Equal(names, want) || page.Total != len(want) {
		t.Fatalf("people = %q (total %d), want %q", names, page.Total, want)
	}
	sara := page.Items[6]
	wantTeams := []people.TeamRef{
		{ID: "T-1001", Name: "Lubricants Europe", Colour: "blue", Active: true},
		{ID: "T-1002", Name: "Mobility China", Colour: "violet", Active: true},
	}
	if sara.ID != "U-1006" || sara.Email != "sara.novak@shell.com" || sara.JobTitle != "Local finance advisor" ||
		sara.Initials != "SN" || !sara.Active || !slices.Equal(sara.Teams, wantTeams) {
		t.Errorf("Sara = %+v, want her e-mail, job title, initials, status and two teams", sara)
	}
}

func TestGetPerson_DetailsOrNotFound_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	found := alex.Do(t, http.MethodGet, "/api/v1/people/U-1005", nil)
	missing := alex.Do(t, http.MethodGet, "/api/v1/people/U-9999", nil)

	var carlos people.PersonDetails
	found.Decode(t, &carlos)
	wantTeams := []people.TeamRef{
		{ID: "T-1003", Name: "Global Marketing Ops", Colour: "teal", Active: true},
		{ID: "T-1002", Name: "Mobility China", Colour: "violet", Active: true},
	}
	if found.Status != http.StatusOK || carlos.Name != "Carlos Mendes" || !slices.Equal(carlos.Teams, wantTeams) ||
		carlos.Usage == nil || carlos.Version != 1 {
		t.Errorf("GET /api/v1/people/U-1005 = %d %s", found.Status, found.Body)
	}
	assertAnswer(t, missing, http.StatusNotFound, personGoneBody)
}

func TestDeleteNotOffered_FR008(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	response := alex.Do(t, http.MethodDelete, "/api/v1/people/U-1002", nil, apitest.SkipValidation())

	assertAnswer(t, response, http.StatusNotFound, noSuchPathBody)
	if still := alex.Do(t, http.MethodGet, "/api/v1/people/U-1002", nil); still.Status != http.StatusOK {
		t.Errorf("GET /api/v1/people/U-1002 after DELETE = %d %s", still.Status, still.Body)
	}
}

// Creating a person answers 201 with the person as saved — trimmed, e-mail in lower case, active, with
// their teams; a form with problems answers 400 listing every one of them (FR-001, FR-002, SC-007).
func TestCreatePerson_CreatedOrRefused_FR001_FR002(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	created := alex.Do(t, http.MethodPost, "/api/v1/people", map[string]any{"name": " Jane Doe ",
		"email": " Jane.Doe@Shell.Com", "jobTitle": "Marketer", "teamIds": []string{"T-1001"}})
	refused := alex.Do(t, http.MethodPost, "/api/v1/people", map[string]any{"name": " ",
		"email": "PRIYA.raman@shell.com", "jobTitle": strings.Repeat("j", 121), "teamIds": []string{"T-9999"}})

	assertAnswer(t, created, http.StatusCreated, `{"id":"U-1008","name":"Jane Doe","email":"jane.doe@shell.com",`+
		`"jobTitle":"Marketer","initials":"JD","active":true,`+
		`"teams":[{"id":"T-1001","name":"Lubricants Europe","colour":"blue","active":true}],`+
		`"version":1,"createdAt":"2026-03-12T09:00:00Z","createdBy":{"id":"U-1001","name":"Alex Morgan"},`+
		`"updatedAt":"2026-03-12T09:00:00Z","updatedBy":{"id":"U-1001","name":"Alex Morgan"},"usage":[]}`)
	assertAnswer(t, refused, http.StatusBadRequest, validationBody(`{"field":"name","message":"Enter a name."},`+
		`{"field":"email","message":"priya.raman@shell.com already belongs to Priya Raman."},`+
		`{"field":"jobTitle","message":"Use 120 characters or fewer."},`+
		`{"field":"teamIds","message":"Choose teams from the list."}`))
}

// A change from the current version answers the person with their new version; one from an out-of-date
// copy answers 409, naming who changed the person and when.
func TestUpdatePerson_ChangedConflictInvalidOrNotFound_FR002(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	jane := createPerson(t, alex, map[string]any{"name": "Jane Doe", "email": janesEmail})
	priya := server.SignIn(t, priyasEmail)
	server.GrantRole(t, priyasEmail, "administrator", "all")
	server.Advance(time.Hour)
	update := map[string]any{"name": "Jane Smith", "email": "jane.smith@shell.com", "jobTitle": "Marketer",
		"teamIds": []string{"T-1001"}, "version": 1}

	changed := priya.Do(t, http.MethodPatch, "/api/v1/people/"+jane.ID, update)
	outOfDate := alex.Do(t, http.MethodPatch, "/api/v1/people/"+jane.ID, update)

	var person people.PersonDetails
	changed.Decode(t, &person)
	if changed.Status != http.StatusOK || person.Name != "Jane Smith" || person.Email != "jane.smith@shell.com" ||
		person.Version != 2 || len(person.Teams) != 1 || person.UpdatedBy.Name != "Priya Raman" {
		t.Errorf("PATCH = %d %s", changed.Status, changed.Body)
	}
	assertAnswer(t, outOfDate, http.StatusConflict, `{"error":{"code":"version_conflict",`+
		`"message":"Not saved — Priya Raman changed this person","fields":[],`+
		`"conflict":{"changedBy":"Priya Raman","changedAt":"2026-03-12T10:00:00Z"}}}`)
}

func TestPersonImpact_NoPlansNoWarnings_FR013(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	jane := createPerson(t, alex, map[string]any{"name": "Jane Doe", "email": janesEmail, "teamIds": []string{"T-1001"}})
	form := map[string]any{"name": "Jane Doe", "email": janesEmail, "jobTitle": "", "teamIds": []string{}, "version": 1}

	impact := alex.Do(t, http.MethodPost, "/api/v1/people/"+jane.ID+"/impact", form)
	form["email"] = "jane"
	invalid := alex.Do(t, http.MethodPost, "/api/v1/people/"+jane.ID+"/impact", form)

	assertAnswer(t, impact, http.StatusOK, `{"warnings":[]}`)
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(`{"field":"email","message":"Enter a valid e-mail address."}`))
}

func TestSetPersonStatus_InactiveAndBack_FR005_FR007(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	jane := createPerson(t, alex, map[string]any{"name": "Jane Doe", "email": janesEmail, "teamIds": []string{"T-1001"}})
	path := "/api/v1/people/" + jane.ID + "/status"

	var inactive people.PersonDetails
	alex.Do(t, http.MethodPost, path, map[string]any{"active": false, "version": 1}).Decode(t, &inactive)
	outOfDate := alex.Do(t, http.MethodPost, path, map[string]any{"active": false, "version": 1})

	if inactive.Active || inactive.Version != 2 || len(inactive.Teams) != 1 {
		t.Errorf("status = %+v, want inactive at version 2, keeping the team", inactive)
	}
	if outOfDate.Status != http.StatusConflict || !strings.Contains(string(outOfDate.Body), `"code":"version_conflict"`) {
		t.Errorf("out-of-date status = %d %s, want 409 version_conflict", outOfDate.Status, outOfDate.Body)
	}
}

func createPerson(t *testing.T, client *apitest.Client, body map[string]any) people.PersonDetails {
	t.Helper()
	response := client.Do(t, http.MethodPost, "/api/v1/people", body)
	if response.Status != http.StatusCreated {
		t.Fatalf("POST /api/v1/people %v = %d %s", body, response.Status, response.Body)
	}
	var person people.PersonDetails
	response.Decode(t, &person)
	return person
}

func setStatus(t *testing.T, client *apitest.Client, id string, active bool, version int) people.PersonDetails {
	t.Helper()
	response := client.Do(t, http.MethodPost, "/api/v1/people/"+id+"/status", map[string]any{"active": active, "version": version})
	if response.Status != http.StatusOK {
		t.Fatalf("POST /api/v1/people/%s/status active=%t = %d %s", id, active, response.Status, response.Body)
	}
	var person people.PersonDetails
	response.Decode(t, &person)
	return person
}
