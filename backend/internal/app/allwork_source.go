package app

import (
	"context"
	"slices"

	"mapp/internal/activity"
	"mapp/internal/allwork"
	"mapp/internal/campaign"
	"mapp/internal/financials"
	"mapp/internal/history"
	"mapp/internal/lineitem"
	"mapp/internal/people"
	"mapp/internal/plan"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/settings"
	"mapp/internal/stores"
)

// allWorkSource is allwork.Source over the planning features: every value comes from the owning feature's own
// calculation, read inside the caller's transaction, and nothing is written.
type allWorkSource struct {
	plans          *plan.Service
	plansRepo      stores.PlanStore
	campaigns      *campaign.Service
	campaignsRepo  stores.CampaignStore
	activities     *activity.Service
	activitiesRepo stores.ActivityStore
	lineItems      *lineitem.Service
	lineItemsRepo  stores.LineItemStore
	settings       *settings.Service
	budgetItems    lineitem.FinanceBudgets
	workflows      activity.Workflows
	people         *people.Service
	peopleRepo     stores.PeopleStore
	history        *history.Service
	financials     *financials.Service
	financeAccess  financials.Access

	planningCampaigns *campaign.Service
	lean              bool
}

var _ allwork.Source = allWorkSource{}

// Year returns every plan of year the person may see, with everything below it in plan-tree order. The values
// only some columns show (a plan's completeness, goals) are read only when columns names them: costly per record.
func (s allWorkSource) Year(ctx context.Context, year int, today date.Date, columns []string) (allwork.YearData, error) {
	yearPlans, err := plansOfYear(ctx, s.plansRepo, year)
	if err != nil {
		return allwork.YearData{Nodes: []allwork.Node{}}, err
	}
	data, err := s.nodesOf(ctx, yearPlans, year, columns)
	if err != nil || len(data.Nodes) == 0 {
		return data, err
	}
	if err := s.addFinance(ctx, &data); err != nil {
		return allwork.YearData{}, err
	}
	return data, nil
}

func (s allWorkSource) nodesOf(ctx context.Context, yearPlans []plan.Plan, year int, columns []string) (allwork.YearData, error) {
	data := allwork.YearData{Nodes: []allwork.Node{}}
	if len(yearPlans) == 0 {
		return data, nil
	}
	var err error
	y := yearReader{s: s, owners: map[string]*allwork.Owner{}, columns: columns, plans: map[string]plan.Plan{}}
	if err := y.loadAttributes(ctx); err != nil {
		return allwork.YearData{}, err
	}
	if y.rates, err = s.settings.Rates(ctx); err != nil {
		return allwork.YearData{}, err
	}
	missing := map[string]int{}
	if y.needs("completeness") {
		if missing, err = s.planMissing(ctx, year); err != nil {
			return allwork.YearData{}, err
		}
	}
	if err := y.addPlans(ctx, yearPlans, missing); err != nil {
		return allwork.YearData{}, err
	}
	data.Nodes = y.nodes
	return data, nil
}

// addPlans adds the plans and everything below them, decoding each stored activity and line item only once.
func (y *yearReader) addPlans(ctx context.Context, yearPlans []plan.Plan, missing map[string]int) error {
	tree, err := y.s.readTrees(ctx, yearPlans)
	if err != nil {
		return err
	}
	for _, p := range yearPlans {
		if err := y.addPlan(ctx, p, missing[p.ID]); err != nil {
			return err
		}
	}
	if err := y.addActivityDetails(ctx, tree.activities); err != nil {
		return err
	}
	return y.addLineItems(ctx, tree.lineItems)
}

// planMissing counts each plan's own needed-to-publish fields still empty, without the roll-ups the Plans list builds.
func (s allWorkSource) planMissing(ctx context.Context, year int) (map[string]int, error) {
	return s.plans.OwnMissing(ctx, actor.System, year)
}

