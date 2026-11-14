package attribution

import (
	"cmp"
	"context"
	"fmt"
	"time"

	"mapp/internal/platform/authz"
	"mapp/internal/platform/database/sqlcdb"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

func (s *PostgresStore) Conversions(ctx context.Context, scope authz.Scope, activityIDs []string, year int) ([]RevenueFact, error) {
	rows, err := s.db.Queries(ctx).AttributionConversions(ctx, sqlcdb.AttributionConversionsParams{
		ActivityIds: activityIDs, Year: year,
		SeesEverything: scope.Everything, ViewerID: scope.PersonID, ViewsPlans: scope.Holds, ViewerTeamIds: scope.TeamIDs,
	})
	if err != nil {
		return nil, fmt.Errorf("select the revenue facts of %d activities: %w", len(activityIDs), err)
	}
	facts := make([]RevenueFact, 0, len(rows))
	for _, r := range rows {
		facts = append(facts, RevenueFact{ID: r.ID, Source: r.SourceName, Reference: r.SourceReference,
			ActivityID: r.ActivityID, Date: dateOf(r.FactDate), JourneyRef: r.JourneyRef,
			Revenue: money.Money{Amount: money.FromCents(r.AmountMinor), Currency: r.Currency}})
	}
	return facts, nil
}

func (s *PostgresStore) Touches(ctx context.Context, scope authz.Scope, journeyRefs []string) ([]JourneyTouch, error) {
	if len(journeyRefs) == 0 {
		return nil, nil
	}
	rows, err := s.db.Queries(ctx).AttributionTouches(ctx, sqlcdb.AttributionTouchesParams{
		JourneyRefs:    journeyRefs,
		SeesEverything: scope.Everything, ViewerID: scope.PersonID, ViewsPlans: scope.Holds, ViewerTeamIds: scope.TeamIDs,
	})
	if err != nil {
		return nil, fmt.Errorf("select the touches of %d journeys: %w", len(journeyRefs), err)
	}
	touches := make([]JourneyTouch, 0, len(rows))
	for _, r := range rows {
		touches = append(touches, JourneyTouch{JourneyRef: r.JourneyRef, Kind: cmp.Or(r.Stage, r.WebMetric),
			Touch: Touch{ActivityID: r.ActivityID, Date: dateOf(r.FactDate)}})
	}
	return touches, nil
}

func (s *PostgresStore) ActivitiesInScope(ctx context.Context, scope authz.Scope, ids []string) ([]ActivityName, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := s.db.Queries(ctx).AttributionActivityNames(ctx, sqlcdb.AttributionActivityNamesParams{
		ActivityIds:    ids,
		SeesEverything: scope.Everything, ViewerID: scope.PersonID, ViewsPlans: scope.Holds, ViewerTeamIds: scope.TeamIDs,
	})
	if err != nil {
		return nil, fmt.Errorf("select the names of %d activities: %w", len(ids), err)
	}
	names := make([]ActivityName, 0, len(rows))
	for _, r := range rows {
		names = append(names, ActivityName{ID: r.ID, Name: r.Name, Status: r.Status, PlanID: r.PlanID, PlanName: r.PlanName})
	}
	return names, nil
}

// HeldFacts counts the held facts in scope on the journeys or on the activity; pgx sends a nil slice as NULL,
// which would match nothing, so an empty list is sent as one.
func (s *PostgresStore) HeldFacts(ctx context.Context, scope authz.Scope, activityID string, journeyRefs []string) (int, error) {
	refs := journeyRefs
	if refs == nil {
		refs = []string{}
	}
	held, err := s.db.Queries(ctx).AttributionHeldFacts(ctx, sqlcdb.AttributionHeldFactsParams{
		JourneyRefs: refs, ActivityID: activityID,
		SeesEverything: scope.Everything, ViewerID: scope.PersonID, ViewsPlans: scope.Holds, ViewerTeamIds: scope.TeamIDs,
	})
	if err != nil {
		return 0, fmt.Errorf("count the held facts around %s: %w", activityID, err)
	}
	return held, nil
}

func dateOf(t time.Time) date.Date {
	return date.New(t.Year(), t.Month(), t.Day())
}
