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

type entry struct {
	key, path, name, purpose string
	requires                 authz.Permission // beyond reports.view; "" for none
	controls                 frameControls
	sections                 []string
}

type frameControls struct {
	noPlanFilters, period bool
	showOpensOn           string
}

func reports() []entry {
	return []entry{
		{KeyPerformance, "performance", "Performance",
			"Whether the year is on track: projected against goal, each funnel stage and what earned the revenue.", "",
			frameControls{period: true, showOpensOn: ShowCampaign}, []string{KeySummary, KeyRevenue, KeyFunnel}},
		{KeyBudget, "budget", "Budget and spend",
			"Budget, planned cost, committed and actual by month, and which plans, campaigns or activities lead or lag.", "",
			frameControls{period: true, showOpensOn: ShowCampaign}, []string{KeyPlanBudget}},
		{KeyPurchasing, "purchasing", "Purchasing",
			"What is committed to each vendor and owner, and each purchase request's way to its purchase order.", "",
			frameControls{}, []string{KeyPurchaseRequests, KeyGsapLink}},
		{KeyApprovals, "approvals", "Approvals",
			"How many approvals wait, how long decisions take, and every approval round.", "", frameControls{},
			[]string{KeyApprovals}},
		{KeyPlanData, "plan-data", "Plan data and access",
			"How plan data spreads across each Shell attribute and, for administrators, who has which role.", "",
			frameControls{period: true, showOpensOn: ShowActivity}, []string{KeyPlanDetails, KeyUserAccess}},
	}
}

func sections() []entry {
	return []entry{
		{KeyPlanBudget, "plan-budget", "Plan budget", "", "", frameControls{period: true, showOpensOn: ShowCampaign}, nil},
		{KeyPurchaseRequests, "purchase-requests", "Purchase requests", "", "", frameControls{}, nil},
		{KeyPlanDetails, "plan-details", "Plan details", "", "", frameControls{period: true, showOpensOn: ShowActivity}, nil},
		{KeyGsapLink, "gsap-link", "GSAP link", "", "", frameControls{}, nil},
		{KeyUserAccess, "user-access", "User access", "", authz.AccessManage, frameControls{noPlanFilters: true}, nil},
		{KeySummary, "summary", "Summary", "", "", frameControls{period: true}, nil},
		{KeyRevenue, "revenue", "Revenue", "", "", frameControls{period: true, showOpensOn: ShowCampaign}, nil},
		{KeyFunnel, "funnel", "Funnel stages", "", "", frameControls{period: true, showOpensOn: ShowCampaign}, nil},
	}
}

func entries() []entry {
	return append(reports(), sections()...)
}

func Keys() []string {
	var keys []string
	for _, e := range entries() {
		keys = append(keys, e.key)
	}
	return keys
}

func KeyOfPath(path string) (string, bool) {
	i := slices.IndexFunc(entries(), func(e entry) bool { return e.path == path })
	if i < 0 {
		return "", false
	}
	return entries()[i].key, true
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

func (r *Registry) Get(key string) (Report, bool) {
	report, found := r.reports[key]
	return report, found
}

// Catalogue lists the five reports in order; one is available once any of its sections is registered and built.
func (r *Registry) Catalogue(context.Context) ReportCatalogue {
	items := []ReportEntry{}
	for _, e := range reports() {
		available := slices.ContainsFunc(e.sections, func(key string) bool {
			report, found := r.reports[key]
			return found && report.Available()
		})
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

// openable refuses a report the person's roles do not open, as the catalogue leaves it out.
func openable(ctx context.Context, report string) error {
	i := slices.IndexFunc(entries(), func(e entry) bool { return e.key == report })
	if i < 0 {
		return errs.NotFound(msgNoReport)
	}
	if p := entries()[i].requires; p != "" {
		if a := authz.AvailableAnywhere(ctx, p); !a.Available {
			return errs.Forbidden(a.Reason)
		}
	}
	return nil
}
