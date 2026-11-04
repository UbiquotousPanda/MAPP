package attribution

import (
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
		facts = append(facts, RevenueFact{ActivityID: r.ActivityID, Date: dateOf(r.FactDate), JourneyRef: r.JourneyRef,
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
		touches = append(touches, JourneyTouch{JourneyRef: r.JourneyRef,
			Touch: Touch{ActivityID: r.ActivityID, Date: dateOf(r.FactDate)}})
	}
	return touches, nil
}

func dateOf(t time.Time) date.Date {
	return date.New(t.Year(), t.Month(), t.Day())
}
