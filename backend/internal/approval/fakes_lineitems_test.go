package approval

import (
	"context"
	"slices"

	"mapp/internal/platform/actor"
)

func (f *fakeActivities) SetLineItemApproval(_ context.Context, _ actor.Actor, activityID string, choice LineItemChoice) error {
	facts := f.facts[activityID]
	items := slices.Clone(facts.LineItems)
	for i, li := range items {
		if len(choice.Only) == 0 || slices.Contains(choice.Only, li.ID) {
			items[i].Approved = !slices.Contains(choice.HeldBack, li.ID)
		}
	}
	facts.LineItems = items
	f.facts[activityID] = facts
	return nil
}
