package activity

import (
	"fmt"
	"slices"

	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
)

const msgStatusMove = "'%s' can't go from %s to %s. Reload to see its status now."

func displayStatus(a Activity, today date.Date) DisplayStatus {
	if a.Status != StatusApproved {
		return DisplayStatus(a.Status)
	}
	switch {
	case !a.Ongoing && a.EndDate != nil && today.After(*a.EndDate):
		return DisplayComplete
	case a.StartDate != nil && !today.Before(*a.StartDate):
		return DisplayInProgress
	}
	return DisplayApproved
}

var statusWords = map[Status]string{
	StatusCreated: "Created", StatusSubmitted: "Submitted", StatusDeclined: "Declined", StatusApproved: "Approved",
}

var nextStatuses = map[Status][]Status{ //nolint:gochecknoglobals // a fixed transition table
	StatusCreated:   {StatusSubmitted, StatusApproved},
	StatusDeclined:  {StatusSubmitted, StatusApproved},
	StatusSubmitted: {StatusSubmitted, StatusApproved, StatusDeclined},
}

// MoveTo is the one writer of the stored status; a submission with no level to wait for approves at once.
func (a *Activity) MoveTo(to Status) error {
	if to != StatusCreated && !slices.Contains(nextStatuses[a.Status], to) {
		return errs.NotAllowed(fmt.Sprintf(msgStatusMove, a.Name, statusWords[a.Status], statusWords[to]))
	}
	a.Status = to
	return nil
}
