package summary

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/platform/money"
)

func TestSegments_048_C4(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		cents int64
		value allwork.AttrValue
		want  map[string]int64
	}{
		{"no value counts under Not filled in", 1_000, allwork.AttrValue{}, map[string]int64{NotFilledIn: 1_000}},
		{"one value takes it all", 1_000, options("emea"), map[string]int64{"emea": 1_000}},
		{"equal shares add up exactly", 1_000, options("b", "a", "c"), map[string]int64{"a": 333, "b": 333, "c": 334}},
		{"a value repeated counts once", 1_000, options("a", "a"), map[string]int64{"a": 1_000}},
		{"a % split weights by its shares, as Revenue's ranked view", 1_000, split(map[string]int64{"emea": 8_000, "apac": 2_000}),
			map[string]int64{"emea": 800, "apac": 200}},
		{"a % split rounds each share half up", 999, split(map[string]int64{"a": 3_333, "b": 6_667}),
			map[string]int64{"a": 333, "b": 666}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if diff := cmp.Diff(tt.want, shares(tt.cents, tt.value)); diff != "" {
				t.Errorf("shares(%d, %v) (-want +got)\n%s", tt.cents, tt.value, diff)
			}
		})
	}
}

func options(ids ...string) allwork.AttrValue {
	return allwork.AttrValue{OptionIDs: ids}
}

func split(hundredths map[string]int64) allwork.AttrValue {
	out := allwork.AttrValue{Shares: map[string]money.Percent{}}
	for id, h := range hundredths {
		out.OptionIDs = append(out.OptionIDs, id)
		out.Shares[id] = money.PercentFromHundredths(h)
	}
	return out
}

func TestLeague_048_C5(t *testing.T) {
	t.Parallel()
	rows := []leagueRow{
		{Key: "f", Name: "Foxtrot", Value: ptr[int64](10)},
		{Key: NotFilledIn, Name: "Not filled in", Value: ptr[int64](90)},
		{Key: "a", Name: "Alpha", Value: ptr[int64](50)},
		{Key: "x", Name: "X-ray", Value: nil},
		{Key: "c", Name: "Charlie", Value: ptr[int64](50)},
		{Key: "b", Name: "Bravo", Value: ptr[int64](70)},
		{Key: "d", Name: "Delta", Value: ptr[int64](20)},
	}

	got := topFive(rows)

	want := []string{NotFilledIn, "b", "a", "c", "d"}
	var keys []string
	for _, r := range got {
		keys = append(keys, r.Key)
	}
	if diff := cmp.Diff(want, keys); diff != "" {
		t.Errorf("topFive() keys (-want +got)\n%s", diff)
	}
	if len(rows) != 7 || rows[0].Key != "f" {
		t.Errorf("topFive() changed its argument: %v", rows)
	}
}

func TestLeague_DashesLast_048_C5(t *testing.T) {
	t.Parallel()
	rows := []leagueRow{{Key: "x", Name: "X-ray"}, {Key: "a", Name: "Alpha", Value: ptr[int64](-5)}}

	got := topFive(rows)

	if len(got) != 2 || got[0].Key != "a" || got[1].Key != "x" {
		t.Errorf("topFive() = %v, want the valued row first and the dash last", got)
	}
}
