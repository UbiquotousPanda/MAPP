package wavebqa_test

import (
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	leagueSize      = 5
	noFinanceReason = "Financial data of these plans is not shown to you"
)

func rowsTotal(rows []leagueEntry) *int64 {
	var total int64
	for _, r := range rows {
		total += orZero(units(r.Value))
	}
	return &total
}

// TestWaveB_LeagueTotalEqualsSection_048_SC003: every segment's revenue Total is Summary's revenue; performance too.
func TestWaveB_LeagueTotalEqualsSection_048_SC003(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, query := range []string{"", "category=" + categoryNamed(t, alexSees, "Events and sponsorship"), "currency=EUR"} {
		section := summaryOf(t, alexSees, query).Revenue
		for _, s := range leagueOf(t, alexSees, "revenue", query).Segments {
			l := leagueOf(t, alexSees, "revenue", joined("segment="+s.ID, query))
			if l.Segment == nil || l.Segment.ID != s.ID || shown(units(l.Total)) != shown(cents(section.ActualOrProjected)) {
				t.Errorf("Revenue by %s %q: %s, want the Total %s (SC-003)", s.Label, query, l.values(),
					shown(cents(section.ActualOrProjected)))
			}
			if len(l.Rows) < leagueSize && shown(rowsTotal(l.Rows)) != shown(units(l.Total)) {
				t.Errorf("Revenue by %s %q: every value shown, %s, adds to %s, not its Total (048-C4)", s.Label, query,
					l.values(), shown(rowsTotal(l.Rows)))
			}
		}
		if l := leagueOf(t, alexSees, "performance", query); shown(units(l.Total)) != shown(section.Performance) {
			t.Errorf("Performance league %q: Total %s, want Summary's %s", query, shown(units(l.Total)), shown(section.Performance))
		}
	}
}

// outOfOrder says whether b must not follow a: highest value first, ties by name, "—" last.
func outOfOrder(a, b leagueEntry) bool {
	x, y := units(a.Value), units(b.Value)
	switch {
	case x == nil:
		return y != nil || a.Name > b.Name
	case y == nil:
		return false
	case *x != *y:
		return *x < *y
	}
	return a.Name > b.Name
}

func checkLeagueOrder(t *testing.T, label string, l leagueAnswer) {
	t.Helper()
	if len(l.Rows) > leagueSize {
		t.Errorf("%s: %d rows, want the five highest", label, len(l.Rows))
	}
	for i := 1; i < len(l.Rows); i++ {
		if outOfOrder(l.Rows[i-1], l.Rows[i]) {
			t.Errorf("%s: %s before %s, want highest first, ties by name, — last (FR-012)", label, l.Rows[i-1].Name,
				l.Rows[i].Name)
		}
	}
}

func checkEveryValueExported(t *testing.T, alexSees person, segmentID string) {
	t.Helper()
	l := leagueOf(t, alexSees, "revenue", "segment="+segmentID)
	path := exportPath("summary", "widget=leagueRevenue", "format=csv", "revenueBy="+segmentID)
	rows := csvRows(t, string(alexSees.expect(t, get(path), http.StatusOK).Body))
	if len(rows) < 3 || len(rows)-2 <= leagueSize {
		t.Fatalf("GET %s: %d rows, want more values than the five shown", path, len(rows))
	}
	values, total := rows[1:len(rows)-1], rows[len(rows)-1]
	var sum int64
	for i, row := range values {
		sum += orZero(cents(&amount{Amount: row[1]}))
		if i < len(l.Rows) && row[0] != l.Rows[i].Name {
			t.Errorf("GET %s: row %d %v, want the table's %s", path, i+1, row, l.Rows[i].Name)
		}
	}
	if total[0] != "Total" || shown(cents(&amount{Amount: total[1]})) != shown(units(l.Total)) ||
		shown(&sum) != shown(units(l.Total)) {
		t.Errorf("GET %s: values add to %d, Total row %v; want both the table's %s (US3-1)", path, sum, total,
			shown(units(l.Total)))
	}
}

// TestWaveB_LeagueFiveThenTotal_048_FR012: five highest, ties by name, "—" last; the export lists every value.
func TestWaveB_LeagueFiveThenTotal_048_FR012(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, table := range leagueTables() {
		for _, s := range leagueOf(t, alexSees, table, "").Segments {
			checkLeagueOrder(t, table+" by "+s.Label, leagueOf(t, alexSees, table, "segment="+s.ID))
		}
	}
	checkEveryValueExported(t, alexSees, "SA-1013")
}

type shellAttribute struct {
	ID, Label, Level, Type string
	Active                 bool
}

