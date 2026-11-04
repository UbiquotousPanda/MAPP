package authz_test

import (
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/platform/authz"
)

func TestCatalogue(t *testing.T) {
	t.Parallel()
	t.Run("032 FR-049 purchase-request permissions are scoped, in group Purchase requests, after the financial ones", func(t *testing.T) {
		t.Parallel()
		var got []authz.PermissionInfo
		for _, p := range authz.Catalogue() {
			if p.Group == authz.GroupPurchaseRequests {
				got = append(got, p)
			}
		}
		want := []authz.PermissionInfo{
			{Key: authz.PurchaseRequestsEdit, Group: authz.GroupPurchaseRequests, Label: "Raise and edit purchase requests",
				Noun: "Raising and changing purchase requests", Scoped: true},
			{Key: authz.PurchaseRequestsDelete, Group: authz.GroupPurchaseRequests, Label: "Delete purchase requests",
				Noun: "Deleting purchase requests", Scoped: true},
			{Key: authz.PurchaseRequestsSubmit, Group: authz.GroupPurchaseRequests,
				Label: "Submit purchase requests for approval and recall them", Noun: "Submitting purchase requests", Scoped: true},
			{Key: authz.PurchaseRequestsList, Group: authz.GroupPurchaseRequests, Label: "See the Purchase requests page",
				Noun: "Seeing the Purchase requests page", Scoped: true},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("purchase-request permissions (-want +got):\n%s", diff)
		}
		wantGroups := []string{authz.GroupPlanning, authz.GroupFinance, authz.GroupPurchaseRequests, authz.GroupApprovals,
			authz.GroupGlobalBudgets, authz.GroupDashboards, authz.GroupAdministration}
		if diff := cmp.Diff(wantGroups, authz.Groups); diff != "" {
			t.Errorf("groups (-want +got):\n%s", diff)
		}
		all := authz.All()
		if all[14] != authz.FinanceImport || all[17] != authz.PurchaseRequestsEdit {
			t.Errorf("the purchase-request permissions follow the financial ones, 046's included: %v", all[13:19])
		}
	})
	t.Run("039 FR-002 reports.view is scoped, in group Plans and planning, right after data.export", func(t *testing.T) {
		t.Parallel()
		info, found := authz.Lookup(string(authz.ReportsView))
		want := authz.PermissionInfo{Key: authz.ReportsView, Group: authz.GroupPlanning, Label: "See reports",
			Noun: "Seeing reports", Scoped: true}
		if !found {
			t.Fatal("reports.view is not in the catalogue")
		}
		if diff := cmp.Diff(want, info); diff != "" {
			t.Errorf("reports.view (-want +got):\n%s", diff)
		}
		all := authz.All()
		if i := slices.Index(all, authz.ReportsView); i < 1 || all[i-1] != authz.DataExport {
			t.Errorf("reports.view follows data.export: %v", all)
		}
	})
	t.Run("051 FR-001 dashboard permissions are not scoped, in group Dashboards, after the global-budget ones", func(t *testing.T) {
		t.Parallel()
		var got []authz.PermissionInfo
		for _, p := range authz.Catalogue() {
			if p.Group == authz.GroupDashboards {
				got = append(got, p)
			}
		}
		want := []authz.PermissionInfo{
			{Key: authz.DashboardsView, Group: authz.GroupDashboards, Label: "See custom dashboards shared with them",
				Noun: "Seeing dashboards"},
			{Key: authz.DashboardsBuild, Group: authz.GroupDashboards, Label: "Build dashboards and upload data",
				Noun: "Building dashboards"},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("dashboard permissions (-want +got):\n%s", diff)
		}
		all := authz.All()
		if all[24] != authz.GlobalBudgetsManage || all[25] != authz.DashboardsView || all[27] != authz.SettingsManage {
			t.Errorf("the dashboard permissions sit between the global-budget and administration ones: %v", all[24:28])
		}
	})
}
