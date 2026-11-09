// Package attributiontest is the in-memory fake of the attribution store: the designated model, and 046's facts
// read from the performance fake's own table. Like the other fakes it applies no scope; the PostgreSQL store's
// scope-isolation tests cover that.
package attributiontest

import (
	"cmp"
	"context"
	"slices"
	"strings"

	"mapp/internal/activity"
	"mapp/internal/campaign"
	"mapp/internal/measure/attribution"
	"mapp/internal/performance"
	"mapp/internal/plan"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/fake"
)

const (
	settingsID   = "attribution"
	stageRevenue = "revenue"
)

type row struct {
	ID string `json:"id"`
	attribution.Settings
}

type Store struct {
	settings    *fake.Table[row]
	facts       *fake.Table[performance.Fact]
	sources     *fake.Table[performance.Source]
	activities  *fake.Table[activity.Activity]
	initiatives *fake.Table[campaign.Initiative]
	campaigns   *fake.Table[campaign.Campaign]
	plans       *fake.Table[plan.Plan]
}

func NewStore(db *fake.DB) Store {
	return Store{
		settings:    fake.TableOf(db, "attribution_settings", func(r row) string { return r.ID }),
		facts:       fake.TableOf(db, "performance_facts", func(f performance.Fact) string { return f.ID }),
		sources:     fake.TableOf(db, "performance_sources", func(s performance.Source) string { return s.ID }),
		activities:  fake.TableOf(db, "activities", func(a activity.Activity) string { return a.ID }),
		initiatives: fake.TableOf(db, "initiatives", func(i campaign.Initiative) string { return i.ID }),
		campaigns:   fake.TableOf(db, "campaigns", func(c campaign.Campaign) string { return c.ID }),
		plans:       fake.TableOf(db, "plans", func(p plan.Plan) string { return p.ID }),
	}
}

func (s Store) Settings(context.Context) (attribution.Settings, error) {
	r, found, err := s.settings.Get(settingsID)
	if err != nil || !found {
		return attribution.DefaultSettings(), err
	}
	return r.Settings, nil
}

func (s Store) PutSettings(ctx context.Context, st attribution.Settings) error {
	return s.settings.Put(ctx, row{ID: settingsID, Settings: st})
}

func (s Store) Conversions(_ context.Context, _ authz.Scope, activityIDs []string, year int) ([]attribution.RevenueFact, error) {
	journeys, err := s.journeysOf(activityIDs)
	if err != nil {
		return nil, err
	}
	facts, err := s.facts.Where(func(f performance.Fact) bool {
		inView := slices.Contains(activityIDs, f.ActivityID) || slices.Contains(journeys, f.JourneyRef)
		return inView && f.Counts() && f.Stage == stageRevenue && f.Amount != nil && f.FactDate.Year() == year
	})
	out := make([]attribution.RevenueFact, 0, len(facts))
	for _, f := range facts {
		out = append(out, attribution.RevenueFact{ID: f.ID, Source: s.sourceName(f.SourceID), Reference: f.SourceReference,
			ActivityID: f.ActivityID, Date: dateOf(f), Revenue: *f.Amount, JourneyRef: f.JourneyRef})
	}
	return out, err
}

func (s Store) sourceName(id string) string {
	source, _, _ := s.sources.Get(id)
	return source.Name
}

func (s Store) journeysOf(activityIDs []string) ([]string, error) {
	facts, err := s.facts.Where(func(f performance.Fact) bool {
		return f.Counts() && f.JourneyRef != "" && slices.Contains(activityIDs, f.ActivityID)
	})
	refs := make([]string, 0, len(facts))
	for _, f := range facts {
		refs = append(refs, f.JourneyRef)
	}
	return refs, err
}

func (s Store) Touches(_ context.Context, _ authz.Scope, journeyRefs []string) ([]attribution.JourneyTouch, error) {
	facts, err := s.facts.Where(func(f performance.Fact) bool {
		return f.Counts() && f.Stage != stageRevenue && slices.Contains(journeyRefs, f.JourneyRef)
	})
	var out []attribution.JourneyTouch
	for _, f := range facts {
		t := attribution.JourneyTouch{JourneyRef: f.JourneyRef, Touch: attribution.Touch{ActivityID: f.ActivityID, Date: dateOf(f)},
			Kind: cmp.Or(f.Stage, string(f.WebMetric))}
		if !slices.Contains(out, t) {
			out = append(out, t)
		}
	}
	return out, err
}

func (s Store) ActivitiesInScope(_ context.Context, _ authz.Scope, ids []string) ([]attribution.ActivityName, error) {
	var out []attribution.ActivityName
	for _, id := range ids {
		a, found, err := s.activities.Get(id)
		if err != nil || !found {
			if err != nil {
				return nil, err
			}
			continue
		}
		p, err := s.planOf(a.InitiativeID)
		if err != nil {
			return nil, err
		}
		out = append(out, attribution.ActivityName{ID: a.ID, Name: a.Name, Status: string(a.Status), PlanID: p.ID, PlanName: p.Name})
	}
	slices.SortFunc(out, func(x, y attribution.ActivityName) int { return strings.Compare(x.ID, y.ID) })
	return out, nil
}

func (s Store) planOf(initiativeID string) (plan.Plan, error) {
	i, _, err := s.initiatives.Get(initiativeID)
	if err != nil {
		return plan.Plan{}, err
	}
	c, _, err := s.campaigns.Get(i.CampaignID)
	if err != nil {
		return plan.Plan{}, err
	}
	p, _, err := s.plans.Get(c.PlanID)
	return p, err
}

func (s Store) HeldFacts(_ context.Context, _ authz.Scope, activityID string, journeyRefs []string) (int, error) {
	held, err := s.facts.Where(func(f performance.Fact) bool {
		around := f.ActivityID == activityID || slices.Contains(journeyRefs, f.JourneyRef)
		return f.Held && f.ReplacedByID == "" && around
	})
	return len(held), err
}

func dateOf(f performance.Fact) date.Date {
	return date.New(f.FactDate.Year(), f.FactDate.Month(), f.FactDate.Day())
}
