// Package attributiontest is the in-memory fake of the attribution store: the designated model, and 046's facts
// read from the performance fake's own table. Like the other fakes it applies no scope; the PostgreSQL store's
// scope-isolation test covers that.
package attributiontest

import (
	"context"
	"slices"

	"mapp/internal/measure/attribution"
	"mapp/internal/performance"
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
	settings *fake.Table[row]
	facts    *fake.Table[performance.Fact]
}

func NewStore(db *fake.DB) Store {
	return Store{
		settings: fake.TableOf(db, "attribution_settings", func(r row) string { return r.ID }),
		facts:    fake.TableOf(db, "performance_facts", func(f performance.Fact) string { return f.ID }),
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
		out = append(out, attribution.RevenueFact{ActivityID: f.ActivityID, Date: dateOf(f), Revenue: *f.Amount,
			JourneyRef: f.JourneyRef})
	}
	return out, err
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
		t := attribution.JourneyTouch{JourneyRef: f.JourneyRef, Touch: attribution.Touch{ActivityID: f.ActivityID, Date: dateOf(f)}}
		if !slices.Contains(out, t) {
			out = append(out, t)
		}
	}
	return out, err
}

func dateOf(f performance.Fact) date.Date {
	return date.New(f.FactDate.Year(), f.FactDate.Month(), f.FactDate.Day())
}
