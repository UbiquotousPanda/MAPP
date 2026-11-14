package app

import (
	"context"
	"encoding/json"
	"fmt"

	"mapp/internal/history"
	"mapp/internal/plan"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
)

const (
	binnedAmountsLevel = "binnedAmounts"
	jsonNull           = "null"
)

// binnedAmounts lets records in the recycle bin lock the plan currency too: a restore would bring their amounts
// back in the old one.
func binnedAmounts(h *history.Service) plan.Level {
	addFacts := func(ctx context.Context, _ []string, facts map[string]*plan.Facts) error {
		entries, err := h.ListBin(authz.Unrestricted(ctx), actor.System)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			f, inPlan := facts[planOfEntry(entry)]
			if !inPlan {
				continue
			}
			n, err := amountsIn(entry.Snapshots)
			if err != nil {
				return err
			}
			f.AmountsSet += n
		}
		return nil
	}
	return plan.Level{Name: binnedAmountsLevel, AddFacts: addFacts,
		Copy: func(context.Context, *plan.CopyJob) error { return nil }}
}

func planOfEntry(entry history.BinEntry) string {
	if len(entry.Path) > 0 && entry.Path[0].Type == planKind {
		return entry.Path[0].ID
	}
	return ""
}

func amountsIn(snapshots []history.Snapshot) (int, error) {
	n := 0
	for _, s := range snapshots {
		field := amountField(s.Kind)
		if field == "" {
			continue
		}
		var fields map[string]json.RawMessage
		if err := json.Unmarshal(s.Data, &fields); err != nil {
			return 0, fmt.Errorf("app: read %s %s in the recycle bin: %w", s.Kind, s.ID, err)
		}
		if amount := fields[field]; len(amount) > 0 && string(amount) != jsonNull {
			n++
		}
	}
	return n, nil
}

// amountField names the amount a plan's currency lock counts, as the bin snapshot of a kind stores it.
func amountField(kind string) string {
	switch kind {
	case campaignLevel, initiativeLevel:
		return fieldBudget
	case fieldActivity:
		return "plannedCost"
	}
	return ""
}
