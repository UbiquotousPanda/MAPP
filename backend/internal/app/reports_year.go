package app

import (
	"context"
	"slices"

	"mapp/internal/allwork"
	"mapp/internal/campaign"
	"mapp/internal/lineitem"
	"mapp/internal/platform/date"
	"mapp/internal/settings"
)

const columnCompleteness = "completeness"

// reportsYear is the year Measure's reports read. A report that shows no completeness reads it from a lean copy
// of All work's source: no completeness, and no attribute or finance words below the plan, which take most of
// the read at volume. Every value the lean read does give is worked out by the same code as All work's.
type reportsYear struct {
	allWorkSource
}

func (r reportsYear) Year(ctx context.Context, year int, today date.Date, columns []string) (allwork.YearData, error) {
	if slices.Contains(columns, columnCompleteness) {
		return r.allWorkSource.Year(ctx, year, today, columns)
	}
	lean := r.allWorkSource
	lean.campaigns, lean.lean = lean.planningCampaigns, true
	return lean.Year(ctx, year, today, columns)
}

type activitiesForReports struct {
	activitiesForCampaigns
}

func (x activitiesForReports) Summaries(ctx context.Context, initiativeIDs []string) ([]campaign.ActivitySummary, error) {
	return x.svc.PlanningSummaries(ctx, initiativeIDs)
}

func (y *yearReader) missingCount(missing int) int {
	if y.s.lean {
		return 0
	}
	return missing
}

func (y *yearReader) addAttributeWords(fields map[string]allwork.Value, level settings.Level, values settings.AttributeValues) {
	if !y.s.lean {
		y.addAttributes(fields, level, values)
	}
}

func (y *yearReader) lineItemWords(ctx context.Context, fields map[string]allwork.Value, li lineitem.LineItem) error {
	if y.s.lean {
		return nil
	}
	if err := y.addFinanceFields(ctx, fields, li); err != nil {
		return err
	}
	y.addAttributes(fields, settings.LevelLineItem, li.Attributes)
	return nil
}
