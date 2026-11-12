package wavebqa_test

import (
	"fmt"
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/platform/sheet"
)

const wholeFact = "5000.00"

func creditsByName(r ranked[revenueFigures]) map[string]string {
	out := map[string]string{}
	for _, e := range r.tops() {
		out[e.Name] = amountOr(e.Figures.AttributedRevenue, e.Figures.AttributedRevenueReason)
	}
	return out
}

// eachModel designates the five models in turn, as Alex would in Settings › Attribution, and checks each.
func eachModel(t *testing.T, alexSees person, check func(name string)) {
	t.Helper()
	settings := decode[struct {
		Version int
		Models  []struct{ Key, Name string }
	}](t, alexSees.expect(t, get(attributionPath), http.StatusOK))
	version := settings.Version
	for _, m := range settings.Models {
		saved := alexSees.expect(t, put(attributionPath, map[string]any{"model": m.Key, "version": version}), http.StatusOK)
		version = decode[struct{ Version int }](t, saved).Version
		check(m.Name)
	}
}

func countedRevenue(t *testing.T, alexSees person, ids map[string]string) int64 {
	t.Helper()
	var total int64
	for _, id := range ids {
		if a := panelOf(t, alexSees, id).Revenue.Actual; a != nil {
			total += orZero(cents(&amount{Amount: a.Amount}))
		}
	}
	return total
}

// summaryRoiHeadings are the first rows of Summary's ROI league export as CSV and as its XLSX sheet.
func summaryRoiHeadings(t *testing.T, alexSees person) (fromCSV, fromXLSX []string) {
	t.Helper()
	if rows := widgetRows(t, alexSees, "leagueRoi"); len(rows) > 0 {
		fromCSV = rows[0]
	}
	file := alexSees.expect(t, get(exportPath("summary", "widget=leagueRoi", "format=xlsx")), http.StatusOK)
	tables, err := sheet.ReadXLSX(file.Body, 1000)
	if err != nil || len(tables) == 0 || tables[0].Name != "Top ROI (%)" || len(tables[0].Rows) == 0 {
		t.Fatalf("Summary's ROI league workbook: %v, sheets %+v", err, tables)
	}
	return fromCSV, tables[0].Rows[0].Cells
}

func checkSummaryExportNamed(t *testing.T, alexSees person, league leagueAnswer, name string) {
	t.Helper()
	want := []string{"", "ROI (%, " + name + ", on actual cost)"}
	if league.Segment != nil {
		want[0] = league.Segment.Label
	}
	if fromCSV, fromXLSX := summaryRoiHeadings(t, alexSees); !slices.Equal(fromCSV, want) || !slices.Equal(fromXLSX, want) {
		t.Errorf("under %s: Summary's ROI export headed %q as CSV, %q as XLSX; want %q", name, fromCSV, fromXLSX, want)
	}
}

func checkModelNamed(t *testing.T, alexSees person, list ranked[revenueFigures], name string) {
	t.Helper()
	want := basisStamp{name, actualBasis}
	league := leagueOf(t, alexSees, "roi", "")
	if !sameStamp(list.Attribution, &want) || !sameStamp(league.ROI, &want) {
		t.Errorf("under %s: Revenue names %+v, Summary's ROI league %+v; want %+v", name, list.Attribution, league.ROI, want)
	}
	file := alexSees.expect(t, get(reportPath("/reports/revenue/export", "widget=ranked", "format=csv", "show=activity")),
		http.StatusOK)
	headings := []string{"Attributed revenue (" + name + ")", "Actual cost", "ROI (%, " + name + ", on actual cost)"}
	if rows := csvRows(t, string(file.Body)); len(rows) == 0 || len(rows[0]) < 10 || !slices.Equal(rows[0][7:10], headings) {
		t.Errorf("under %s: the ranked export's headings %v, want %v after Performance", name, rows[:min(1, len(rows))], headings)
	}
	checkSummaryExportNamed(t, alexSees, league, name)
}

// concerned are the activities a fact concerns: the seed's conversions and their touches, and this test's upload.
func concerned() []string {
	return []string{helixFirstHalf, helixSecondHalf, tellusCaseStudies, tellusWebinars}
}

// zeroCredits are the activities a model credits nothing although a fact concerns them: 0.00, and −100 % on a cost.
func zeroCredits() map[string]map[string]string {
	return map[string]map[string]string{
		"First touch": {tellusWebinars: "credited 0.00, cost 0.00, ROI noActualCost"},
		"Last touch":  {tellusCaseStudies: "credited 0.00, cost 33333.33, ROI -100"},
	}
}

func creditProblem(e entry[revenueFigures], zero string) string {
	credited := e.Figures.AttributedRevenue != nil
	switch {
	case credited != slices.Contains(concerned(), e.Name):
		return "a credit, 0.00 at least, exactly where a fact concerns it"
	case !credited && e.Figures.AttributedRevenueReason != noRevenueData:
		return "noData where no fact concerns it"
	case zero != "" && e.Figures.served() != zero:
		return zero
	}
	return ""
}

func checkZeroCredits(t *testing.T, name string, list ranked[revenueFigures]) {
	t.Helper()
	zeros, seen := zeroCredits()[name], 0
	for _, e := range list.tops() {
		if problem := creditProblem(e, zeros[e.Name]); problem != "" {
			t.Errorf("under %s: %s %s; want %s", name, e.Name, e.Figures.served(), problem)
		}
		if _, listed := zeros[e.Name]; listed {
			seen++
		}
	}
	if seen != len(zeros) {
		t.Errorf("under %s: %d of the zero credits %v listed", name, seen, zeros)
	}
}

// TestWaveB_ModelChangeRestates_050_SC002: under each model Revenue, Summary and both exports name it, the credits add
// up to the revenue counted on the panels, a fact without a journey stays whole with its activity, a model's zero
// credit is 0.00, and ROI follows.
func TestWaveB_ModelChangeRestates_050_SC002(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	ids := demoIDs(t, alexSees)
	upload(t, alexSees, demoFeed(t, alexSees), csvOf(fmt.Sprintf("w1,2026-02-10,%s,,,,%s,USD", ids[helixSecondHalf], wholeFact)))
	counted := countedRevenue(t, alexSees, ids)
	helix := map[string]bool{}
	eachModel(t, alexSees, func(name string) {
		list := revenueRankedOf(t, alexSees, "show=activity")
		checkModelNamed(t, alexSees, list, name)
		checkReturns(t, "Revenue under "+name, list)
		checkZeroCredits(t, name, list)
		checkSummaryRoiIsRevenues(t, alexSees, "")
		credits := creditsByName(list)
		if total := cents(topOf(t, list).AttributedRevenue); shown(total) != shown(&counted) || credits[helixSecondHalf] != wholeFact {
			t.Errorf("under %s: credited %s in all, %s to %s; want the %d counted and its whole %s without a journey", name,
				shown(total), credits[helixSecondHalf], helixSecondHalf, counted, wholeFact)
		}
		helix[credits[helixFirstHalf]] = true
	})
	if len(helix) < 2 {
		t.Errorf("%s credited %v under all five models, want the model change to restate it", helixFirstHalf, helix)
	}
}
