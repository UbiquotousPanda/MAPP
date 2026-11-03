package plandetails_test

import (
	"bytes"
	"net/http"
	"slices"
	"strconv"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/plandetails"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

const (
	lea      = "lea.santos@shell.com"
	exported = "/api/v1/reports/plan-details/export?year=2026"
)

func levels() []plandetails.Level {
	return []plandetails.Level{plandetails.LevelPlan, plandetails.LevelCampaign, plandetails.LevelInitiative,
		plandetails.LevelActivity}
}

// exportFile is a CSV export read back: the notes before the table, by label, and the table's rows.
type exportFile struct {
	notes map[string]string
	rows  [][]string
}

func csvOf(t *testing.T, c *apitest.Client, query string) exportFile {
	t.Helper()
	head, table, found := bytes.Cut(get(t, c, exported+"&format=csv"+query, http.StatusOK).Body, []byte("\n\n"))
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

func workbookOf(t *testing.T, c *apitest.Client, query string) []sheet.Table {
	t.Helper()
	tables, err := sheet.ReadXLSX(get(t, c, exported+"&format=xlsx"+query, http.StatusOK).Body, 10000)
	if err != nil {
		t.Fatalf("workbook %s: %v", query, err)
	}
	return tables
}

func textOf(rows []sheet.Row) [][]string {
	text := [][]string{}
	for _, r := range rows {
		text = append(text, r.Cells)
	}
	return text
}

// widgetsOf are a level's widgets in screen order: the built-in section, then each attribute's row.
func widgetsOf(r plandetails.Report) []plandetails.Widget {
	widgets := slices.Clone(r.BuiltIn)
	for _, row := range r.Attributes {
		widgets = append(widgets, row.Widgets...)
	}
	return widgets
}

// tableRows is a widget's table view: Value, the records and, for planned cost, the amount; every value, then Total.
func tableRows(r plandetails.Report, w plandetails.Widget) [][]string {
	records := map[plandetails.Level]string{plandetails.LevelPlan: "Plans", plandetails.LevelCampaign: "Campaigns",
		plandetails.LevelInitiative: "Initiatives", plandetails.LevelActivity: "Activities"}[r.Show]
	header := []string{"Value", records}
	if w.Measure == plandetails.MeasurePlannedCost {
		header = append(header, "Planned cost ("+r.Currency+")")
	}
	rows := [][]string{header}
	for _, v := range append(slices.Clone(w.Values), w.Total) {
		row := []string{v.Label, strconv.Itoa(v.Count)}
		if v.PlannedCost != nil {
			row = append(row, v.PlannedCost.Amount.String())
		}
		rows = append(rows, row)
	}
	return rows
}

func sheetNames(tables []sheet.Table) []string {
	names := []string{}
	for _, table := range tables {
		names = append(names, table.Name)
	}
	return names
}

// TestOwnPass_WorkbookEqualsScreen_US3_5: at every level one sheet per widget in screen order, each its table view.
func TestOwnPass_WorkbookEqualsScreen_US3_5(t *testing.T) {
	t.Parallel()
	carlosSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, carlos)

	for _, level := range levels() {
		own := "&show=" + string(level) + "&currency=EUR&period=quarter"
		screen := reportOf(t, carlosSees, report+own)
		widgets, tables := widgetsOf(screen), workbookOf(t, carlosSees, own)
		names := sheetNames(tables)
		if len(names) != len(widgets)+2 || !slices.Equal(names[len(widgets):], []string{"In view", "About this export"}) {
			t.Errorf("%s: sheets %q for %d widgets, want one each, then In view and About this export", level, names,
				len(widgets))
			continue
		}
		for i, w := range widgets {
			if diff := cmp.Diff(tableRows(screen, w), textOf(tables[i].Rows)); diff != "" {
				t.Errorf("%s %s (-screen +sheet):\n%s", level, w.Key, diff)
			}
		}
	}
}

// TestOwnPass_WidgetFilesEqualScreen_FR017_SC005: a widget's CSV holds its table view, value for value: the first widget
// of each measure at each level and the start periods (the workbook test reads every widget, through the same sheets).
func TestOwnPass_WidgetFilesEqualScreen_FR017_SC005(t *testing.T) {
	t.Parallel()
	carlosSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, carlos)

	for _, level := range levels() {
		own := "&show=" + string(level) + "&currency=EUR&period=quarter"
		screen := reportOf(t, carlosSees, report+own)
		seen := map[plandetails.Measure]bool{}
		for _, w := range widgetsOf(screen) {
			if seen[w.Measure] && w.Key != "startPeriodCount" {
				continue
			}
			seen[w.Measure] = true
			if diff := cmp.Diff(tableRows(screen, w), csvOf(t, carlosSees, own+"&widget="+w.Key).rows); diff != "" {
				t.Errorf("%s %s export (-screen +file):\n%s", level, w.Key, diff)
			}
		}
		if len(seen) != 3 {
			t.Errorf("%s: measures %v, want count, planned cost and filled in", level, seen)
		}
	}
}

