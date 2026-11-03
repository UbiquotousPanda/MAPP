package summary

import (
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/sheet"
)

// sevenRegions gives A-1 seven region values, so a league sheet must list more than the page's five.
func sevenRegions() *fakes {
	f := withSegments()
	var options []allwork.Option
	var ids []string
	for _, id := range []string{"a", "b", "c", "d", "e", "f", "g"} {
		options = append(options, allwork.Option{ID: id, Label: "Region " + id})
		ids = append(ids, id)
	}
	f.scope.Attributes[1].Options = options
	f.series[0].Attributes = map[string]allwork.AttrValue{regionAttr: {OptionIDs: ids}}
	return f
}

func TestSheets_048_FR021(t *testing.T) {
	t.Parallel()
	entry := NewReport(sevenRegions().service())

	sheets, err := entry.Sheets(t.Context(), actor.System, measure.Filter{Own: url.Values{"revenueBy": {regionAttr}}})
	if err != nil {
		t.Fatalf("Sheets() error = %v", err)
	}

	var keys []string
	for _, s := range sheets {
		keys = append(keys, s.Key)
	}
	want := []string{"revenue", "trend", "funnel", "conversion", "leagueRevenue", "leaguePerformance", "leagueCost", "leagueRoi"}
	if diff := cmp.Diff(want, keys); diff != "" {
		t.Fatalf("sheet keys (-want +got)\n%s", diff)
	}
	revenue := sheets[4].Sheet
	if len(revenue.Rows) != 1+8+1 || revenue.Rows[0][1] != sheet.Bold("Revenue (USD)") {
		t.Errorf("revenue league sheet has %d rows headed %v, want a head, seven regions, Not filled in and the total in USD",
			len(revenue.Rows), revenue.Rows[0][1])
	}
	if head := sheets[1].Sheet.Rows[0][2]; head != sheet.Bold("Actual (USD)") {
		t.Errorf("trend head = %v, want the display currency named", head)
	}
}
