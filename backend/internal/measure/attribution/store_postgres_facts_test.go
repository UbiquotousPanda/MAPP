package attribution_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/activity"
	"mapp/internal/campaign"
	"mapp/internal/measure/attribution"
	"mapp/internal/people"
	"mapp/internal/performance"
	"mapp/internal/plan"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/database"
	"mapp/internal/platform/database/dbtest"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
	"mapp/internal/settings"
)

var pgMeta = record.NewMeta(actor.System, time.Date(2026, time.March, 12, 9, 0, 0, 0, time.UTC))

var team1Only = authz.Scope{PersonID: "U-2001", Holds: true, TeamIDs: []string{"T-1001"}}

func pgWrite(t *testing.T, db *database.DB, fn func(ctx context.Context) error) {
	t.Helper()
	if err := db.Write(t.Context(), fn); err != nil {
		t.Fatalf("Write() error: %v", err)
	}
}

// pgFactStore seeds A-1001 (team T-1001) and A-1002 (team T-1002), each with a 2026 revenue fact and an
// inquiry, all four sharing journey J-1.
func pgFactStore(t *testing.T) *attribution.PostgresStore {
	t.Helper()
	db := dbtest.NewDB(t)
	directory, catalogue := people.NewPostgresStore(db), settings.NewPostgresStore(db)
	plans, containers, activities := plan.NewPostgresStore(db), campaign.NewPostgresStore(db), activity.NewPostgresStore(db)
	pgWrite(t, db, func(ctx context.Context) error {
		err := errors.Join(
			directory.Put(ctx, people.Person{ID: "U-2001", Name: "Sam Patel", Email: "sam@example.com", Meta: pgMeta}),
			catalogue.PutCurrency(ctx, settings.Currency{Code: "USD", Name: "US dollar", Active: true, Meta: pgMeta}),
			catalogue.PutActivityType(ctx, settings.ActivityType{ID: "AT-1001", Name: "Webinar", Meta: pgMeta}),
			catalogue.PutModel(ctx, settings.Model{ID: "MOD-1001", Name: "Leads", ActivityTypeIDs: []string{"AT-1001"},
				InqToMqlRate: money.PercentFromHundredths(200), MqlToDealRate: money.PercentFromHundredths(1000),
				AverageDealSize: money.USD(money.FromCents(100)), Meta: pgMeta}))
		for _, n := range []string{"1", "2"} {
			err = errors.Join(err,
				directory.PutTeam(ctx, people.Team{ID: "T-100" + n, Name: "Team " + n, Colour: "blue", Meta: pgMeta}),
				plans.Put(ctx, plan.Plan{ID: "P-100" + n, Name: "Plan " + n, Year: 2026, ModelID: "MOD-1001",
					TeamIDs: []string{"T-100" + n}, DefaultSpread: plan.SpreadEvenly, GoalStage: plan.StageINQ,
					Status: plan.StatusDraft, Meta: pgMeta}),
				containers.PutCampaign(ctx, campaign.Campaign{ID: "C-100" + n, PlanID: "P-100" + n, Name: "Campaign", Meta: pgMeta}),
				containers.PutInitiative(ctx, campaign.Initiative{ID: "I-100" + n, CampaignID: "C-100" + n, Name: "Initiative", Meta: pgMeta}),
				activities.Put(ctx, activity.Activity{ID: "A-100" + n, InitiativeID: "I-100" + n, Name: "Activity " + n,
					ExternalName: "activity-" + n, ActivityTypeID: "AT-1001", Status: activity.StatusApproved, Meta: pgMeta}))
		}
		return err
	})
	pgWrite(t, db, func(ctx context.Context) error { return putJourneyFacts(ctx, performance.NewPostgresStore(db)) })
	return attribution.NewPostgresStore(db)
}

func putJourneyFacts(ctx context.Context, facts *performance.PostgresStore) error {
	err := errors.Join(
		facts.PutSource(ctx, performance.Source{ID: "PS-1", Name: "Eloqua", OwnerID: "U-2001",
			Category: performance.CategoryMarketingAutomation, Status: performance.StatusActive,
			DeliveryRoute: performance.RouteUpload, Cadence: performance.CadenceMonthly, Meta: pgMeta}),
		facts.PutImport(ctx, performance.Import{ID: "PIM-1", SourceID: "PS-1", FileName: "feed.csv",
			Origin: performance.OriginUpload, Status: performance.ImportCompleted,
			Counts: performance.Counts{Read: 4, Matched: 4}, Meta: pgMeta}))
	amount, one := money.USD(money.FromCents(50_000)), int64(1)
	for i, n := range []string{"1", "2"} {
		fact := performance.Fact{SourceID: "PS-1", ImportID: "PIM-1", ActivityID: "A-100" + n,
			MatchedOn: performance.MatchedActivityID, MatchedKey: "a-100" + n, JourneyRef: "J-1", Meta: pgMeta}
		conversion, inquiry := fact, fact
		conversion.ID, conversion.SourceReference, conversion.Stage, conversion.Amount = "PF-1"+n, "r"+n, "revenue", &amount
		conversion.FactDate = time.Date(2026, 3, 12, 0, 0, 0, 0, time.UTC)
		inquiry.ID, inquiry.SourceReference, inquiry.Stage, inquiry.Count = "PF-2"+n, "t"+n, "inq", &one
		inquiry.FactDate = time.Date(2026, 3, 1+i, 0, 0, 0, 0, time.UTC)
		err = errors.Join(err, facts.PutFact(ctx, conversion), facts.PutFact(ctx, inquiry))
	}
	held := performance.Fact{ID: "PF-30", SourceID: "PS-1", ImportID: "PIM-1", SourceReference: "h1", ActivityID: "A-1002",
		MatchedOn: performance.MatchedActivityID, MatchedKey: "a-1002", JourneyRef: "J-1", Stage: "inq", Count: &one, Held: true,
		FactDate: time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC), Meta: pgMeta}
	return errors.Join(err, facts.PutFact(ctx, held))
}

