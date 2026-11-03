package revenue

import (
	"strings"
	"testing"

	"mapp/internal/platform/sheet"
)

func TestFunnelCardsSheet_ConversionKeepsItsDecimals_FR007(t *testing.T) {
	t.Parallel()
	conversion, performance := 2.5, 73.0
	cards := FunnelCards{Conversion: NumberCard{Value: &conversion}, Performance: PerformanceCard{NumberCard: NumberCard{Value: &performance}}}

	var out strings.Builder
	if err := sheet.WriteCSV(&out, nil, funnelCardsSheet(StageMQL, cards).Rows); err != nil {
		t.Fatalf("WriteCSV: %v", err)
	}

	csv := out.String()
	if !strings.Contains(csv, "Conversion (%),2.50\n") {
		t.Errorf("conversion row of\n%s\nwant 2.50: a 2.5%% conversion must not export as 2", csv)
	}
	if !strings.Contains(csv, "Performance (%),73\n") {
		t.Errorf("performance row of\n%s\nwant 73: a whole per cent stays whole", csv)
	}
}
