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
	ID         string
	Source     string
	Reference  string
	ActivityID string
	Date       date.Date
	Revenue    money.Money
	JourneyRef string
}

// JourneyTouch is one fact of a journey; Kind is its stage or web metric.
type JourneyTouch struct {
	JourneyRef string
	Touch
	Kind string
}

// Credited is each concerned activity's USD credit, 0.00 when the model gives none; WithoutRate counts no-rate facts.
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
	byRef := map[string][]JourneyTouch{}
	for _, t := range touches {
		byRef[t.JourneyRef] = append(byRef[t.JourneyRef], t)
	}
	stepsByRef := make(map[string][]Touch, len(byRef))
	for ref, ts := range byRef {
		stepsByRef[ref] = steps(ts)
	}
	dollars, withoutRate := inDollars(facts, rates)
	out := make([]Conversion, 0, len(facts))
	for i, f := range facts {
		if dollars[i] == nil {
			continue
		}
		c := Conversion{ID: f.ID, ActivityID: f.ActivityID, Date: f.Date, Revenue: *dollars[i], Journey: f.JourneyRef != ""}
		if c.Journey {
			c.Touches = stepsByRef[f.JourneyRef]
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
		creditOne(&out, c, m, inView)
	}
	return out
}

func creditOne(out *Credited, c Conversion, m Model, inView map[string]bool) {
	for _, id := range concerned(c) {
		if _, found := out.ByActivity[id]; inView[id] && !found {
			out.ByActivity[id] = money.Amount{}
		}
	}
	for _, cr := range Attribute(c, m) {
		switch {
		case cr.ActivityID == "" && inView[c.ActivityID]:
			out.Unattributed = out.Unattributed.Add(cr.Amount)
		case inView[cr.ActivityID]:
			out.ByActivity[cr.ActivityID] = out.ByActivity[cr.ActivityID].Add(cr.Amount)
		}
	}
}

func concerned(c Conversion) []string {
	ids := []string{c.ActivityID}
	for _, t := range c.Touches {
		if !t.Date.After(c.Date) {
			ids = append(ids, t.ActivityID)
		}
	}
	return ids
}