// TestOwnPass_ValuesAddToTotal_FR017: a planned-cost widget whose records count once adds up to its total to the cent.
func TestOwnPass_ValuesAddToTotal_FR017(t *testing.T) {
	t.Parallel()
	carlosSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, carlos)

	for _, level := range levels() {
		screen := reportOf(t, carlosSees, report+"&show="+string(level)+"&currency=EUR")
		for _, w := range widgetsOf(screen) {
			if w.Measure != plandetails.MeasurePlannedCost || w.CountsInEach {
				continue
			}
			var sum money.Amount
			for _, v := range w.Values {
				sum = sum.Add(v.PlannedCost.Amount)
			}
			if sum.Cmp(w.Total.PlannedCost.Amount) != 0 || w.Total.PlannedCost.Amount.Cmp(screen.Cards.PlannedCost.Amount) != 0 {
				t.Errorf("%s %s: values add to %s, total %s, card %s", level, w.Key, sum, w.Total.PlannedCost.Amount,
					screen.Cards.PlannedCost.Amount)
			}
		}
	}
}

// TestOwnPass_NoFinanceView_PlannedCostShown_FR004: Lea, without finance.view, sees every planned cost Carlos sees.
func TestOwnPass_NoFinanceView_PlannedCostShown_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	leaSees, carlosSees := server.SignIn(t, lea), server.SignIn(t, carlos)

	for _, level := range levels() {
		path := report + "&show=" + string(level)
		if !bytes.Equal(get(t, carlosSees, path, http.StatusOK).Body, get(t, leaSees, path, http.StatusOK).Body) {
			t.Errorf("%s: Lea's answer differs from Carlos's, both All markets; planned cost needs no finance.view", level)
		}
		mine := reportOf(t, leaSees, path)
		if mine.Cards.PlannedCost.Amount.IsZero() {
			t.Errorf("%s cards %+v, want the planned cost of Lea's plans", level, mine.Cards)
		}
		for _, w := range widgetsOf(mine) {
			for _, v := range append(slices.Clone(w.Values), w.Total) {
				if (v.PlannedCost == nil) == (w.Measure == plandetails.MeasurePlannedCost) {
					t.Errorf("%s %s %q: planned cost %v, want it on every planned-cost value", level, w.Key, v.Label, v.PlannedCost)
				}
			}
		}
	}
}

// grantAll gives Mei (U-1004) a role with the permissions alone, scope All markets, through the access API.
func grantAll(t *testing.T, server *apitest.Server, permissions ...string) {
	t.Helper()
	admin := server.SignIn(t, alex)
	var created struct{ ID string }
	admin.Do(t, http.MethodPost, "/api/v1/roles", map[string]any{"name": "Own pass", "defaultScope": "all",
		"permissions": permissions}).Decode(t, &created)
	given := admin.Do(t, http.MethodPut, "/api/v1/people/U-1004/roles", map[string]any{"version": 1,
		"roles": []map[string]any{{"roleId": created.ID, "scope": map[string]any{"type": "all"}}}})
	if given.Status != http.StatusOK {
		t.Fatalf("giving Mei the role = %d %s", given.Status, given.Body)
	}
}

// TestOwnPass_ExportWithoutFinanceView_FR004: the files of a person without finance.view hold every planned cost.
func TestOwnPass_ExportWithoutFinanceView_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	grantAll(t, server, "plans.view", "reports.view", "data.export")
	meiSees, carlosSees := server.SignIn(t, mei), server.SignIn(t, carlos)

	mine, theirs := workbookOf(t, meiSees, "&currency=EUR"), workbookOf(t, carlosSees, "&currency=EUR")
	if len(mine) < 2 || len(mine) != len(theirs) {
		t.Fatalf("Mei's workbook has %d sheets, Carlos's %d", len(mine), len(theirs))
	}
	if diff := cmp.Diff(theirs[:len(theirs)-1], mine[:len(mine)-1]); diff != "" {
		t.Errorf("sheets without finance.view (-Carlos +Mei):\n%s", diff)
	}
	if file := csvOf(t, meiSees, "&currency=EUR&widget=activityTypePlannedCost"); len(file.rows) < 3 || len(file.rows[1]) < 3 || file.rows[1][2] == "" {
		t.Errorf("Planned cost by activity type without finance.view: %v, want every amount", file.rows)
	}
}

// TestOwnPass_ExportRights_039_FR022: without data.export every export of every level answers 403.
func TestOwnPass_ExportRights_039_FR022(t *testing.T) {
	t.Parallel()
	leaSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, lea)

	for _, level := range levels() {
		own := "&show=" + string(level)
		get(t, leaSees, exported+own+"&format=xlsx", http.StatusForbidden)
		for _, w := range widgetsOf(reportOf(t, leaSees, report+own)) {
			get(t, leaSees, exported+own+"&format=csv&widget="+w.Key, http.StatusForbidden)
		}
	}
}

// TestOwnPass_AboutStatesControls_039_FR022: About this export names the plans chosen, the period and the currency.
func TestOwnPass_AboutStatesControls_039_FR022(t *testing.T) {
	t.Parallel()
	carlosSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, carlos)

	file := csvOf(t, carlosSees, "&plan=P-1001&period=quarter&currency=EUR&show=campaign&widget=progressCount")
	want := map[string]string{"Report": "Plan details", "Year": "2026", "Filters": "Plans: FY2026 Lubricants Europe",
		"Period": "Quarters", "Currency": "EUR"}
	for label, value := range want {
		if file.notes[label] != value {
			t.Errorf("About this export %s = %q, want %q", label, file.notes[label], value)
		}
	}
}
