package activity

import (
	"context"
	"slices"
	"strings"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
)

type restartLog struct {
	before, after Activity
	changes       []history.Change
	details       string
}

func (s *Service) logRestart(ctx context.Context, a actor.Actor, r restartLog) error {
	_, err := s.history.Log(ctx, a, history.LogInput{
		Kind: kindName, RecordID: r.after.ID, RecordName: r.after.Name, Action: history.ActionStatusChanged, Verb: restartVerb,
		Changes: []history.Change{{Field: fieldStatus, Old: mustJSON(r.before.Status), New: mustJSON(r.after.Status)}},
		Details: r.details,
	})
	if err != nil {
		return err
	}
	return s.hooks.ApprovalRestarted(ctx, a, r.before, r.after, r.changes)
}

// InApproval also covers the statuses shown as In progress and Complete, which are Submitted or Approved.
func InApproval(status Status) bool {
	return status == StatusSubmitted || status == StatusApproved
}

// RestartsApproval says whether changing fields (contract names) of an activity in status restarts its approval.
func RestartsApproval(status Status, fields []string) bool {
	return InApproval(status) && slices.ContainsFunc(reapprovalWords(), func(w struct{ field, words string }) bool {
		return slices.Contains(fields, w.field)
	})
}

// reapprovalWords are the activity's own fields whose change restarts approval (D-322), in the reason's order.
func reapprovalWords() []struct{ field, words string } {
	return []struct{ field, words string }{
		{fieldPlannedCost, "the planned cost"},
		{fieldStartDate, "the start date"},
		{fieldEndDate, "the end date"},
		{fieldOngoing, "ongoing (no end date)"},
	}
}

func reapprovalFields(before Activity, changes []history.Change) []string {
	if !InApproval(before.Status) {
		return nil
	}
	var words []string
	for _, w := range reapprovalWords() {
		if slices.ContainsFunc(changes, func(c history.Change) bool { return c.Field == w.field }) {
			words = append(words, w.words)
		}
	}
	return words
}

// joinWords joins words as a sentence does: "a", "a and b", "a, b and c".
func joinWords(words []string) string {
	if len(words) <= 1 {
		return strings.Join(words, "")
	}
	return strings.Join(words[:len(words)-1], ", ") + " and " + words[len(words)-1]
}
