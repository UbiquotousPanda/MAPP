package measure

import (
	"context"
	"net/url"
	"slices"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
)

const (
	selectorStage = "stage"
	selectorTab   = "tab"
)

// section is an old report, or the widgets listed of it (nil: all), inside a report: value "" shows it whatever the
// selector says, keep lists the own parameters it reads (nil: all), requires is a permission beyond reports.view.
type section struct {
	key, value, label string
	widgets, keep     []string
	requires          authz.Permission
	noPlanFilters     bool
}

// composed is a report of the catalogue: the sections its stage or tab shows, from the reports registered under them.
type composed struct {
	e       entry
	reports map[string]Report
}

func (c composed) Key() string { return c.e.key }

func (c composed) Available() bool {
	return slices.ContainsFunc(c.e.sections, func(s section) bool {
		report, found := c.reports[s.key]
		return found && report.Available()
	})
}

// Params are the selector and every section's own parameters, so a saved view keeps its stage or tab and controls.
func (c composed) Params() []string {
	var params []string
	if c.e.selector != "" {
		params = append(params, c.e.selector)
	}
	for _, s := range c.e.sections {
		if p, ok := c.reports[s.key].(Parameterised); ok {
			params = append(params, p.Params()...)
		}
	}
	slices.Sort(params)
	return slices.Compact(params)
}

// Sheets are the widgets of the sections shown for the address, each section reading only its own parameters.
func (c composed) Sheets(ctx context.Context, a actor.Actor, f Filter) ([]WidgetSheet, error) {
	sheets := []WidgetSheet{}
	for _, s := range c.e.shown(f.Own) {
		if p := s.requires; p != "" {
			if access := authz.AvailableAnywhere(ctx, p); !access.Available {
				return nil, errs.Forbidden(access.Reason)
			}
		}
		report, found := c.reports[s.key]
		if !found {
			continue
		}
		g := f
		g.Own = s.own(f.Own)
		got, err := report.Sheets(ctx, a, g)
		if err != nil {
			return nil, err
		}
		sheets = append(sheets, slices.DeleteFunc(got, func(ws WidgetSheet) bool {
			return s.widgets != nil && !slices.Contains(s.widgets, ws.Key)
		})...)
	}
	return sheets, nil
}

func (c composed) Describe(ctx context.Context, a actor.Actor, own url.Values) ([][2]string, error) {
	var lines [][2]string
	for _, s := range c.e.shown(own) {
		if s.label != "" {
			lines = append(lines, [2]string{"Section", s.label})
		}
		described, ok := c.reports[s.key].(Described)
		if !ok {
			continue
		}
		more, err := described.Describe(ctx, a, s.own(own))
		if err != nil {
			return nil, err
		}
		for _, line := range more {
			if !slices.Contains(lines, line) {
				lines = append(lines, line)
			}
		}
	}
	return lines, nil
}

// shown are the sections for the address's stage or tab; an unknown or missing one opens the report's default.
func (e entry) shown(own url.Values) []section {
	value := own.Get(e.selector)
	if value == "" || !slices.ContainsFunc(e.sections, func(s section) bool { return s.value == value }) {
		value = e.opening
	}
	return slices.DeleteFunc(slices.Clone(e.sections), func(s section) bool { return s.value != "" && s.value != value })
}

// controlsFor are the frame's controls for the address: those of the one section shown when it has no plan filters.
func (e entry) controlsFor(own url.Values) frameControls {
	if shown := e.shown(own); len(shown) == 1 && shown[0].noPlanFilters {
		return frameControls{noPlanFilters: true}
	}
	return e.controls
}

func (s section) own(own url.Values) url.Values {
	if s.keep == nil {
		return own
	}
	kept := url.Values{}
	for _, name := range s.keep {
		if v, given := own[name]; given {
			kept[name] = v
		}
	}
	return kept
}
