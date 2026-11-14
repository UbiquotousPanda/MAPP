package seed_test

import (
	"testing"

	"mapp/internal/campaign"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/settings"
)

// The demo story's figures follow from the seeded budgets: Helix launch keeps 150,000.00 for initiatives,
// FY2026 Lubricants Europe 50,000.00 for campaigns, Brand platform is over-allocated by 50,000.00.
func TestLoad_BudgetsFlowDown_FR010(t *testing.T) {
	t.Parallel()
	d := loadDemo(t)
	remaining := func(budget money.Money, children []money.Money) string {
		return budget.Amount.Sub(sumOf(children)).Format()
	}
	for _, c := range d.campaigns {
		var children []money.Money
		for _, i := range d.initiatives {
			if i.CampaignID == c.ID {
				children = append(children, *i.Budget)
			}
		}
		want := map[string]string{"C-1001": "150,000.00", "C-1002": "100,000.00", "C-1003": "50,000.00", "C-1004": "-50,000.00",
			"C-1005": "0.00"}[c.ID]
		if got := remaining(*c.Budget, children); got != want {
			t.Errorf("%s keeps %s for its initiatives, want %s", c.Name, got, want)
		}
	}
	for _, p := range d.plans {
		var children []money.Money
		for _, c := range d.campaigns {
			if c.PlanID == p.ID {
				children = append(children, *c.Budget)
			}
		}
		want := map[string]string{"P-1001": "50,000.00", "P-1002": "200,000.00", "P-1003": "200,000.00", "P-1004": "200,000.00"}[p.ID]
		if got := remaining(money.USD(*p.Budget), children); got != want {
			t.Errorf("%s keeps %s for its campaigns, want %s", p.Name, got, want)
		}
	}
}

// Initiatives lie inside their campaign's dates (R3); Brand platform ends after its plan's year (the R4
// warning); Fleet cards has no dates; Retail growth has no cluster and no region ("2 fields needed"), the
// other campaigns have both (005 data model §1–§2, §9).
func TestLoad_CampaignRules_R3_R4(t *testing.T) {
	t.Parallel()
	d := loadDemo(t)
	byID := map[string]campaign.Campaign{}
	for _, c := range d.campaigns {
		byID[c.ID] = c
	}
	for _, i := range d.initiatives {
		c := byID[i.CampaignID]
		if i.StartDate == nil {
			if i.Name != "Fleet cards" || i.EndDate != nil {
				t.Errorf("%s has no start date", i.Name)
			}
			continue
		}
		if i.StartDate.Before(*c.StartDate) || i.EndDate.After(*c.EndDate) || i.EndDate.Before(*i.StartDate) {
			t.Errorf("%s (%s) is not inside %s (%s)", i.Name, dates(i.StartDate, i.EndDate), c.Name, dates(c.StartDate, c.EndDate))
		}
	}
	if brand := byID["C-1004"]; !brand.EndDate.After(date.YearEnd(2027)) {
		t.Errorf("Brand platform ends %s, want after its plan's year", brand.EndDate)
	}

	cluster := d.attributeID(t, settings.LevelCampaign, "Cluster")
	region := d.attributeID(t, settings.LevelCampaign, "Region")
	for _, c := range d.campaigns {
		_, hasCluster := c.Attributes[cluster]
		_, hasRegion := c.Attributes[region]
		if hasCluster != (c.Name != "Retail growth") || hasRegion != hasCluster {
			t.Errorf("%s: cluster %v, region %v", c.Name, hasCluster, hasRegion)
		}
	}
}

func dates(start, end *date.Date) string {
	if start == nil || end == nil {
		return "no dates"
	}
	return date.FormatRange(*start, *end)
}

func sumOf(values []money.Money) money.Amount {
	var total money.Amount
	for _, v := range values {
		total = total.Add(v.Amount)
	}
	return total
}
