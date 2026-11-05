package postinvestment

import (
	"testing"

	"mapp/internal/platform/money"
)

func amount(t *testing.T, text string) *money.Amount {
	t.Helper()
	a, err := money.ParseAmount(text)
	if err != nil {
		t.Fatalf("ParseAmount(%q): %v", text, err)
	}
	return &a
}

func TestROI_IsMarginLessCostOverCost_184(t *testing.T) {
	cases := []struct {
		name, spent, margin, want string
	}{
		{"gain", "100.00", "136.25", "36.25"},
		{"break even", "50.00", "50.00", "0.00"},
		{"loss", "3.00", "2.00", "-33.33"},
		{"no margin at all", "120.00", "0.00", "-100.00"},
		{"half rounds away from zero", "0.32", "0.33", "3.13"},
		{"negative half rounds away from zero", "0.32", "0.31", "-3.13"},
		{"under one per cent", "1000.00", "1000.10", "0.01"},
		{"largest amounts do not overflow", "999999999999999.99", "0.01", "-100.00"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := ROI(amount(t, c.spent), amount(t, c.margin))
			if got == nil || *got != c.want {
				t.Fatalf("ROI(%s, %s) = %v, want %s", c.spent, c.margin, got, c.want)
			}
		})
	}
}

func TestROI_IsNullUntilItCanBeWorkedOut_184(t *testing.T) {
	cases := []struct {
		name          string
		spent, margin *money.Amount
	}{
		{"no amount spent", nil, amount(t, "10.00")},
		{"no margin", amount(t, "10.00"), nil},
		{"nothing spent", amount(t, "0.00"), amount(t, "10.00")},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := ROI(c.spent, c.margin); got != nil {
				t.Fatalf("ROI = %s, want null", *got)
			}
		})
	}
}
