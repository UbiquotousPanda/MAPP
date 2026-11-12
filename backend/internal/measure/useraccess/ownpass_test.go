package useraccess_test

import (
	"bytes"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/useraccess"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/sheet"
)

const (
	lea      = "lea.santos@shell.com"
	exported = "/api/v1/reports/user-access/export?format="
)

// exportFile is a CSV export read back: the notes before the table, by label, and the table's rows.
type exportFile struct {
	notes map[string]string
	rows  [][]string
}

func csvOf(t *testing.T, c *apitest.Client, query string) exportFile {
	t.Helper()
	head, table, found := bytes.Cut(get(t, c, exported+"csv"+query, http.StatusOK).Body, []byte("\n\n"))
	notes, err := sheet.ReadCSV(head, 100)
	rows, tableErr := sheet.ReadCSV(table, 10000)
	if !found || err != nil || tableErr != nil {
		t.Fatalf("export %s: notes and table not read (%v, %v)", query, err, tableErr)
	}
	f := exportFile{notes: map[string]string{}, rows: textOf(rows.Rows)}
	for _, n := range notes.Rows {
		f.notes[n.Cell(0)] = n.Cell(1)
	}
	return f
}

// textOf is the rows' cells without the empty cells that end a row, which a workbook does not keep.
func textOf(rows []sheet.Row) [][]string {
	text := [][]string{}
	for _, r := range rows {
		text = append(text, trimmed(r.Cells))
	}
	return text
}

func trimmed(cells []string) []string {
	cells = slices.Clone(cells)
	for len(cells) > 0 && cells[len(cells)-1] == "" {
		cells = cells[:len(cells)-1]
	}
	return cells
}

// asRead is a CSV's rows as a workbook reads them back: a moment keeps its date only.
func asRead(rows [][]string) [][]string {
	moment := regexp.MustCompile(`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$`)
	read := [][]string{}
	for _, r := range rows {
		cells := slices.Clone(r)
		for i, c := range cells {
			if moment.MatchString(c) {
				cells[i] = c[:10]
			}
		}
		read = append(read, cells)
	}
	return read
}

func rolesText(r useraccess.Row) string {
	if len(r.Roles) == 0 {
		return "No role"
	}
	roles := []string{}
	for _, a := range r.Roles {
		roles = append(roles, a.Role.Name+" · "+a.Scope.Text)
	}
	return strings.Join(roles, "; ")
}

func teamsText(r useraccess.Row) string {
	teams := []string{}
	for _, team := range r.Teams {
		if team.Active {
			teams = append(teams, team.Name)
		} else {
			teams = append(teams, team.Name+" (inactive)")
		}
	}
	return strings.Join(teams, ", ")
}

// peopleRows are the table's rows with the screen's columns; Never is an empty cell (US2-1).
func peopleRows(r useraccess.Report) [][]string {
	rows := [][]string{{"Name", "E-mail", "Job title", "Roles", "Teams", "Status", "Last sign-in (UTC)"}}
	for _, x := range r.Rows {
		status, at := "Inactive", ""
		if x.Person.Active {
			status = "Active"
		}
		if x.LastSignedInAt != nil {
			at = x.LastSignedInAt.UTC().Format("2006-01-02 15:04")
		}
		rows = append(rows, trimmed([]string{x.Person.Name, x.Email, x.Person.JobTitle, rolesText(x), teamsText(x), status, at}))
	}
	return rows
}

func bandRows(r useraccess.Report) [][]string {
	rows, total := [][]string{{"Last sign-in", "People"}}, 0
	for _, b := range r.Bands {
		rows, total = append(rows, []string{b.Label, strconv.Itoa(b.Count)}), total+b.Count
	}
	return append(rows, []string{"Total", strconv.Itoa(total)})
}

// own is the search, status and sort the export tests ask for; Priya has signed in, so Never is not every row.
const own = "&q=planner&status=all&sort=-lastSignedIn"

func alexAfterPriya(t *testing.T) *apitest.Client {
	t.Helper()
	server := apitest.New(t, apitest.WithMeasureDemo())
	server.SignIn(t, priya)
	return server.SignIn(t, alex)
}