func TestPostgresStore_ConversionsOutsideTheScopeAreInvisible_050_C4(t *testing.T) {
	t.Parallel()
	store := pgFactStore(t)

	conversions, err := store.Conversions(t.Context(), team1Only, []string{"A-1001", "A-1002"}, 2026)
	if err != nil || len(conversions) != 1 || conversions[0].ActivityID != "A-1001" {
		t.Fatalf("conversions = %+v, %v; want only A-1001's: a record outside the scope must look missing", conversions, err)
	}
	if got := conversions[0]; got.Source != "Eloqua" || got.Reference != "r1" || got.ID != "PF-11" {
		t.Errorf("conversion %s from %q ref %q; want PF-11 from Eloqua ref r1", got.ID, got.Source, got.Reference)
	}
}

func TestPostgresStore_TouchesOutsideTheScopeAreInvisible_050_C4(t *testing.T) {
	t.Parallel()
	store := pgFactStore(t)

	mine, err := store.Touches(t.Context(), team1Only, []string{"J-1"})
	if err != nil {
		t.Fatalf("Touches: %v", err)
	}
	all, err := store.Touches(t.Context(), authz.Scope{Everything: true}, []string{"J-1"})
	if err != nil {
		t.Fatalf("Touches: %v", err)
	}
	if diff := cmp.Diff([]string{"A-1001"}, touchedActivities(mine)); diff != "" {
		t.Fatalf("team 1's touches (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff([]string{"A-1001", "A-1002"}, touchedActivities(all)); diff != "" {
		t.Errorf("every touch, revenue facts not among them (-want +got):\n%s", diff)
	}
	if mine[0].Kind != "inq" {
		t.Errorf("touch kind %q; want inq", mine[0].Kind)
	}
}

func TestPostgresStore_HeldFactsStayInScope_058_FR021(t *testing.T) {
	t.Parallel()
	store := pgFactStore(t)

	mine, err := store.HeldFacts(t.Context(), team1Only, "A-1001", []string{"J-1"})
	if err != nil || mine != 0 {
		t.Errorf("team 1's held facts around A-1001 = %d, %v; want 0: the held fact sits on team 2's activity", mine, err)
	}
	all, err := store.HeldFacts(t.Context(), authz.Scope{Everything: true}, "A-1001", []string{"J-1"})
	if err != nil || all != 1 {
		t.Errorf("everyone's held facts around A-1001 = %d, %v; want the one on J-1", all, err)
	}
	none, err := store.HeldFacts(t.Context(), authz.Scope{Everything: true}, "A-1001", nil)
	if err != nil || none != 0 {
		t.Errorf("held facts with no journey and none on A-1001 = %d, %v; want 0", none, err)
	}
}

func TestPostgresStore_NamesOutsideTheScopeAreMissing_058_FR014_FR016(t *testing.T) {
	t.Parallel()
	store := pgFactStore(t)
	asked := []string{"A-1001", "A-1002", "A-9999"}

	mine, err := store.ActivitiesInScope(t.Context(), team1Only, asked)
	if err != nil {
		t.Fatalf("ActivitiesInScope: %v", err)
	}
	want := []attribution.ActivityName{{ID: "A-1001", Name: "Activity 1", Status: "approved", PlanID: "P-1001", PlanName: "Plan 1"}}
	if diff := cmp.Diff(want, mine); diff != "" {
		t.Errorf("team 1's names: another team's activity and an unknown one look alike, missing (-want +got):\n%s", diff)
	}
	all, err := store.ActivitiesInScope(t.Context(), authz.Scope{Everything: true}, asked)
	if err != nil || len(all) != 2 {
		t.Errorf("everyone's names = %d, %v; want both activities", len(all), err)
	}
}

func touchedActivities(touches []attribution.JourneyTouch) []string {
	var ids []string
	for _, t := range touches {
		ids = append(ids, t.ActivityID)
	}
	return ids
}
