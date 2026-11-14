package core_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"mapp/internal/modules/activity"
	"mapp/internal/modules/approval/internal/core"
	"mapp/internal/modules/campaign"
	"mapp/internal/modules/people"
	"mapp/internal/modules/plan"
	"mapp/internal/modules/settings"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/database"
	"mapp/internal/platform/database/dbtest"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

var (
	pgMeta               = record.NewMeta(actor.System, time.Date(2026, time.March, 12, 9, 0, 0, 0, time.UTC))
	_         core.Store = (*core.PostgresStore)(nil)
	submitted            = time.Date(2026, time.April, 1, 9, 0, 0, 0, time.UTC)
	approver             = actor.Actor{ID: "U-1003", Name: "Mei Chen"}
)

// pgPlanned gives a store whose database also holds the activities A-1001 (plan P-1001, team T-1001) and
// A-1002 (plan P-1002, team T-1002).
func pgPlanned(t *testing.T) (*database.DB, *core.PostgresStore) {
	t.Helper()
	db, s := pgStore(t)
	directory, catalogue := people.NewPostgresStore(db), settings.NewPostgresStore(db)
	planStore, containers, activityStore := plan.NewPostgresStore(db), campaign.NewPostgresStore(db), activity.NewPostgresStore(db)
	pgWrite(t, db, func(ctx context.Context) error {
		err := errors.Join(
			directory.Put(ctx, people.Person{ID: "U-1003", Name: "Mei Chen", Email: "mei@example.com", Meta: pgMeta}),
			catalogue.PutCurrency(ctx, settings.Currency{Code: "USD", Name: "US dollar", Active: true, Meta: pgMeta}),
			catalogue.PutActivityType(ctx, settings.ActivityType{ID: "AT-1001", Name: "Webinar", Meta: pgMeta}),
			catalogue.PutModel(ctx, settings.Model{ID: "MOD-1001", Name: "Leads", ActivityTypeIDs: []string{"AT-1001"},
				InqToMqlRate: money.PercentFromHundredths(200), MqlToDealRate: money.PercentFromHundredths(1000),
				AverageDealSize: money.USD(money.FromCents(100)), Meta: pgMeta}))
		for _, n := range []string{"1", "2"} {
			err = errors.Join(err,
				directory.PutTeam(ctx, people.Team{ID: "T-100" + n, Name: "Team " + n, Colour: "blue", Meta: pgMeta}),
				planStore.Put(ctx, plan.Plan{ID: "P-100" + n, Name: "Plan " + n, Year: 2026, ModelID: "MOD-1001",
					TeamIDs: []string{"T-100" + n}, DefaultSpread: plan.SpreadEvenly, GoalStage: plan.StageINQ,
					Status: plan.StatusDraft, Meta: pgMeta}),
				containers.PutCampaign(ctx, campaign.Campaign{ID: "C-100" + n, PlanID: "P-100" + n, Name: "Campaign", Meta: pgMeta}),
				containers.PutInitiative(ctx, campaign.Initiative{ID: "I-100" + n, CampaignID: "C-100" + n, Name: "Initiative",
					Meta: pgMeta}),
				activityStore.Put(ctx, activity.Activity{ID: "A-100" + n, InitiativeID: "I-100" + n, Name: "Activity",
					ActivityTypeID: "AT-1001", Status: activity.StatusSubmitted, Meta: pgMeta}))
		}
		return err
	})
	return db, s
}

func pgRound(id, activityID string) core.Round {
	cost := money.USD(money.FromCents(120000))
	return core.Round{ID: id, SubjectKind: core.KindActivity, SubjectID: activityID, Number: 1, WorkflowID: "WF-1001", WorkflowName: "Standard",
		Levels: []core.RoundLevel{{Number: 1, Name: "Finance", Approvers: []actor.Actor{},
			ApproverType: core.SourcePeople, Mode: core.ModeAny, Resolution: core.ResolutionDecide,
			Excluded:  []core.Excluded{{Person: actor.Actor{ID: "U-1001", Name: "Priya Raman"}, Reason: core.ReasonOwner}},
			StartedAt: &submitted}},
		CurrentLevel: 1, Outcome: core.OutcomeOpen, SubmittedAt: submitted, SubmittedBy: actor.Actor{ID: "U-1001", Name: "Priya Raman"},
		Facts: &core.RuleFacts{PlannedCost: &cost, BusinessUnits: []core.FactOption{}}, Meta: pgMeta}
}

