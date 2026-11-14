package activity

import (
	"errors"
	"testing"

	"mapp/internal/platform/errs"
)

func TestMoveToAllowsOnlyTheApprovalProcessMoves(t *testing.T) {
	cases := []struct {
		from, to Status
		allowed  bool
	}{
		{StatusCreated, StatusSubmitted, true},
		{StatusDeclined, StatusSubmitted, true},
		{StatusSubmitted, StatusSubmitted, true},
		{StatusSubmitted, StatusApproved, true},
		{StatusSubmitted, StatusDeclined, true},
		{StatusApproved, StatusCreated, true},
		{StatusDeclined, StatusCreated, true},
		{StatusSubmitted, StatusCreated, true},
		{StatusCreated, StatusApproved, true},
		{StatusDeclined, StatusApproved, true},
		{StatusCreated, StatusDeclined, false},
		{StatusApproved, StatusSubmitted, false},
		{StatusApproved, StatusDeclined, false},
	}
	for _, c := range cases {
		a := Activity{Name: "Launch", Status: c.from}
		err := a.MoveTo(c.to)
		var e *errs.Error
		switch {
		case c.allowed && (err != nil || a.Status != c.to):
			t.Errorf("%s → %s: got %v, status %s; want the move", c.from, c.to, err, a.Status)
		case !c.allowed && (!errors.As(err, &e) || e.Code != errs.CodeNotAllowed || a.Status != c.from):
			t.Errorf("%s → %s: got %v, status %s; want notAllowed and no change", c.from, c.to, err, a.Status)
		}
	}
}
