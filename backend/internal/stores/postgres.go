package stores

import (
	"context"

	"mapp/internal/modules/access"
	"mapp/internal/modules/activity"
	"mapp/internal/modules/allwork"
	"mapp/internal/modules/approval"
	"mapp/internal/modules/auth"
	"mapp/internal/modules/budget"
	"mapp/internal/modules/bulk"
	"mapp/internal/modules/campaign"
	"mapp/internal/modules/customdashboard"
	"mapp/internal/modules/dataset"
	"mapp/internal/modules/financials"
	"mapp/internal/modules/history"
	"mapp/internal/modules/lineitem"
	"mapp/internal/modules/overspend"
	"mapp/internal/modules/people"
	"mapp/internal/modules/plan"
	"mapp/internal/modules/purchaserequest"
	"mapp/internal/modules/sample"
	"mapp/internal/modules/settings"
	"mapp/internal/modules/swbs"
	"mapp/internal/modules/workbook"
	"mapp/internal/platform/database"
	"mapp/internal/platform/ids"
)

// Postgres is the set the API and the seed run on. Nothing stored yet means no number given out yet: every
// record takes its readable ID from the counters.
func Postgres(db *database.DB) Set {
	counters := ids.NewPostgresCounters(db)
	return Set{
		Tx: db, Counters: counters, Samples: sample.NewPostgresStore(db),
		Organisation: postgresOrganisation(db), Planning: postgresPlanning(db), Finance: postgresFinance(db),
		Dashboards: Dashboards{
			CustomDashboards: customdashboard.NewPostgresStore(db),
			Datasets:         dataset.NewPostgresStore(db),
		},
		Ready: db.Ping,
		IsEmpty: func(ctx context.Context) (bool, error) {
			used, err := counters.Used(ctx)
			return !used, err
		},
	}
}

func postgresOrganisation(db *database.DB) Organisation {
	return Organisation{
		People: people.NewPostgresStore(db), History: history.NewPostgresStore(db), Auth: auth.NewPostgresStore(db),
		Access: access.NewPostgresStore(db), Settings: settings.NewPostgresStore(db),
	}
}

func postgresPlanning(db *database.DB) Planning {
	return Planning{
		Plans: plan.NewPostgresStore(db), Campaigns: campaign.NewPostgresStore(db),
		Activities: activity.NewPostgresStore(db), LineItems: lineitem.NewPostgresStore(db),
		Overspend: overspend.NewPostgresStore(db),
		Approvals: approval.NewPostgresStore(db), AllWork: allwork.NewPostgresStore(db), Bulk: bulk.NewPostgresStore(db),
		Workbook: workbook.NewPostgresStore(db),
	}
}

func postgresFinance(db *database.DB) Finance {
	return Finance{
		Budgets: budget.NewPostgresStore(db), Financials: financials.NewPostgresStore(db), SwbsRuns: swbs.NewPostgresStore(db),
		PurchaseRequests: purchaserequest.NewPostgresStore(db),
	}
}