// named names the approver Mei Chen in the round's first level.
func named(r core.Round) core.Round {
	r.Levels[0].Approvers = []actor.Actor{approver}
	return r
}

func pgAction(id, roundID, activityID string) core.Action {
	return core.Action{ID: id, RoundID: roundID, RoundNumber: 1, SubjectKind: core.KindActivity, SubjectID: activityID,
		Action: core.ActionApproved, Level: 1, LevelName: "Finance", Approvers: []actor.Actor{approver},
		Actor: actor.Actor{ID: "U-1002", Name: "Daniel Okoro"}, OnBehalfOf: []actor.Actor{approver}, At: submitted,
		Changes: []core.ChangeText{}, Capacity: core.CapacityDelegate, AsDelegateOf: &approver}
}

func TestPostgresStoreRoundScopeIncludesNamedApproversFR009(t *testing.T) {
	t.Parallel()
	db, s := pgPlanned(t)
	pgWrite(t, db, func(ctx context.Context) error {
		return errors.Join(s.PutRound(ctx, pgRound("AR-1001", "A-1001")),
			s.PutRound(ctx, named(pgRound("AR-1002", "A-1002"))),
			s.PutAction(ctx, pgAction("AH-1001", "AR-1001", "A-1001")), s.PutAction(ctx, pgAction("AH-1002", "AR-1002", "A-1002")))
	})
	tests := []struct {
		name         string
		scope        authz.Scope
		wantRounds   []string
		wantActivity string
	}{
		{name: "View plans in team T-1001", scope: authz.Scope{PersonID: "U-1001", Holds: true, TeamIDs: []string{"T-1001"}},
			wantRounds: []string{"AR-1001"}, wantActivity: "A-1001"},
		{name: "no role, approver named in a round of A-1002", scope: authz.Scope{PersonID: "U-1003", TeamIDs: []string{}},
			wantRounds: []string{"AR-1002"}, wantActivity: "A-1002"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			rounds, roundsErr := s.RoundsInScope(t.Context(), tt.scope)
			actions, actionsErr := s.ActionsInScope(t.Context(), tt.scope)
			if err := errors.Join(roundsErr, actionsErr); err != nil {
				t.Fatalf("RoundsInScope(), ActionsInScope() error: %v", err)
			}
			if len(rounds) != 1 || rounds[0].ID != tt.wantRounds[0] || len(actions) != 1 || actions[0].SubjectID != tt.wantActivity {
				t.Errorf("RoundsInScope() = %d rounds, ActionsInScope() = %d entries; want only %v of %s",
					len(rounds), len(actions), tt.wantRounds, tt.wantActivity)
			}
		})
	}
}

// pgStore gives a store whose database already holds the approvers U-1001 and U-1002.
func pgStore(t *testing.T) (*database.DB, *core.PostgresStore) {
	t.Helper()
	db := dbtest.NewDB(t)
	directory := people.NewPostgresStore(db)
	pgWrite(t, db, func(ctx context.Context) error {
		return errors.Join(
			directory.Put(ctx, people.Person{ID: "U-1001", Name: "Priya Raman", Email: "priya@example.com", Meta: pgMeta}),
			directory.Put(ctx, people.Person{ID: "U-1002", Name: "Daniel Okoro", Email: "daniel@example.com", Meta: pgMeta}))
	})
	return db, core.NewPostgresStore(db)
}

func pgWrite(t *testing.T, db *database.DB, fn func(ctx context.Context) error) {
	t.Helper()
	if err := db.Write(t.Context(), fn); err != nil {
		t.Fatalf("Write() error: %v", err)
	}
}
