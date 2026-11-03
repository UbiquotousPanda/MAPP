package projection_test

import (
	"math"
	"testing"

	"mapp/internal/projection"
)

func TestConversionRate_RoundsHalfUpToOneDecimalInWholeNumbers_FR017(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name             string
		actual, previous int64
		want             float64
		ok               bool
	}{
		{name: "23 of 80 is 28.75, which a float would round down", actual: 23, previous: 80, want: 28.8, ok: true},
		{name: "1 of 8 is exactly 12.5", actual: 1, previous: 8, want: 12.5, ok: true},
		{name: "1 of 3 rounds down", actual: 1, previous: 3, want: 33.3, ok: true},
		{name: "2 of 3 rounds up", actual: 2, previous: 3, want: 66.7, ok: true},
		{name: "nothing converted", actual: 0, previous: 40, want: 0, ok: true},
		{name: "more than the stage before", actual: 3, previous: 2, want: 150, ok: true},
		{name: "no previous stage", actual: 5, previous: 0, ok: false},
		{name: "huge counts do not overflow", actual: math.MaxInt64 / 2, previous: math.MaxInt64, want: 50, ok: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, ok := projection.ConversionRate(tt.actual, tt.previous)
			if ok != tt.ok || got != tt.want {
				t.Errorf("ConversionRate(%d, %d) = %v, %v; want %v, %v", tt.actual, tt.previous, got, ok, tt.want, tt.ok)
			}
		})
	}
}
