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
	part       *Slice
}

// Slice is a split entry's share up to To less its share up to From, so the rounded parts add up to the entry exactly.
type Slice struct{ From, To money.Percent }

func (s Slice) OfWhole(n int64) int64 { return s.To.OfWhole(n) - s.From.OfWhole(n) }

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
// applies to what is below it (client spec 016); a % split counts by share (D-270), a plain multiple choice equally.
func (x *Index) attributeGroups(id, attributeID string) []share {
	value, found := x.attributeValue(id, attributeID)
	if !found {
		return []share{{key: keyNone, label: labelNotFilledIn}}
	}
	if value.Yes != nil {
		return []share{yesNoGroup(*value.Yes)}
	}
	return optionGroups(value, x.attributes[attributeID].Options)
}

func yesNoGroup(yes bool) share {
	if yes {
		return share{key: "yes", label: "Yes"}
	}
	return share{key: "no", label: "No"}
}

func optionGroups(value allwork.AttrValue, options []allwork.Option) []share {
	equal := equalShares(len(value.OptionIDs))
	out := make([]share, 0, len(value.OptionIDs))
	var from money.Percent
	for i, optionID := range value.OptionIDs {
		g := share{key: optionID, label: optionLabel(options, optionID)}
		p, split := value.Shares[optionID]
		if !split && len(equal) > 1 {
			p, split = equal[i], true
		}
		if split {
			to := money.PercentFromHundredths(from.Hundredths() + p.Hundredths())
			g.part, from = &Slice{From: from, To: to}, to
		}
		out = append(out, g)
	}
	return out
}

func optionLabel(options []allwork.Option, optionID string) string {
	for _, option := range options {
		if option.ID == optionID {
			return option.Label
		}
	}
	return optionID
}

// equalShares split a plain multiple choice 100/n each, the first options taking the remainder of 100.00 %.
func equalShares(n int) []money.Percent {
	if n == 0 {
		return nil
	}
	whole := money.Hundred.Hundredths()
	out := make([]money.Percent, n)
	for i := range out {
		h := whole / int64(n)
		if int64(i) < whole%int64(n) {
			h++
		}
		out[i] = money.PercentFromHundredths(h)
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
