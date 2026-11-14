package attribution

import (
	"cmp"
	"slices"
	"strings"

	"mapp/internal/platform/money"
)

// panel builds one activity's answer from its journeyFacts: the deals, their steps and the shares under the
// designated model and, when asked, a comparison model.
type panel struct {
	opened  ActivityName
	q       DealsQuery
	model   Model
	compare Model
	display money.Display
}

type dealTotals struct {
	credited   money.Money
	comparison *money.Money
	booked     *money.Money
}

func (p panel) build(jf journeyFacts) ActivityDeals {
	deals := make([]Deal, 0, len(jf.deals))
	for _, c := range jf.deals {
		deals = append(deals, p.deal(jf, c))
	}
	sortDeals(deals)
	deals, totals := p.inDisplay(deals)
	return ActivityDeals{Activity: dealActivityOf(p.opened), Year: p.q.Year, Model: choiceOf(p.model), Comparison: p.comparison(),
		Credited: totals.credited, ComparisonCredited: totals.comparison, Booked: totals.booked, Reason: p.reason(deals),
		HeldFacts: jf.held, WithoutRate: jf.without, Total: len(deals), Page: p.q.Page, Size: dealsPageSize,
		Deals: pageOf(deals, p.q.Page)}
}

func (p panel) deal(jf journeyFacts, c Conversion) Deal {
	f := jf.byID[c.ID]
	deal := Deal{ID: c.ID, Source: f.Source, Reference: f.Reference, Date: c.Date, BookedOn: jf.names[c.ActivityID],
		Amount: f.Revenue, USD: money.USD(c.Revenue), Rate: rateText(jf.rates, f.Revenue.Currency), Steps: []DealStep{}}
	shares := Shares(c, p.model)
	switch {
	case !c.Journey:
		deal.Journey, deal.Share = JourneyNone, deal.USD
	case len(shares) == 0:
		deal.Journey, deal.Share = JourneyUnattributed, money.USD(money.Amount{})
	default:
		deal.Journey = JourneyShared
		deal.Steps, deal.Share = p.steps(jf, c, shares)
	}
	if p.compare != "" && c.Journey {
		deal.ComparisonShare = p.comparisonShare(c, &deal)
	} else if p.compare != "" {
		deal.ComparisonShare = &deal.USD
	}
	return deal
}

// steps lists the sharing steps in order with each one's share, and adds up this activity's.
func (p panel) steps(jf journeyFacts, c Conversion, shares []Share) ([]DealStep, money.Money) {
	journey := jf.byRef[jf.byID[c.ID].JourneyRef]
	steps := make([]DealStep, 0, len(shares))
	var own money.Amount
	for _, s := range shares {
		step := DealStep{Activity: jf.names[s.ActivityID], Date: s.Date, Kinds: kindsOf(journey, s.Touch),
			Share: money.USD(s.Amount), ThisActivity: s.ActivityID == p.opened.ID}
		if step.Kinds == nil {
			step.Kinds = []string{}
		}
		if step.ThisActivity {
			own = own.Add(s.Amount)
		}
		steps = append(steps, step)
	}
	return steps, money.USD(own)
}

// comparisonShare works the comparison model's shares out over the same steps and writes each step's.
func (p panel) comparisonShare(c Conversion, deal *Deal) *money.Money {
	compared := Shares(c, p.compare)
	var own money.Amount
	for i := range deal.Steps {
		share := money.USD(compared[i].Amount)
		deal.Steps[i].ComparisonShare = &share
		if deal.Steps[i].ThisActivity {
			own = own.Add(compared[i].Amount)
		}
	}
	total := money.USD(own)
	return &total
}

func rateText(rates money.Rates, currency string) *string {
	if currency == money.BaseCurrency {
		return nil
	}
	rate, err := rates.Of(currency)
	if err != nil {
		return nil
	}
	text := rate.String()
	return &text
}

func sortDeals(deals []Deal) {
	slices.SortFunc(deals, func(a, b Deal) int {
		return cmp.Or(b.Share.Amount.Cmp(a.Share.Amount), b.Date.Compare(a.Date), strings.Compare(a.ID, b.ID))
	})
}

// inDisplay converts this activity's shares and the deals booked on it as parts (D-061), so they add up to the
// ranked list's attributed revenue and Actual in the display currency.
func (p panel) inDisplay(deals []Deal) ([]Deal, dealTotals) {
	out := slices.Clone(deals)
	shares, credited := p.parts(deals, func(d Deal) *money.Money { return &d.Share })
	for i := range out {
		out[i].Share = shares[i]
	}
	totals := dealTotals{credited: credited}
	if p.compare != "" {
		compared, total := p.parts(deals, func(d Deal) *money.Money { return d.ComparisonShare })
		for i := range out {
			out[i].ComparisonShare = &compared[i]
		}
		totals.comparison = &total
	}
	booked := slices.DeleteFunc(slices.Clone(deals), func(d Deal) bool { return d.BookedOn.ID != p.opened.ID })
	if len(booked) > 0 {
		_, total := p.parts(booked, func(d Deal) *money.Money { return &d.USD })
		totals.booked = &total
	}
	return out, totals
}

func (p panel) parts(deals []Deal, of func(Deal) *money.Money) ([]money.Money, money.Money) {
	amounts := make([]money.Money, len(deals))
	for i, d := range deals {
		amounts[i] = *of(d)
	}
	converted := p.display.Parts(amounts)
	total := money.Money{Currency: p.display.Currency()}
	for _, m := range converted {
		total.Amount = total.Amount.Add(m.Amount)
	}
	return converted, total
}

func (p panel) reason(deals []Deal) string {
	switch {
	case len(deals) > 0:
		return ""
	case slices.Contains([]string{"created", "submitted", "declined"}, p.opened.Status):
		return ReasonNotApproved
	}
	return ReasonNoData
}

func (p panel) comparison() *ModelChoice {
	if p.compare == "" {
		return nil
	}
	choice := choiceOf(p.compare)
	return &choice
}

func choiceOf(m Model) ModelChoice {
	for _, c := range Models() {
		if c.Key == m {
			return c
		}
	}
	return ModelChoice{Key: m, Name: m.Name()}
}

// pageOf is one page of 25, or every deal for page 0 (the export).
func pageOf(deals []Deal, page int) []Deal {
	start, end := 0, len(deals)
	if page > 0 {
		start = min((page-1)*dealsPageSize, len(deals))
		end = min(start+dealsPageSize, len(deals))
	}
	out := make([]Deal, end-start)
	copy(out, deals[start:end])
	return out
}
