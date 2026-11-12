package measure

import (
	"context"
	"fmt"
	"net/url"
	"slices"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
)

// Report is one report of the catalogue as its feature builds it; Sheets gives its widgets for the export.
type Report interface {
	Key() string
	Available() bool
	Sheets(ctx context.Context, a actor.Actor, f Filter) ([]WidgetSheet, error)
}

// A report may have address parameters of its own (a tab, a sort) that views keep and the export says in words.
type (
	Parameterised interface {
		Params() []string
	}
	Described interface {
		Describe(ctx context.Context, a actor.Actor, own url.Values) ([][2]string, error)
	}
)

const (
	stageMQL, stageINQ                           = "mql", "inq"
	tabRequests, tabSwbs, tabWaiting, tabOrders  = "requests", "swbs", "waiting", "orders"
	tabCompleteness, tabPeople                   = "completeness", "people"
	nameRevenue, namePurchaseRequests            = "Revenue", "Purchase requests"
	paramVendor, paramOwner, paramStatus, paramQ = "vendor", "requestOwner", "status", "q"
	widgetStatus                                 = "status"
)

type entry struct {
	key, path, name, purpose string
	controls                 frameControls
	selector, opening        string
	sections                 []section
}

type frameControls struct {
	noPlanFilters, period bool
	showOpensOn           string
}

func reports() []entry {
	return []entry{
		{key: KeyPerformance, path: "performance", name: "Performance",
			purpose:  "Whether the year is on track: projected against goal, each funnel stage and what earned the revenue.",
			controls: frameControls{period: true, showOpensOn: ShowCampaign}, selector: selectorStage, opening: KeyRevenue,
			sections: []section{
				{key: KeySummary, widgets: []string{KeyRevenue, KeyFunnel, "conversion"}, keep: []string{"category"}},
				{key: KeyRevenue, value: KeyRevenue, label: nameRevenue},
				{key: KeyFunnel, value: stageMQL, label: "MQL"}, {key: KeyFunnel, value: stageINQ, label: "INQ"},
			}},
		{key: KeyBudget, path: "budget", name: "Budget and spend",
			purpose:  "Budget, planned cost, committed and actual by month, and which plans, campaigns or activities lead or lag.",
			controls: frameControls{period: true, showOpensOn: ShowCampaign}, sections: []section{{key: KeyPlanBudget}}},
		{key: KeyPurchasing, path: "purchasing", name: "Purchasing",
			purpose:  "What is committed to each vendor and owner, and each purchase request's way to its purchase order.",
			selector: selectorTab, opening: tabRequests, sections: purchasingSections()},
		{key: KeyApprovals, path: "approvals", name: "Approvals",
			purpose:  "How many approvals wait, how long decisions take, and every approval round.",
			sections: []section{{key: KeyApprovals}}},
		{key: KeyPlanData, path: "plan-data", name: "Plan data and access",
			purpose:  "How plan data spreads across each Shell attribute and, for administrators, who has which role.",
			controls: frameControls{period: true, showOpensOn: ShowActivity}, selector: selectorTab, opening: tabCompleteness,
			sections: []section{{key: KeyPlanDetails, value: tabCompleteness, label: "Data completeness"},
				{key: KeyUserAccess, value: tabPeople, label: "People", requires: authz.AccessManage,
					noPlanFilters: true}}},
	}
}

func purchasingSections() []section {
	return []section{
		{key: KeyPurchaseRequests, widgets: []string{"cards", widgetStatus, "byVendor", "byOwner"},
			keep: []string{paramVendor, paramOwner, paramStatus, paramQ}},
		{key: KeyPurchaseRequests, value: tabRequests, label: namePurchaseRequests, widgets: []string{"grid"}},
		{key: KeyGsapLink, value: tabSwbs, label: "Waiting for SWBS", widgets: []string{tabSwbs, "swbsBands"}},
		{key: KeyGsapLink, value: tabWaiting, label: "Waiting for GSAP", widgets: []string{tabWaiting}},
		{key: KeyGsapLink, value: tabOrders, label: "Purchase orders", widgets: []string{tabOrders}},
	}
}

// Keys are the section keys the reports register under, the old reports' keys.
func Keys() []string {
	var keys []string
	for _, e := range reports() {
		for _, s := range e.sections {
			if !slices.Contains(keys, s.key) {
				keys = append(keys, s.key)
			}
		}
	}
	return keys
}

func KeyOfPath(path string) (string, bool) {
	i := slices.IndexFunc(reports(), func(e entry) bool { return e.path == path })
	if i < 0 {
		return "", false
	}
	return reports()[i].key, true
}

// Registry holds the report of each key; app/measure.go fills it, one register function per report (D-369).
type Registry struct {
	reports map[string]Report
}

func NewRegistry() *Registry {
	return &Registry{reports: map[string]Report{}}
}

func (r *Registry) Register(report Report) error {
	key := report.Key()
	if !slices.Contains(Keys(), key) {
		return fmt.Errorf("register report %q: not in the catalogue", key)
	}
	if _, taken := r.reports[key]; taken {
		return fmt.Errorf("register report %q: registered twice", key)
	}
	r.reports[key] = report
	return nil
}

// Get gives a catalogue report composed of its sections, or the report registered under a section key.
func (r *Registry) Get(key string) (Report, bool) {
	if i := slices.IndexFunc(reports(), func(e entry) bool { return e.key == key }); i >= 0 {
		return composed{e: reports()[i], reports: r.reports}, true
	}
	report, found := r.reports[key]
	return report, found
}

// Catalogue lists the five reports in order; one is available once any of its sections is registered and built.
func (r *Registry) Catalogue(context.Context) ReportCatalogue {
	items := []ReportEntry{}
	for _, e := range reports() {
		available := composed{e: e, reports: r.reports}.Available()
		items = append(items, ReportEntry{Key: e.key, Path: e.path, Name: e.name, Purpose: e.purpose, Available: available})
	}
	return ReportCatalogue{Items: items}
}

type stub struct{ key string }

// Stub is a report not built yet: listed as coming soon, its export has only the frame's sheets.
func Stub(key string) Report { return stub{key: key} }

func (s stub) Key() string     { return s.key }
func (s stub) Available() bool { return false }

func (s stub) Sheets(context.Context, actor.Actor, Filter) ([]WidgetSheet, error) {
	return []WidgetSheet{}, nil
}

// openable refuses a report outside the catalogue; a section's own permission is checked when it is shown.
func openable(report string) error {
	if !slices.ContainsFunc(reports(), func(e entry) bool { return e.key == report }) {
		return errs.NotFound(msgNoReport)
	}
	return nil
}
