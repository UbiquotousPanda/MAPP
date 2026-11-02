package summary

import (
	"errors"
	"net/url"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/platform/errs"
)

func TestParseQuery_048_FR004(t *testing.T) {
	t.Parallel()
	own := url.Values{"category": {"CAT-1"}, "stage": {"revenue"}, "revenueBy": {"ATTR-1"}, "roiBy": {"ATTR-2"}}

	got, err := ParseQuery(own)

	want := Query{Category: "CAT-1", Stage: StageRevenue,
		Segments: map[string]string{TableRevenue: "ATTR-1", TableROI: "ATTR-2"}}
	if err != nil {
		t.Fatalf("ParseQuery() error = %v", err)
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("ParseQuery() (-want +got)\n%s", diff)
	}
}

func TestParseQuery_RefusesEveryMalformedParameter_048_FR004(t *testing.T) {
	t.Parallel()
	own := url.Values{"category": {"cat 1"}, "stage": {"inq"}, "costBy": {strings.Repeat("a", 41)}}

	_, err := ParseQuery(own)

	apiErr, ok := errors.AsType[*errs.Error](err)
	if !ok {
		t.Fatalf("ParseQuery() error = %v, want the problems", err)
	}
	var fields []string
	for _, f := range apiErr.Fields {
		fields = append(fields, f.Field)
	}
	if diff := cmp.Diff([]string{"category", "stage", "costBy"}, fields); diff != "" {
		t.Errorf("problem fields (-want +got)\n%s", diff)
	}
}

func TestParseLeague_048_FR004(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		table   string
		own     url.Values
		want    League
		wantErr bool
	}{
		{"a table with its segment and category", TableCost, url.Values{"segment": {"ATTR-3"}, "category": {Uncategorised}},
			League{Table: TableCost, Segment: "ATTR-3", Category: Uncategorised}, false},
		{"no segment takes the default later", TablePerformance, url.Values{},
			League{Table: TablePerformance}, false},
		{"an unknown table", "deals", url.Values{}, League{}, true},
		{"a malformed segment", TableRevenue, url.Values{"segment": {"a/b"}}, League{}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := ParseLeague(tt.table, tt.own)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseLeague(%q) error = %v, want error %v", tt.table, err, tt.wantErr)
			}
			if diff := cmp.Diff(tt.want, got); !tt.wantErr && diff != "" {
				t.Errorf("ParseLeague(%q) (-want +got)\n%s", tt.table, diff)
			}
		})
	}
}
