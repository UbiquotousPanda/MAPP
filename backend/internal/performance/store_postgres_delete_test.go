package performance_test

import (
	"context"
	"errors"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/campaign"
	"mapp/internal/people"
	"mapp/internal/performance"
	"mapp/internal/plan"
	"mapp/internal/platform/database/dbtest"
	"mapp/internal/platform/money"
	"mapp/internal/settings"
)

// TestPostgresStore_DeleteSourceCascadesItsOwnRows pins a real defect: a source whose upload was undone (so
// it has no facts, the one thing DeleteSource itself refuses) still fails with a foreign-key violation,
// because its imports, review rows and integration IDs had no ON DELETE CASCADE back to it.
func TestPostgresStore_DeleteSourceCascadesItsOwnRows(t *testing.T) {
	t.Parallel()
	db := dbtest.NewDB(t)
	store := performance.NewPostgresStore(db)
	directory, catalogue := people.NewPostgresStore(db), settings.NewPostgresStore(db)
	plans, containers, activities := plan.NewPostgresStore(db), campaign.NewPostgresStore(db), activity.NewPostgresStore(db)

	pgWrite(t, db, func(ctx context.Context) error {
		return errors.Join(
			directory.Put(ctx, people.Person{ID: "U-3001", Name: "Sam Patel", Email: "sam2@example.com", Meta: pgMeta}),
			catalogue.PutCurrency(ctx, settings.Currency{Code: "USD", Name: "US dollar", Active: true, Meta: pgMeta}),
			catalogue.PutActivityType(ctx, settings.ActivityType{ID: "AT-3001", Name: "Webinar", Meta: pgMeta}),
			catalogue.PutModel(ctx, settings.Model{ID: "MOD-3001", Name: "Leads", ActivityTypeIDs: []string{"AT-3001"},
				InqToMqlRate: money.PercentFromHundredths(200), MqlToDealRate: money.PercentFromHundredths(1000),
				AverageDealSize: money.USD(money.FromCents(100)), Meta: pgMeta}),
			directory.PutTeam(ctx, people.Team{ID: "T-3001", Name: "Team 3", Colour: "blue", Meta: pgMeta}),
			plans.Put(ctx, plan.Plan{ID: "P-3001", Name: "Plan 3", Year: 2026, ModelID: "MOD-3001",
				TeamIDs: []string{"T-3001"}, DefaultSpread: plan.SpreadEvenly, GoalStage: plan.StageINQ,
				Status: plan.StatusDraft, Meta: pgMeta}),
			containers.PutCampaign(ctx, campaign.Campaign{ID: "C-3001", PlanID: "P-3001", Name: "Campaign", Meta: pgMeta}),
			containers.PutInitiative(ctx, campaign.Initiative{ID: "I-3001", CampaignID: "C-3001", Name: "Initiative", Meta: pgMeta}),
			activities.Put(ctx, activity.Activity{ID: "A-3001", InitiativeID: "I-3001", Name: "Activity 3",
				ExternalName: "activity-3", ActivityTypeID: "AT-3001", Status: activity.StatusApproved, Meta: pgMeta}),
		)
	})

	pgWrite(t, db, func(ctx context.Context) error {
		return errors.Join(
			store.PutSource(ctx, performance.Source{ID: "PS-3001", Name: "Undone source", OwnerID: "U-3001",
				Category: performance.CategoryMarketingAutomation, Status: performance.StatusActive,
				DeliveryRoute: performance.RouteUpload, Cadence: performance.CadenceMonthly, Meta: pgMeta}),
			store.PutImport(ctx, performance.Import{ID: "PIM-3001", SourceID: "PS-3001", FileName: "feed.csv",
				Origin: performance.OriginUpload, Status: performance.ImportUndone, Meta: pgMeta}),
			store.PutReviewRow(ctx, performance.ReviewRow{ID: "PRV-3001", ImportID: "PIM-3001", SourceID: "PS-3001",
				Raw: []byte("{}"), Reason: "No activity matched", Status: performance.ReviewOpen, Meta: pgMeta}),
			store.PutIntegrationID(ctx, performance.IntegrationID{ID: "IID-3001", ActivityID: "A-3001",
				SourceID: "PS-3001", Value: "ext-3", Meta: pgMeta}),
		)
	})

	deleted, err := store.DeleteSource(t.Context(), "PS-3001")
	if err != nil {
		t.Fatalf("DeleteSource() error: %v, want the source's own rows to cascade away with it", err)
	}
	if !deleted {
		t.Fatalf("DeleteSource() = false, want true: the source has no facts, so nothing should refuse it")
	}
}
