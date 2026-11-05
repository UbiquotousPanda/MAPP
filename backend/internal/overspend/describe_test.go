package overspend

import (
	"encoding/json"
	"testing"
)

// The activity log hands describe the numbers it decoded with UseNumber, so the tolerance arrives as json.Number.
func TestDescribe_SaysTheToleranceItWasGiven_DemoMVP4(t *testing.T) {
	t.Parallel()
	for _, value := range []any{json.Number("25"), float64(25)} {
		label, text, err := describe(t.Context(), fieldTolerance, value)
		if err != nil || label != labelTolerance || text != "25%" {
			t.Errorf("describe(%T 25) = %q, %q, %v; want %q, \"25%%\"", value, label, text, err, labelTolerance)
		}
	}
}
