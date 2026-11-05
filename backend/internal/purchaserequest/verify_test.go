package purchaserequest

import (
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

func TestLineNumberOf(t *testing.T) {
	t.Parallel()
	tests := map[string]int{"lines[0].amount": 1, "lines[11].currency": 12, "lines": 0, "name": 0, "lines[x].amount": 0, "lines[": 0}
	for field, want := range tests {
		if got := lineNumberOf(field); got != want {
			t.Errorf("032 FR-053 lineNumberOf(%q) = %d, want %d", field, got, want)
		}
	}
}

func TestVerdict_ProblemsListFieldProblemsFirstEachOnItsRecord_032_FR053_D404(t *testing.T) {
	t.Parallel()
	pr := PurchaseRequest{ID: "PR-1", Lines: []Line{{ID: "PRL-1"}, {ID: "PRL-2"}}}
	v := verdict{pr: pr, fields: errs.Problems{{Field: "ownerId", Message: "Choose a person."}, {Field: "lines[1].amount", Message: "Enter an amount."}},
		gates: []Problem{{Group: groupActivity, RecordID: "A-1", Message: "Activity 'Launch film' must be approved."}}}

	want := []Problem{
		{Field: "ownerId", Group: groupPurchaseRequest, RecordID: "PR-1", Message: "Choose a person."},
		{Field: "lines[1].amount", Group: groupLine, RecordID: "PRL-2", Message: "Enter an amount."},
		{Group: groupActivity, RecordID: "A-1", Message: "Activity 'Launch film' must be approved."},
	}
	if diff := cmp.Diff(want, v.problems()); diff != "" {
		t.Errorf("problems (-want +got):\n%s", diff)
	}
}

func TestGroupsOf_NewLinesAreNamedByTheirPosition_032_FR053_D404(t *testing.T) {
	t.Parallel()
	pr := PurchaseRequest{ID: "PR-1", Name: "Stand"}
	problems := []Problem{
		{Field: "lines[1].overallLimit", Group: groupLine, Message: "Overall limit — needed to submit"},
		{Field: "lines[2].overallLimit", Group: groupLine, Message: "Overall limit — needed to submit"},
	}

	var got []string
	for _, g := range groupsOf(pr, problems, nil) {
		got = append(got, g.Record.Name)
	}

	if want := []string{"Line 2", "Line 3"}; !slices.Equal(got, want) {
		t.Errorf("groups = %q, want %q", got, want)
	}
}

func TestInputOf_GivesTheSaveChecksWhatTheyParse_032_FR053_D404(t *testing.T) {
	t.Parallel()
	amount, _ := money.ParseAmount("9200.00")
	day, _ := date.Parse("2026-11-30")
	pr := PurchaseRequest{MoAApproverID: "U-1003", Lines: []Line{
		{ID: "PRL-1", LineItemID: "L-1006", Currency: "EUR", Amount: amount, DeliveryDate: day, OverallLimit: &amount},
		{ID: "PRL-2", LineItemID: "L-1007", Currency: "EUR", Amount: amount, DeliveryDate: day},
	}}

	in := inputOf(pr)

	got := []any{in.moaApprover(), in.Lines[0].Amount, in.Lines[0].DeliveryDate, *in.Lines[0].OverallLimit, in.Lines[1].OverallLimit == nil}
	want := []any{"U-1003", "9200.00", "2026-11-30", "9200.00", true}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("input (-want +got):\n%s", diff)
	}
}
