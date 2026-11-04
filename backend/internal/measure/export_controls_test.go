package measure_test

import (
	"net/url"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/sheet"
)

// About this export names a control only when the report has it, as its frame shows; User access has no plan filters,
// so its export has no In view and no year, period, show, currency or rate lines, but still names its team.
func TestExport_NotesNameOnlyTheReportsOwnControls_039_FR022(t *testing.T) {
	t.Parallel()
	tests := []struct {
		report string
		values url.Values
		want   [][2]string
		inView bool
	}{
		{measure.KeyPlanDetails, url.Values{"show": {"campaign"}}, [][2]string{{"Report", "Plan details"},
			{"Year", "2026"}, {"Filters", "None"}, {"Period", "Months"}, {"Show", "Campaign"}, {"Currency", "GBP"}}, true},
		{measure.KeyApprovals, nil, [][2]string{{"Report", "Approvals"}, {"Year", "2026"}, {"Filters", "None"},
			{"Currency", "GBP"}}, true},
		{measure.KeyUserAccess, url.Values{"team": {"T-1"}}, [][2]string{{"Report", "User access"},
			{"Filters", "Team: Lubricants Europe"}}, false},
	}
	for _, tt := range tests {
		t.Run(tt.report, func(t *testing.T) {
			t.Parallel()
			f, err := measure.ParseFilter(tt.values)
			if err != nil {
				t.Fatal(err)
			}

			file, err := exportService(t, sheetsReport{key: tt.report}).Export(withPermissions(t, authz.AccessManage),
				actor.Actor{ID: "U-2", Name: "Priya Raman"}, tt.report, measure.ExportRequest{Filter: f})
			if err != nil {
				t.Fatal(err)
			}

			hasInView, about := aboutOf(t, file)
			if diff := cmp.Diff(tt.want, about); diff != "" || hasInView != tt.inView {
				t.Errorf("In view sheet %v, want %v; About this export, before who exported it (-want +got):\n%s",
					hasInView, tt.inView, diff)
			}
		})
	}
}

// aboutOf reads whether the file has an In view sheet, and its About this export lines before who exported it.
func aboutOf(t *testing.T, file measure.File) (bool, [][2]string) {
	t.Helper()
	tables, err := sheet.ReadXLSX(file.Body, 50)
	if err != nil {
		t.Fatal(err)
	}
	var about [][2]string
	for _, row := range tables[len(tables)-1].Rows {
		if row.Cells[0] != "Exported by" && row.Cells[0] != "Exported at" {
			about = append(about, [2]string{row.Cells[0], row.Cells[1]})
		}
	}
	return slices.ContainsFunc(tables, func(tb sheet.Table) bool { return tb.Name == "In view" }), about
}
