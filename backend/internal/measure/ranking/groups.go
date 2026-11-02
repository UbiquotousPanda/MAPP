package ranking

import (
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/platform/money"
)

const (
	keyNone          = "none"
	labelNoOwner     = "No owner"
	labelNotFilledIn = "Not filled in"
)

// share is one group an entry belongs to; part is its share of the entry under a % split, nil for all of it.
type share struct {
	key, label string
	part       *money.Percent
}

func (x *Index) groupsOf(id, group string) []share {
	n := x.byID[id]
	switch {
	case group == GroupPlan:
		plan := x.byID[n.PlanID]
		return []share{{key: plan.ID, label: plan.Name}}
	case group == GroupOwner && n.Owner != nil:
		return []share{{key: n.Owner.ID, label: n.Owner.Name}}
	case group == GroupOwner:
		return []share{{key: keyNone, label: labelNoOwner}}
	case strings.HasPrefix(group, groupAttr):
		return x.attributeGroups(id, strings.TrimPrefix(group, groupAttr))
	}
	return []share{{key: GroupNone}}
}

// attributeGroups follow the value of the record or of its nearest ancestor that has one, as a campaign's value
// applies to what is below it (client 016 FR-066); a % split counts by share (D-270).
func (x *Index) attributeGroups(id, attributeID string) []share {
	value, found := x.attributeValue(id, attributeID)
	if !found {
		return []share{{key: keyNone, label: labelNotFilledIn}}
	}
	if value.Yes != nil {
		if *value.Yes {
			return []share{{key: "yes", label: "Yes"}}
		}
		return []share{{key: "no", label: "No"}}
	}
	attribute := x.attributes[attributeID]
	out := make([]share, 0, len(value.OptionIDs))
	for _, optionID := range value.OptionIDs {
		g := share{key: optionID, label: optionID}
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

func (x *Index) attributeValue(id, attributeID string) (allwork.AttrValue, bool) {
	for n, ok := x.byID[id]; ok; n, ok = x.byID[n.ParentID] {
		if value, has := n.Attrs[attributeID]; has && (value.Yes != nil || len(value.OptionIDs) > 0) {
			return value, true
		}
	}
	return allwork.AttrValue{}, false
}
