package wavebqa_test

import (
	"bytes"
	"net/http"
	"slices"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

func summarySheets() []string {
	return []string{"Revenue against goal", "Revenue trend", "Funnel stages", "Conversions", "Top Revenue",
		"Top Performance (%)", "Top Actual cost", "Top ROI (%)", "In view", "About this export"}
}

func checkSummaryWorkbook(t *testing.T, alexSees person) {
	t.Helper()
	file := alexSees.expect(t, get(exportPath("summary")), http.StatusOK)
	got, want := sheetNames(t, file.Body), summarySheets()
	if len(got) != len(want) || slices.ContainsFunc(want, func(w string) bool {
		return !strings.HasPrefix(got[slices.Index(want, w)], w)
	}) {
		t.Errorf("Summary workbook sheets = %q, want a sheet per widget in page order: %q", got, want)
	}
	if name := fileNameOf(t, file); name != "SP&A One – Summary – 2026 – 12 Mar 2026.xlsx" {
		t.Errorf("Summary workbook named %q", name)
	}
	widget := alexSees.expect(t, get(exportPath("summary", "widget=revenue", "format=csv")), http.StatusOK)
	if name := fileNameOf(t, widget); name != "SP&A One – Summary – Revenue against goal – 2026 – 12 Mar 2026.csv" {
		t.Errorf("Summary revenue widget CSV named %q", name)
	}
}

// TestWaveB_ExportRights_048_FR022: Summary exports for data.export, Lea 403; one sheet per widget in page order.
func TestWaveB_ExportRights_048_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	paths := []string{exportPath("summary"), exportPath("summary", "widget=revenue", "format=csv"),
		exportPath("summary", "widget=leagueRoi", "format=xlsx")}
	for _, who := range everyone() {
		p, want := signIn(t, server, who), map[bool]int{true: http.StatusForbidden, false: http.StatusOK}[who == lea]
		for _, path := range paths {
			if got := p.send(t, get(path)); got.Status != want {
				t.Errorf("%s GET %s = %d, want %d (FR-003, US3-2)", who, path, got.Status, want)
			}
		}
	}
	checkSummaryWorkbook(t, signIn(t, server, alex))
}

func widgetRows(t *testing.T, who person, widget string) [][]string {
	t.Helper()
	path := exportPath("summary", "widget="+widget, "format=csv")
	return csvRows(t, string(who.expect(t, get(path), http.StatusOK).Body))
}

func money(a *amount) string {
	if a == nil {
		return "—"
	}
	return a.Amount
}

func expectRows(t *testing.T, widget string, got, want [][]string) {
	t.Helper()
	if len(got) < len(want) || !slices.EqualFunc(got[:len(want)], want, slices.Equal[[]string]) {
		t.Errorf("Summary %s widget = %q, want its table %q (FR-021)", widget, got, want)
	}
}

func checkRevenueWidgets(t *testing.T, alexSees person, s summaryAnswer) {
	t.Helper()
	r := s.Revenue
	expectRows(t, "revenue", widgetRows(t, alexSees, "revenue"), [][]string{{"Figure", "Value"},
		{"Period", r.PeriodLabel}, {"Actual or projected (USD)", money(r.ActualOrProjected)}, {"Goal (USD)", money(r.Goal)},
		{"Performance (%)", shown(r.Performance)}, {"Variance", varianceWord(r.Variance)}})
	words := map[string]string{"actual": "Actual", "inProgress": "In progress", summaryAhead: "Projected"}
	trend := [][]string{{"Period", "State", "Actual (USD)", "Projected (USD)", "Goal (USD)"}}
	for _, p := range r.Trend {
		trend = append(trend, []string{p.Label, words[p.State], money(p.Actual), money(p.Projected), money(p.Goal)})
	}
	expectRows(t, "trend", widgetRows(t, alexSees, "trend"), trend)
}

func checkFunnelWidget(t *testing.T, alexSees person, s summaryAnswer) {
	t.Helper()
	funnel := [][]string{{"Stage", "Actual or projected", "Goal", "Performance (%)", "Variance"}}
	for _, stage := range []string{"inq", "mql"} {
		st := s.stage(stage)
		funnel = append(funnel, []string{strings.ToUpper(stage), exported(st.ActualOrProjected), exported(st.Goal),
			shown(st.Performance), varianceWord(st.Variance)})
	}
	expectRows(t, "funnel", widgetRows(t, alexSees, "funnel"), funnel)
	c := s.Funnel.Conversions[0]
	rate, variance := strings.Replace(textOf(c.Rate), "null", "—", 1), varianceWord(c.Variance)
	if c.Variance == "" {
		variance = "—"
	}
	expectRows(t, "conversion", widgetRows(t, alexSees, "conversion"), [][]string{{"Stage", "Rate (%)", "Goal (%)",
		"Variance"}, {"MQL", rate, textOf(c.Goal), variance}})
}

