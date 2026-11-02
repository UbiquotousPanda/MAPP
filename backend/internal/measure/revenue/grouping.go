package revenue

import (
	"slices"
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/platform/money"
)

const (
	GroupPlan  = "plan"
	GroupOwner = "owner"
	groupAttr  = "attr:"
)

const (
	keyNone          = "none"
	labelNoOwner     = "No owner"
	labelNotFilledIn = "Not filled in"
)

// groupShare is one group an entry belongs to; part is its share under a % split, nil for all of it. Shared
// by both reports, since group membership never depends on which figures a node carries.
type groupShare struct {
	key, label string
	part       *money.Percent
}

func groupsOf(byID map[string]allwork.Node, attributes map[string]allwork.Attribute, id, group string) []groupShare {
	n := byID[id]
	switch {
	case group == GroupPlan:
		plan := byID[n.PlanID]
		return []groupShare{{key: plan.ID, label: plan.Name}}
	case group == GroupOwner && n.Owner != nil:
		return []groupShare{{key: n.Owner.ID, label: n.Owner.Name}}
	case group == GroupOwner:
		return []groupShare{{key: keyNone, label: labelNoOwner}}
	case strings.HasPrefix(group, groupAttr):
		return attributeGroups(byID, attributes, id, strings.TrimPrefix(group, groupAttr))
	}
	return []groupShare{{key: GroupNone}}
}

// attributeGroups follows the value of the record or its nearest ancestor that has one; a % split counts by share.
func attributeGroups(byID map[string]allwork.Node, attributes map[string]allwork.Attribute, id, attributeID string) []groupShare {
	value, found := attributeValue(byID, id, attributeID)
	if !found {
		return []groupShare{{key: keyNone, label: labelNotFilledIn}}
	}
	if value.Yes != nil {
		if *value.Yes {
			return []groupShare{{key: "yes", label: "Yes"}}
		}
		return []groupShare{{key: "no", label: "No"}}
	}
	attribute := attributes[attributeID]
	out := make([]groupShare, 0, len(value.OptionIDs))
	for _, optionID := range value.OptionIDs {
		g := groupShare{key: optionID, label: optionID}
		for _, option := range attribute.Options {
			if option.ID == optionID {
				g.label = option.Label
			}
		}
		if p, split := value.Shares[optionID]; split {
			g.part = &p
		}
		out = append(out, g)
	}
	return out
}

func attributeValue(byID map[string]allwork.Node, id, attributeID string) (allwork.AttrValue, bool) {
	for n, ok := byID[id]; ok; n, ok = byID[n.ParentID] {
		if value, has := n.Attrs[attributeID]; has && (value.Yes != nil || len(value.OptionIDs) > 0) {
			return value, true
		}
	}
	return allwork.AttrValue{}, false
}

// trailOf is the drilled record and its ancestors, from the plan down.
func trailOf(byID map[string]allwork.Node, id string) []TrailStep {
	var trail []TrailStep
	for n, ok := byID[id]; ok; n, ok = byID[n.ParentID] {
		trail = append(trail, TrailStep{ID: n.ID, Level: string(n.Level), Name: n.Name})
	}
	slices.Reverse(trail)
	return trail
}

// inViewSet is every matched id, the only ones a drill parameter may name.
func inViewSet(m allwork.Matched) map[string]bool {
	inView := map[string]bool{}
	for _, ids := range [][]string{m.Plans, m.Campaigns, m.Initiatives, m.Activities} {
		for _, id := range ids {
			inView[id] = true
		}
	}
	return inView
}
