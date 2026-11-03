package wavebqa_test

import (
	"archive/zip"
	"bytes"
	"io"
	"mime"
	"net/http"
	"slices"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

func exportPath(report string, params ...string) string {
	return reportPath("/reports/"+report+"/export", params...)
}

func fileNameOf(t *testing.T, r *apitest.Response) string {
	t.Helper()
	_, params, err := mime.ParseMediaType(r.Header.Get("Content-Disposition"))
	if err != nil {
		t.Fatalf("Content-Disposition %q: %v", r.Header.Get("Content-Disposition"), err)
	}
	return params["filename"]
}

// sheetNames reads the workbook's sheet names in order from xl/workbook.xml.
func sheetNames(t *testing.T, body []byte) []string {
	t.Helper()
	archive, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
	if err != nil {
		t.Fatalf("not an .xlsx file: %v", err)
	}
	var names []string
	for _, part := range archive.File {
		if part.Name != "xl/workbook.xml" {
			continue
		}
		rc, _ := part.Open()
		xml, _ := io.ReadAll(rc)
		_ = rc.Close()
		for _, piece := range strings.Split(string(xml), `<sheet name="`)[1:] {
			name, _, _ := strings.Cut(piece, `"`)
			names = append(names, strings.ReplaceAll(name, "&amp;", "&"))
		}
	}
	return names
}

func checkWorkbook(t *testing.T, alexSees person, report, name string) {
	t.Helper()
	file := alexSees.expect(t, get(exportPath(report)), http.StatusOK)
	want := []string{"Cards", "Periods", "Ranked list", "In view", "About this export"}
	if got := sheetNames(t, file.Body); !slices.Equal(got, want) {
		t.Errorf("%s workbook sheets = %v, want %v", name, got, want)
	}
	if got := fileNameOf(t, file); got != "SP&A One – "+name+" – 2026 – 12 Mar 2026.xlsx" {
		t.Errorf("%s workbook named %q", name, got)
	}
	widget := alexSees.expect(t, get(exportPath(report, "widget=ranked", "format=csv")), http.StatusOK)
	if got := fileNameOf(t, widget); got != "SP&A One – "+name+" – Ranked list – 2026 – 12 Mar 2026.csv" {
		t.Errorf("%s ranked list CSV named %q", name, got)
	}
}

// TestWaveB_ExportRights_049_FR022: Revenue and Funnel stages export for data.export, Lea 403; sheets and names as 039 says.
func TestWaveB_ExportRights_049_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	paths := []string{exportPath("revenue"), exportPath("revenue", "widget=cards", "format=csv"), exportPath("funnel"),
		exportPath("funnel", "widget=periods", "format=csv", "stage=mql")}
	for _, who := range []string{alex, carlos, priya, daniel, mei, sara, lea} {
		p, want := signIn(t, server, who), map[bool]int{true: http.StatusForbidden, false: http.StatusOK}[who == lea]
		for _, path := range paths {
			if got := p.send(t, get(path)); got.Status != want {
				t.Errorf("%s GET %s = %d %s, want %d", who, path, got.Status, got.Body, want)
			}
		}
	}
	alexSees := signIn(t, server, alex)
	checkWorkbook(t, alexSees, "revenue", "Revenue")
	checkWorkbook(t, alexSees, "funnel", "Funnel stages")
}

// ownParam is one of 049's own parameters, the widget export it reaches, the row the file must hold at row at,
// and the note About this export says it in.
type ownParam struct {
	report, widget, param string
	at                    int
	row                   []string
	note                  string
}

func categoryNamed(t *testing.T, who person, name string) string {
	t.Helper()
	list := decode[struct{ Items []category }](t, who.expect(t, get(categoriesPath), http.StatusOK))
	i := slices.IndexFunc(list.Items, func(c category) bool { return c.Name == name })
	if i < 0 {
		t.Fatalf("no category %q in %+v", name, list.Items)
	}
	return list.Items[i].ID
}

func ownParams(t *testing.T, alexSees person) []ownParam {
	t.Helper()
	digital, mql := "category="+categoryNamed(t, alexSees, "Digital"), "stage=mql"
	unsorted := joined(mql, "category="+uncategorised)
	stageCard := func(param string) []string {
		return []string{"MQL actual or projected", shown(whole(funnelOf(t, alexSees, param).Cards.Projected.Value))}
	}
	return []ownParam{
		{"revenue", "cards", digital, 3,
			[]string{"Actual or projected", revenueOf(t, alexSees, digital).Cards.Projected.Value.Amount}, "Category,Digital"},
		{"funnel", "cards", mql, 3, stageCard(mql), "Stage,MQL"},
		{"funnel", "cards", unsorted, 3, stageCard(unsorted), "Category,Uncategorised"},
		{"revenue", "ranked", "sort=actualRevenue", 1,
			[]string{"", "Campaign", revenueRankedOf(t, alexSees, "sort=actualRevenue").tops()[0].Name}, "Sort by,Actual"},
		{"funnel", "ranked", "sort=actual", 1,
			[]string{"", "Campaign", funnelRankedOf(t, alexSees, "sort=actual").tops()[0].Name}, "Sort by,Actual"},
	}
}

// TestWaveB_ExportsKeepOwnParams_FR022: category, stage and sort reach the widget export and its notes, unlike the default.
func TestWaveB_ExportsKeepOwnParams_FR022(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, c := range ownParams(t, alexSees) {
		plain := alexSees.expect(t, get(exportPath(c.report, "widget="+c.widget, "format=csv")), http.StatusOK)
		path := exportPath(c.report, "widget="+c.widget, "format=csv", c.param)
		kept := alexSees.expect(t, get(path), http.StatusOK)
		rows := csvRows(t, string(kept.Body))
		if bytes.Equal(plain.Body, kept.Body) || len(rows) <= c.at || !slices.Equal(rows[c.at][:len(c.row)], c.row) {
			t.Errorf("GET %s: row %d of %v, want %v, as the report shows it, and a file unlike the default", path, c.at,
				rows, c.row)
		}
		if notes, _, _ := strings.Cut(strings.ReplaceAll(string(kept.Body), "\r\n", "\n"), "\n\n"); !strings.Contains(notes, c.note) {
			t.Errorf("GET %s: About this export %q, want %q (039 FR-022)", path, notes, c.note)
		}
	}
}

// TestWaveB_ViewsKeepOwnParams_049_FR019: a saved view keeps the category, the stage and the ranked list's own parameters.
func TestWaveB_ViewsKeepOwnParams_049_FR019(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	digital := "category=" + categoryNamed(t, alexSees, "Digital")
	for report, own := range map[string][]string{
		"revenue": {digital, "group=plan", "sort=actualRevenue"},
		"funnel":  {"category=" + uncategorised, "sort=actual", "stage=mql"},
	} {
		query := joined(append([]string{"year=2026"}, own...)...)
		saved := decode[struct{ ID, Query string }](t, alexSees.expect(t, post("/reports/"+report+"/views",
			map[string]any{"name": "Kept " + report, "query": query}), http.StatusCreated))
		for _, p := range own {
			if !strings.Contains("&"+saved.Query+"&", "&"+p+"&") {
				t.Errorf("%s view saved as %q, want %s kept (FR-019, 049-C10)", report, saved.Query, p)
			}
		}
		listed := decode[struct{ Items []struct{ ID, Query string } }](t,
			alexSees.expect(t, get("/reports/"+report+"/views"), http.StatusOK))
		if !slices.Contains(listed.Items, saved) {
			t.Errorf("%s views = %+v, want %+v listed as saved", report, listed.Items, saved)
		}
	}
}
