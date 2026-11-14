package allwork

import (
	"context"

	"mapp/internal/platform/authz"
)

// exportable are the plans of data that data.export covers, the rule of PlanAccess.export.
func exportable(ctx context.Context, data YearData) map[string]bool {
	scope := authz.PermissionScopeOf(ctx, authz.DataExport)
	plans := map[string]bool{}
	for _, n := range data.Nodes {
		if n.Level == LevelPlan && scope.Covers(n.PlanAccess) {
			plans[n.PlanID] = true
		}
	}
	return plans
}

func onlyExportable(ctx context.Context, data YearData) YearData {
	plans := exportable(ctx, data)
	kept := make([]Node, 0, len(data.Nodes))
	for _, n := range data.Nodes {
		if plans[n.PlanID] {
			kept = append(kept, n)
		}
	}
	data.Nodes = kept
	return data
}
