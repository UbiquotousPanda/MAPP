package attribution

import (
	"context"

	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// FactStore reads 046's counted facts within the person's scope; held, unmatched and replaced facts never count.
type FactStore interface {
	Conversions(ctx context.Context, scope authz.Scope, activityIDs []string, year int) ([]RevenueFact, error)
	Touches(ctx context.Context, scope authz.Scope, journeyRefs []string) ([]JourneyTouch, error)
}

// RevenueFact is a conversion in the fact's own currency; JourneyRef is "" when it has no journey.
type RevenueFact struct {
	ActivityID string
	Date       date.Date
	Revenue    money.Money
	JourneyRef string
}

type JourneyTouch struct {
	JourneyRef string
	Touch
}

// Credited is each activity's credited revenue in USD; WithoutRate counts the facts left out for want of a rate.
type Credited struct {
	Model        Model
	ByActivity   map[string]money.Amount
	Unattributed money.Amount
	WithoutRate  int
}

func journeyRefs(facts []RevenueFact) []string {
	seen := map[string]bool{}
	var refs []string
	for _, f := range facts {
		if f.JourneyRef != "" && !seen[f.JourneyRef] {
			seen[f.JourneyRef] = true
			refs = append(refs, f.JourneyRef)
		}
	}
	return refs
}

func conversions(facts []RevenueFact, touches []JourneyTouch, rates money.Rates) ([]Conversion, int) {
	byRef := map[string][]Touch{}
	for _, t := range touches {
		byRef[t.JourneyRef] = append(byRef[t.JourneyRef], t.Touch)
	}
	out := make([]Conversion, 0, len(facts))
	withoutRate := 0
	for _, f := range facts {
		usd, err := rates.Convert(f.Revenue, money.BaseCurrency)
		if err != nil {
			withoutRate++
			continue
		}
		c := Conversion{ActivityID: f.ActivityID, Date: f.Date, Revenue: usd.Amount, Journey: f.JourneyRef != ""}
		if c.Journey {
			c.Touches = byRef[f.JourneyRef]
		}
		out = append(out, c)
	}
	return out, withoutRate
}

// CreditAll credits every conversion under m and keeps the view's share: its activities' credit, and the
// unattributed revenue of the conversions on them.
func CreditAll(conversions []Conversion, m Model, view []string) Credited {
	inView := map[string]bool{}
	for _, id := range view {
		inView[id] = true
	}
	out := Credited{Model: m, ByActivity: map[string]money.Amount{}}
	for _, c := range conversions {
		for _, cr := range Attribute(c, m) {
			switch {
			case cr.ActivityID == "" && inView[c.ActivityID]:
				out.Unattributed = out.Unattributed.Add(cr.Amount)
			case inView[cr.ActivityID]:
				out.ByActivity[cr.ActivityID] = out.ByActivity[cr.ActivityID].Add(cr.Amount)
			}
		}
	}
	return out
}