// addPlan adds the plan p with its own missing fields, its campaigns and initiatives as 005's plan tree
// orders them, and its activities as 006's plan-tree rows order them.
func (y *yearReader) addPlan(ctx context.Context, p plan.Plan, missing int) error {
	owner, err := y.owner(ctx, p.OwnerID)
	if err != nil {
		return err
	}
	units, err := y.s.settings.BusinessUnit(ctx, p.Attributes)
	if err != nil {
		return err
	}
	fields, err := y.planFields(ctx, p)
	if err != nil {
		return err
	}
	y.plans[p.ID] = p
	planNode := allwork.Node{
		Level: allwork.LevelPlan, ID: p.ID, PlanID: p.ID, Name: p.Name, Description: p.Description, Owner: owner,
		Status: string(p.Status), Missing: missing, Budget: y.usd(p.ID, p.Budget), BudgetPlan: y.inPlan(p.ID, p.Budget),
		CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt, Version: p.Version, Strategic: p.AOP, TeamIDs: append([]string{}, p.TeamIDs...),
		BusinessUnitIDs: units, Fields: fields, PlanAccess: plan.AccessFacts(p),
	}
	y.planFacts(&planNode)
	planNode.Attrs = y.attrValues(settings.LevelPlan, p.Attributes)
	planNode.PhasingMethod = string(p.BudgetPhasing.Normalised().Method)
	planNode.PhasedPlan, planNode.PhasedBudgetUSD = y.phased(p.ID, p.BudgetPhasing.MonthAmounts(p.Budget, p.Year))
	y.nodes = append(y.nodes, planNode)
	if err = y.addCampaigns(ctx, p.ID); err != nil {
		return err
	}
	return y.addActivities(ctx, p.ID)
}

func (y *yearReader) addCampaigns(ctx context.Context, planID string) error {
	tree, err := y.s.campaigns.ListPlanCampaigns(ctx, actor.System, planID)
	if err != nil {
		return err
	}
	for ci, c := range tree.Items {
		err = y.addContainer(ctx, container{
			level: allwork.LevelCampaign, id: c.ID, parentID: planID, planID: planID, order: ci, name: c.Name,
			description: c.Description, ownerID: c.OwnerID, start: c.StartDate, end: c.EndDate, budget: c.Budget,
			progress: c.ApprovalProgress, timing: c.Timing, completeness: c.Completeness, meta: c.Meta,
			attributes: c.Attributes, phasing: c.BudgetPhasing,
		})
		if err != nil {
			return err
		}
		for ii, i := range c.Initiatives {
			err = y.addContainer(ctx, container{
				level: allwork.LevelInitiative, id: i.ID, parentID: c.ID, planID: planID, order: ii, name: i.Name,
				description: i.Description, ownerID: i.OwnerID, start: i.StartDate, end: i.EndDate, budget: i.Budget,
				progress: i.ApprovalProgress, timing: i.Timing, completeness: i.Completeness, meta: i.Meta,
				attributes: i.Attributes, phasing: i.BudgetPhasing,
			})
			if err != nil {
				return err
			}
			y.initiativeIDs = append(y.initiativeIDs, i.ID)
		}
	}
	return nil
}

func (y *yearReader) addActivities(ctx context.Context, planID string) error {
	rows := y.s.activities.ListForPlan
	if y.s.lean {
		rows = y.s.activities.PlanningRows
	}
	summaries, err := rows(ctx, actor.System, planID)
	if err != nil {
		return err
	}
	if y.activities == nil {
		y.activities = map[string]int{}
	}
	for order, a := range summaries {
		var planned *money.Amount // in the plan currency
		if a.PlannedCost != nil {
			planned = &a.PlannedCost.Amount
		}
		months, _ := lineitem.ActivityMonths(lineitem.ActivityFacts{StartDate: a.StartDate, EndDate: a.EndDate, Ongoing: a.Ongoing})
		y.activities[a.ID] = len(y.nodes)
		y.nodes = append(y.nodes, allwork.Node{
			Level: allwork.LevelActivity, ID: a.ID, ParentID: a.InitiativeID, PlanID: planID, Order: order, Name: a.Name,
			Version: a.Version,
			Owner:   ownerOf(a.Owner), StartDate: a.StartDate, EndDate: a.EndDate, Ongoing: a.Ongoing, Months: months,
			Status: string(a.DisplayStatus), Missing: a.Completeness.MissingFields, PlannedCost: y.usd(planID, planned),
			PlannedCostPlan: y.inPlan(planID, planned), ActivityTypeID: a.ActivityType.ID,
			Fields: map[string]allwork.Value{
				"activity.type":    {Text: a.ActivityType.Name, Inactive: !a.ActivityType.Active},
				"activity.ongoing": {Yes: &a.Ongoing},
			},
		})
		y.planFacts(&y.nodes[len(y.nodes)-1])
	}
	return nil
}

// plansOfYear returns the plans of year the person acting may see (014 FR-007, SC-004).
func plansOfYear(ctx context.Context, repo stores.PlanStore, year int) ([]plan.Plan, error) {
	all, err := repo.ListInScope(ctx, authz.ScopeOf(ctx))
	return slices.DeleteFunc(all, func(p plan.Plan) bool { return p.Year != year }), err
}