// TestWaveB_SummaryWidgetsExportTheirTable_048_FR021: each widget's CSV is its table, the currency named; leagues end Total.
func TestWaveB_SummaryWidgetsExportTheirTable_048_FR021(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	s := summaryOf(t, alexSees, "")
	checkRevenueWidgets(t, alexSees, s)
	checkFunnelWidget(t, alexSees, s)
	for _, table := range leagueTables() {
		l := leagueOf(t, alexSees, table, "")
		rows := widgetRows(t, alexSees, "league"+strings.ToUpper(table[:1])+table[1:])
		if last := rows[len(rows)-1]; rows[0][0] != l.Segment.Label || !slices.Equal(last[:2], []string{"Total", exported(l.Total)}) {
			t.Errorf("Summary %s league widget = %q, want %s's values, then Total %s", table, rows, l.Segment.Label,
				shown(units(l.Total)))
		}
	}
}

type summaryParam struct {
	widget, param string
	row           []string
}

func summaryParams(t *testing.T, alexSees person) []summaryParam {
	t.Helper()
	digital := "category=" + categoryNamed(t, alexSees, "Digital")
	firstRow := func(table, segmentID string) []string {
		l := leagueOf(t, alexSees, table, "segment="+segmentID)
		return []string{l.Segment.Label, l.Rows[0].Name, exported(l.Rows[0].Value)}
	}
	return []summaryParam{
		{"revenue", digital, []string{"Actual or projected (USD)", money(summaryOf(t, alexSees, digital).Revenue.ActualOrProjected)}},
		{"funnel", "category=" + uncategorised, []string{"INQ", shown(units(summaryOf(t, alexSees,
			"category="+uncategorised).stage("inq").ActualOrProjected))}},
		{"leagueRevenue", "revenueBy=SA-1014", firstRow("revenue", "SA-1014")},
		{"leaguePerformance", "performanceBy=SA-1013", firstRow("performance", "SA-1013")},
		{"leagueCost", "costBy=SA-1001", firstRow("cost", "SA-1001")},
		{"leagueRoi", "roiBy=SA-1004", firstRow("roi", "SA-1004")},
	}
}

func holds(rows [][]string, want []string) bool {
	if len(want) == 3 {
		return len(rows) > 1 && rows[0][0] == want[0] && slices.Equal(rows[1][:2], want[1:])
	}
	return slices.ContainsFunc(rows, func(r []string) bool { return len(r) >= 2 && slices.Equal(r[:2], want) })
}

// TestWaveB_ExportsKeepOwnParams_048_FR022: category and each league's segment reach the widget export, unlike the default.
func TestWaveB_ExportsKeepOwnParams_048_FR022(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, c := range summaryParams(t, alexSees) {
		plain := alexSees.expect(t, get(exportPath("summary", "widget="+c.widget, "format=csv")), http.StatusOK)
		path := exportPath("summary", "widget="+c.widget, "format=csv", c.param)
		kept := alexSees.expect(t, get(path), http.StatusOK)
		if rows := csvRows(t, string(kept.Body)); bytes.Equal(plain.Body, kept.Body) || !holds(rows, c.row) {
			t.Errorf("GET %s: %q, want %q as the report shows it, and a file unlike the default", path, rows, c.row)
		}
	}
}

// TestWaveB_SummaryOwnParams_048_FR004: a saved view keeps the six own parameters; malformed ones are refused.
func TestWaveB_SummaryOwnParams_048_FR004(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	own := []string{"category=CAT-1001", "costBy=SA-1001", "performanceBy=SA-1013", "revenueBy=SA-1014",
		"roiBy=SA-1004", "stage=mql"}
	saved := decode[struct{ ID, Query string }](t, alexSees.expect(t, post("/reports/summary/views",
		map[string]any{"name": "Kept", "query": joined(append([]string{"year=2026"}, own...)...)}), http.StatusCreated))
	listed := decode[struct{ Items []struct{ ID, Query string } }](t, alexSees.expect(t, get("/reports/summary/views"),
		http.StatusOK))
	for _, p := range own {
		if !strings.Contains("&"+saved.Query+"&", "&"+p+"&") || !slices.Contains(listed.Items, saved) {
			t.Errorf("Summary view saved as %q, listed %+v; want %s kept (FR-004)", saved.Query, listed.Items, p)
		}
	}
	unchecked := []apitest.RequestOption{apitest.SkipRequestValidation()}
	for _, path := range []string{reportPath(summaryPath, "stage=inq"), reportPath(summaryPath, "category=a%20b"),
		reportPath(leaguePath + "deals"), reportPath(leaguePath+"revenue", "segment=a%2Fb")} {
		if got := alexSees.send(t, call{method: http.MethodGet, path: path, opts: unchecked}); got.Status != http.StatusBadRequest {
			t.Errorf("GET %s = %d %s, want 400 (contracts/api.md)", path, got.Status, got.Body)
		}
	}
	if l := leagueOf(t, alexSees, "revenue", "segment=SA-9999"); l.Segment != nil || len(l.Rows) != 0 {
		t.Errorf("a segment that matches nothing: %+v, %d rows; want none (contracts/api.md)", l.Segment, len(l.Rows))
	}
}