// Both widgets' files hold the screen's every row in its sort, and the workbook holds the same rows: the people
// and Last sign-in sheets first, About this export last.
func TestOwnPass_ExportEqualsScreen_FR013_SC005(t *testing.T) {
	t.Parallel()
	alexSees := alexAfterPriya(t)

	screen := reportOf(t, alexSees, report+"?pageSize=500"+own)
	files := [][][]string{csvOf(t, alexSees, own+"&widget=people").rows, csvOf(t, alexSees, own+"&widget=signInBands").rows}
	if diff := cmp.Diff(peopleRows(screen), files[0]); screen.Total < 2 || diff != "" {
		t.Errorf("people, %d on screen (-screen +file):\n%s", screen.Total, diff)
	}
	if diff := cmp.Diff(bandRows(screen), files[1]); diff != "" {
		t.Errorf("Last sign-in bands (-screen +file):\n%s", diff)
	}
	if total := bandRows(screen)[len(screen.Bands)+1][1]; total != strconv.Itoa(screen.Cards.People) {
		t.Errorf("bands add up to %s, the People card says %d (FR-007)", total, screen.Cards.People)
	}
	tables, err := sheet.ReadXLSX(get(t, alexSees, exported+"xlsx"+own, http.StatusOK).Body, 10000)
	if err != nil || len(tables) < 3 || tables[0].Name != "People" || tables[1].Name != "Last sign-in" ||
		tables[len(tables)-1].Name != "About this export" {
		t.Fatalf("workbook = %d sheets (%v), want People, Last sign-in, …, About this export", len(tables), err)
	}
	for i, file := range files {
		if diff := cmp.Diff(asRead(file), textOf(tables[i].Rows)); diff != "" {
			t.Errorf("sheet %s against its file (-file +sheet):\n%s", tables[i].Name, diff)
		}
	}
}

// TestOwnPass_ExportKeepsTeam_US2_1: the Team filter, which the frame reads, narrows both files as it does the table.
func TestOwnPass_ExportKeepsTeam_US2_1(t *testing.T) {
	t.Parallel()
	alexSees := alexAfterPriya(t)
	team := "&status=all&team=T-1001"

	screen, everyone := reportOf(t, alexSees, report+"?pageSize=500"+team), reportOf(t, alexSees, report+"?status=all")
	people := csvOf(t, alexSees, team+"&widget=people")
	if diff := cmp.Diff(peopleRows(screen), people.rows); screen.Total == 0 || screen.Total == everyone.Total || diff != "" {
		t.Errorf("people of T-1001, %d of %d on screen (-screen +file):\n%s", screen.Total, everyone.Total, diff)
	}
	if diff := cmp.Diff(bandRows(screen), csvOf(t, alexSees, team+"&widget=signInBands").rows); diff != "" {
		t.Errorf("Last sign-in of T-1001 (-screen +file):\n%s", diff)
	}
	if people.notes["Filters"] != "Team: Lubricants Europe" {
		t.Errorf("About this export Filters = %q, want the team", people.notes["Filters"])
	}
	tables, err := sheet.ReadXLSX(get(t, alexSees, exported+"xlsx"+team, http.StatusOK).Body, 10000)
	if err != nil || len(tables) == 0 {
		t.Fatalf("workbook of T-1001: %d sheets (%v)", len(tables), err)
	}
	if diff := cmp.Diff(asRead(people.rows), textOf(tables[0].Rows)); diff != "" {
		t.Errorf("People sheet of T-1001 against the file (-file +sheet):\n%s", diff)
	}
}

// giveMeiAccessManage gives Mei (U-1004) a role with access.manage alone, through the access API.
func giveMeiAccessManage(t *testing.T, server *apitest.Server) {
	t.Helper()
	admin := server.SignIn(t, alex)
	var created struct{ ID string }
	admin.Do(t, http.MethodPost, "/api/v1/roles", map[string]any{"name": "Access reviewer", "defaultScope": "all",
		"permissions": []string{"access.manage"}}).Decode(t, &created)
	given := admin.Do(t, http.MethodPut, "/api/v1/people/U-1004/roles", map[string]any{"version": 1,
		"roles": []map[string]any{{"roleId": created.ID, "scope": map[string]any{"type": "all"}}}})
	if given.Status != http.StatusOK {
		t.Fatalf("giving Mei the role = %d %s", given.Status, given.Body)
	}
}

// TestOwnPass_NoFinanceView_ShownInFull_US1_13: without finance.view the report is Alex's, as it holds no financial data.
func TestOwnPass_NoFinanceView_ShownInFull_US1_13(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	giveMeiAccessManage(t, server)
	meiSees, alexSees := server.SignIn(t, mei), server.SignIn(t, alex)
	path := report + "?status=all&pageSize=500"

	if mine, theirs := get(t, meiSees, path, http.StatusOK).Body, get(t, alexSees, path, http.StatusOK).Body; !bytes.Equal(mine, theirs) {
		t.Errorf("Mei (access.manage alone) sees\n%s\nAlex\n%s", mine, theirs)
	}
}
