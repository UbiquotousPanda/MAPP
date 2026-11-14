package seed_test

import (
	"slices"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/campaign"
	"mapp/internal/plan"
	"mapp/internal/settings"
)

func TestLoad_ActivitiesFitTheirPlan_R3_R7(t *testing.T) {
	t.Parallel()
	d := loadDemo(t)
	for _, a := range d.activities {
		initiative, c, p := d.pathOf(t, a)
		model := settingsModel(t, d, p.ModelID)
		if !model.Allows(a.ActivityTypeID) {
			t.Errorf("%s: type %s is not allowed by %s", a.Name, a.ActivityTypeID, model.Name)
		}
		if initiative.StartDate == nil || a.StartDate == nil {
			continue
		}
		outside := a.StartDate.Before(*initiative.StartDate) || a.StartDate.After(*initiative.EndDate)
		if !a.Ongoing {
			outside = outside || a.EndDate.After(*initiative.EndDate)
		}
		if outside {
			t.Errorf("%s is outside %s › %s (%s)", a.Name, c.Name, initiative.Name, dates(initiative.StartDate, initiative.EndDate))
		}
	}
}

func (d demoData) pathOf(t *testing.T, a activity.Activity) (campaign.Initiative, campaign.Campaign, plan.Plan) {
	t.Helper()
	i := slices.IndexFunc(d.initiatives, func(i campaign.Initiative) bool { return i.ID == a.InitiativeID })
	if i < 0 {
		t.Fatalf("%s: no initiative %s", a.Name, a.InitiativeID)
	}
	initiative := d.initiatives[i]
	c := slices.IndexFunc(d.campaigns, func(c campaign.Campaign) bool { return c.ID == initiative.CampaignID })
	if c < 0 {
		t.Fatalf("%s: no campaign %s", a.Name, initiative.CampaignID)
	}
	camp := d.campaigns[c]
	p := slices.IndexFunc(d.plans, func(p plan.Plan) bool { return p.ID == camp.PlanID })
	if p < 0 {
		t.Fatalf("%s: no plan %s", a.Name, camp.PlanID)
	}
	return initiative, camp, d.plans[p]
}

func settingsModel(t *testing.T, d demoData, id string) settings.Model {
	t.Helper()
	i := slices.IndexFunc(d.models, func(m settings.Model) bool { return m.ID == id })
	if i < 0 {
		t.Fatalf("no model %s", id)
	}
	return d.models[i]
}
