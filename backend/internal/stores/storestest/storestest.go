// Package storestest builds the API's store set in memory from every area's fake, for tests that run the
// whole API or the seed without a database.
package storestest

import (
	"context"

	"mapp/internal/modules/access/accesstest"
	"mapp/internal/modules/activity/activitytest"
	"mapp/internal/modules/allwork/allworktest"
	"mapp/internal/modules/approval/approvaltest"
	"mapp/internal/modules/auth/authtest"
	"mapp/internal/modules/budget/budgettest"
	"mapp/internal/modules/bulk/bulktest"
	"mapp/internal/modules/campaign/campaigntest"
	"mapp/internal/modules/customdashboard/customdashboardtest"
	"mapp/internal/modules/dataset/datasettest"
	"mapp/internal/modules/financials/financialstest"
	"mapp/internal/modules/history/historytest"
	"mapp/internal/modules/lineitem/lineitemtest"
	"mapp/internal/modules/overspend/overspendtest"
	"mapp/internal/modules/people/peopletest"
	"mapp/internal/modules/plan/plantest"
	"mapp/internal/modules/purchaserequest/purchaserequesttest"
	"mapp/internal/modules/sample/sampletest"
	"mapp/internal/modules/settings/settingstest"
	"mapp/internal/modules/swbs/swbstest"
	"mapp/internal/modules/workbook/workbooktest"
	"mapp/internal/platform/fake"
	"mapp/internal/stores"
)

func New(db *fake.DB) stores.Set {
	counters := fake.NewCounters(db)
	return stores.Set{
		Tx: db, Counters: counters, Samples: sampletest.NewStore(db),
		Organisation: organisation(db), Planning: planning(db), Finance: finance(db),
		Dashboards: stores.Dashboards{
			CustomDashboards: customdashboardtest.NewStore(db),
			Datasets:         datasettest.NewStore(db),
		},
		Ready:   func(context.Context) error { return nil },
		IsEmpty: func(context.Context) (bool, error) { return !counters.Used(), nil },
	}
}

func organisation(db *fake.DB) stores.Organisation {
	return stores.Organisation{
		People: peopletest.NewStore(db), History: historytest.NewStore(db), Auth: authtest.NewStore(db),
		Access: accesstest.NewStore(db), Settings: settingstest.NewStore(db),
	}
}

func planning(db *fake.DB) stores.Planning {
	return stores.Planning{
		Plans: plantest.NewStore(db), Campaigns: campaigntest.NewStore(db), Activities: activitytest.NewStore(db),
		LineItems: lineitemtest.NewStore(db), Approvals: approvaltest.NewStore(db), AllWork: allworktest.NewStore(db),
		Overspend: overspendtest.NewStore(db),
		Bulk:      bulktest.NewStore(db), Workbook: workbooktest.NewStore(db, plantest.NewStore(db)),
	}
}

func finance(db *fake.DB) stores.Finance {
	return stores.Finance{
		Budgets: budgettest.NewStore(db), Financials: financialstest.NewStore(db), SwbsRuns: swbstest.NewStore(db),
		PurchaseRequests: purchaserequesttest.NewStore(db),
	}
}
