package attribution_test

import (
	"bytes"
	"encoding/csv"
	"strconv"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/sheet"
)

func TestDealsSheet_058_US3_1(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())
	q := attribution.DealsQuery{ActivityID: webinars, Year: 2026, Currency: "EUR", Compare: attribution.LastTouch}

	got, err := f.deals.Sheet(withPermissions(authz.ReportsView), alex, q)
	if err != nil {
		t.Fatalf("Sheet: %v", err)
	}
	if shape := got.Name + " " + strconv.Itoa(len(got.Rows)) + " rows"; shape != "Deals 3 rows" {
		t.Fatalf("sheet = %s; want Deals with a header and two deals", shape)
	}
	header := cellTexts(got.Rows[0])
	if got := strings.Join(header[9:], " | "); got != "Share (EUR, Equally distributed) | Share (EUR, Last touch, for comparison)" {
		t.Errorf("share columns = %s; want the currency and the models named", got)
	}
	want := []string{"Measure demo feed · MD-009", "2026-03-06", "Tellus case studies", "24000.00", "USD", "—", "24000.00",
		"INQ · Helix search and social, first half · 2026-01-14 · 12000.00; MQL · Tellus webinar series · 2026-03-02 · 12000.00",
		"MQL · Tellus webinar series · 2026-03-02 · 12000.00", "11040.00", "22080.00"}
	if diff := cmp.Diff(want, cellTexts(got.Rows[1])); diff != "" {
		t.Errorf("the first deal's row (-want +got):\n%s", diff)
	}
}

func TestDealsDescribe_058_US3_1(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())
	q := attribution.DealsQuery{ActivityID: webinars, Year: 2026, Compare: attribution.LastTouch}

	notes, err := f.deals.Describe(withPermissions(authz.ReportsView), alex, q)
	if err != nil {
		t.Fatalf("Describe: %v", err)
	}
	want := [][2]string{{"Deals of", "Tellus webinar series (FY2026 Measure demo – Lubricants Benelux)"},
		{"Attribution model", "Equally distributed"}, {"Compared with", "Last touch"}, {"Scope", attribution.ScopeSentence}}
	if diff := cmp.Diff(want, notes); diff != "" {
		t.Errorf("notes (-want +got):\n%s", diff)
	}
}

// cellTexts reads one row back through the CSV writer, the only way out of a sheet.Cell; the writer's byte-order
// mark is dropped.
func cellTexts(cells []sheet.Cell) []string {
	var buf bytes.Buffer
	if err := sheet.WriteCSV(&buf, nil, [][]sheet.Cell{cells}); err != nil {
		return []string{err.Error()}
	}
	records, err := csv.NewReader(&buf).ReadAll()
	if err != nil || len(records) == 0 {
		return []string{"unreadable: " + buf.String()}
	}
	row := records[len(records)-1]
	row[0] = strings.TrimPrefix(row[0], string(rune(0xFEFF)))
	return row
}