// segmentsWanted are the active choice attributes at Plan, Campaign and Activity level, Activity ones first.
func segmentsWanted(t *testing.T, alexSees person) []segment {
	t.Helper()
	listed := decode[struct{ Items []shellAttribute }](t, alexSees.expect(t, get("/shell-attributes"), http.StatusOK))
	activity, others := []segment{}, []segment{}
	for _, a := range listed.Items {
		choice := slices.Contains([]string{"singleChoice", "multipleChoice", "multipleChoiceSplit"}, a.Type)
		if !a.Active || !choice || !slices.Contains([]string{"plan", "campaign", "activity"}, a.Level) {
			continue
		}
		if a.Level == "activity" {
			activity = append(activity, segment{a.ID, a.Label, a.Level})
		} else {
			others = append(others, segment{a.ID, a.Label, a.Level})
		}
	}
	return append(activity, others...)
}

// TestWaveB_LeagueSegments_048_FR013_FR014: the segments offered; each table answers its own segment, the report none.
func TestWaveB_LeagueSegments_048_FR013_FR014(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	want := segmentsWanted(t, alexSees)
	chosen := map[string]string{"revenue": "SA-1014", "performance": "SA-1013", "cost": "SA-1001", "roi": "SA-1004"}
	for _, table := range leagueTables() {
		if l := leagueOf(t, alexSees, table, ""); !slices.Equal(l.Segments, want) || l.Segment == nil || *l.Segment != want[0] {
			t.Errorf("%s league offers %v, default %+v; want %v, the first Activity attribute by default", table,
				l.Segments, l.Segment, want)
		}
		if l := leagueOf(t, alexSees, table, "segment="+chosen[table]); l.Segment == nil || l.Segment.ID != chosen[table] {
			t.Errorf("%s league with segment=%s answers %+v", table, chosen[table], l.Segment)
		}
	}
	plain := alexSees.expect(t, get(reportPath(summaryPath)), http.StatusOK)
	own := alexSees.expect(t, get(reportPath(summaryPath, "revenueBy=SA-1014", "performanceBy=SA-1013",
		"costBy=SA-1001", "roiBy=SA-1004")), http.StatusOK)
	if string(own.Body) != string(plain.Body) {
		t.Errorf("Summary with the four segments differs from without: the sections must not reload (FR-014)")
	}
}

type planBudget struct {
	Cards struct {
		Actual *amount `json:"actual"`
	} `json:"cards"`
}

// TestWaveB_CostLeagueEqualsPlanBudget_048_FR012: the Cost league's Total is Plan budget's Actual (paid), same filters.
func TestWaveB_CostLeagueEqualsPlanBudget_048_FR012(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	queries := []string{""}
	for _, id := range frameOf(t, alexSees, "summary").planIDs() {
		queries = append(queries, "plan="+id)
	}
	for _, query := range queries {
		paid := decode[planBudget](t, alexSees.expect(t, get(reportPath("/reports/plan-budget", query)), http.StatusOK))
		l := leagueOf(t, alexSees, "cost", query)
		want := shown(cents(paid.Cards.Actual))
		if want == "0" {
			want = shown(nil)
		}
		if shown(units(l.Total)) != want {
			t.Errorf("Cost league %q: Total %s, want Plan budget's actual %s, \"—\" when nothing is paid", query,
				shown(units(l.Total)), want)
		}
	}
}

func checkRoiNamesItsModel(t *testing.T, alexSees person, model string) {
	t.Helper()
	roi := leagueOf(t, alexSees, "roi", "")
	if roi.ROI == nil || roi.ROI.Model != model || roi.ROI.Basis != "actual" || roi.Reason != nil || units(roi.Total) == nil {
		t.Errorf("ROI league names %+v, reason %s, total %s; want %s on actual cost, a figure and no reason",
			roi.ROI, textOf(roi.Reason), shown(units(roi.Total)), model)
	}
}

func checkNoRoiBasis(t *testing.T, alexSees person) {
	t.Helper()
	for _, table := range []string{"revenue", "performance", "cost"} {
		if l := leagueOf(t, alexSees, table, ""); l.ROI != nil {
			t.Errorf("%s league names an ROI basis %+v, want none", table, l.ROI)
		}
	}
}

// TestWaveB_SummaryRoiNamesItsModel_048_FR015: ROI divides 050's credited revenue by the actual cost and names the
// designated model, and a model change restates it at once.
func TestWaveB_SummaryRoiNamesItsModel_048_FR015(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	designated := decode[struct{ Version int }](t, alexSees.expect(t, get(attributionPath), http.StatusOK))
	checkRoiNamesItsModel(t, alexSees, "Equally distributed")
	checkNoRoiBasis(t, alexSees)
	alexSees.expect(t, put(attributionPath, map[string]any{"model": "uShaped", "version": designated.Version}),
		http.StatusOK)
	checkRoiNamesItsModel(t, alexSees, "U-shaped")
}
