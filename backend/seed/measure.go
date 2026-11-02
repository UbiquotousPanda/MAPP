package seed

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"time"

	"mapp/internal/people"
	"mapp/internal/platform/ids"
)

//go:embed measure.json
var measureJSON []byte

const measureTeam = "Measure demo"

// WithMeasure adds the Measure demo plan last, so no demo or showcase ID moves and the plain seed stays (D-354).
func WithMeasure() Option {
	return func(o *options) { o.measure = true }
}

const MeasureLoaded = "1 team, 1 plan, 2 campaigns, 3 initiatives, 9 activities, 13 line items (4 with SWBS codes), " +
	"1 approval workflow, 13 approval rounds, 7 purchase requests, 6 financial transactions"

// addMeasure adds the Measure demo data (#48) after the demo story: new records only, never a change (D-354).
func (d *demo) addMeasure(ctx context.Context) error {
	var file measureFile
	if err := json.Unmarshal(measureJSON, &file); err != nil {
		return fmt.Errorf("seed: measure.json: %w", err)
	}
	if err := d.addMeasureTeam(ctx); err != nil {
		return err
	}
	lists := &showcaseLists{presets: file.Presets}
	for _, p := range file.Plans {
		lists.addPlan(p)
	}
	steps := []func(context.Context) error{
		func(ctx context.Context) error { return d.putPlans(ctx, lists.plans) },
		func(ctx context.Context) error { return d.putCampaigns(ctx, lists.campaigns) },
		func(ctx context.Context) error { return d.putActivities(ctx, lists.activities) },
		func(ctx context.Context) error { return d.putLineItems(ctx, lists.lineItems) },
		func(ctx context.Context) error { return d.putRounds(ctx, measureRounds(file.Plans[0].Name)) },
		func(ctx context.Context) error { return d.addMeasurePurchases(ctx, file) },
	}
	for _, step := range steps {
		if err := step(ctx); err != nil {
			return err
		}
	}
	return nil
}

// addMeasureTeam has no members: only All markets roles see its plan, so the team-scoped demo stays as it is.
func (d *demo) addMeasureTeam(ctx context.Context) error {
	id, err := d.next(ctx, ids.PrefixTeam)
	if err != nil {
		return err
	}
	team := people.Team{ID: id, Name: measureTeam, Colour: "orange", Active: true, Meta: d.meta(),
		Description: "The Measure demo plan: every month, every approval state and the GSAP link at work."}
	d.teams[measureTeam] = id
	return d.stores.People.PutTeam(ctx, team)
}

// measureRounds approve activities 1, 4, 7, 12 and 40 days ago, filling every GSAP wait band; one open, one declined.
func measureRounds(planName string) []demoRound {
	approved := func(activity string, ago int) demoRound {
		return demoRound{plan: planName, activity: activity, submittedBy: alexMorgan,
			submittedAgo: time.Duration(ago+1) * day, decisions: []demoDecision{{by: danielOkoro, ago: time.Duration(ago) * day}}}
	}
	return []demoRound{
		approved("Helix search and social, first half", 12),
		approved("Helix search and social, second half", 4),
		approved("Retargeting test", 1),
		approved("Tellus case studies", 40),
		approved("Tellus webinar series", 7),
		{plan: planName, activity: "Fleet expo Rotterdam", submittedBy: alexMorgan, submittedAgo: 3 * day},
		{plan: planName, activity: "Workshop roadshow Benelux", submittedBy: alexMorgan, submittedAgo: 6 * day,
			decisions: []demoDecision{{by: danielOkoro, ago: 5 * day, declined: true,
				comment: "Plan the roadshow after the Rotterdam expo, with one budget for both."}}},
	}
}
