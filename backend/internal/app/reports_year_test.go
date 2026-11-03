package app

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"

	"mapp/internal/allwork"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

var sameAmounts = cmp.Options{
	cmp.Comparer(func(x, y money.Amount) bool { return x.Cmp(y) == 0 }),
	cmpopts.EquateComparable(date.Date{}, money.Percent{}),
}

// yearsOf reads the seeded 2026 year with columns twice: through All work's source and through the reports' year.
func yearsOf(t *testing.T, columns []string) (full, reports allwork.YearData) {
	t.Helper()
	built, db := newSeededApp(t)
	source := built.allWork.(allWorkSource)
	today := date.MustParse("2026-03-12")
	err := db.Read(t.Context(), func(ctx context.Context) error {
		var err error
		if full, err = source.Year(ctx, 2026, today, columns); err != nil {
			return err
		}
		reports, err = reportsYear{source}.Year(ctx, 2026, today, columns)
		return err
	})
	if err != nil {
		t.Fatalf("Year: %v", err)
	}
	return full, reports
}

func TestReportsYear_LeanReadKeepsEveryOtherValue_039_FR007_132(t *testing.T) {
	t.Parallel()
	for name, columns := range map[string][]string{"no columns": nil, "goals": {"inq", "mql", "revenue"}} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			full, lean := yearsOf(t, columns)
			if len(lean.Nodes) != len(full.Nodes) {
				t.Fatalf("lean read: %d nodes, full read: %d", len(lean.Nodes), len(full.Nodes))
			}
			left := 0
			for i, f := range full.Nodes {
				left += compareLean(t, f, lean.Nodes[i])
			}
			if left == 0 {
				t.Error("the full read has no completeness or attribute words the lean one leaves out: nothing was compared")
			}
		})
	}
}

// compareLean reports where the lean node l differs from the full node f beyond what a lean read leaves out, and
// returns how much it left out.
func compareLean(t *testing.T, f, l allwork.Node) int {
	t.Helper()
	if diff := cmp.Diff(f, l, sameAmounts, cmpopts.IgnoreFields(allwork.Node{}, "Missing", "Fields")); diff != "" {
		t.Errorf("%s %s (-full +lean):\n%s", f.Level, f.ID, diff)
	}
	for key, value := range l.Fields {
		if diff := cmp.Diff(f.Fields[key], value, sameAmounts); diff != "" {
			t.Errorf("%s %s field %s (-full +lean):\n%s", f.Level, f.ID, key, diff)
		}
	}
	if f.Level == allwork.LevelPlan && len(l.Fields) != len(f.Fields) {
		t.Errorf("plan %s: %d fields, want all %d (the BCPIR filter reads them)", f.ID, len(l.Fields), len(f.Fields))
	}
	if l.Missing != 0 {
		t.Errorf("%s %s: Missing %d, want 0: a lean read works out no completeness", f.Level, f.ID, l.Missing)
	}
	return f.Missing + len(f.Fields) - len(l.Fields)
}

func TestReportsYear_CompletenessAskedReadsTheFullYear_043_132(t *testing.T) {
	t.Parallel()
	full, reports := yearsOf(t, []string{columnCompleteness, "inq", "mql", "revenue"})
	if diff := cmp.Diff(full, reports, sameAmounts); diff != "" {
		t.Errorf("year (-All work +reports):\n%s", diff)
	}
}
