package attribution

import (
	"cmp"
	"context"
	"slices"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

const msgActivityGone = "We can't find this activity."

type DealsDeps struct {
	Tx       Transactor
	Settings *Service
	Store    DealStore
	Rates    RateSource
	Displays Displays
	Now      clock.Clock
}

// Deals explains one activity's attributed revenue deal by deal, on the reads and crediting the ranked list uses.
type Deals struct {
	deps DealsDeps
}

func NewDeals(deps DealsDeps) *Deals {
	return &Deals{deps: deps}
}

// Of answers the panel for q in one read snapshot; an activity the viewer can't see is not found.
func (d *Deals) Of(ctx context.Context, a actor.Actor, q DealsQuery) (ActivityDeals, error) {
	query := q.withDefaults(date.Today(d.deps.Now()))
	var out ActivityDeals
	err := d.deps.Tx.Read(ctx, func(ctx context.Context) error {
		var err error
		out, err = d.read(ctx, a, query)
		return err
	})
	return out, err
}

func (q DealsQuery) withDefaults(today date.Date) DealsQuery {
	return DealsQuery{ActivityID: q.ActivityID, Year: cmp.Or(q.Year, today.Year()), Currency: q.Currency,
		Compare: q.Compare, Page: q.Page}
}

func (d *Deals) read(ctx context.Context, a actor.Actor, q DealsQuery) (ActivityDeals, error) {
	scope := authz.ScopeOf(ctx)
	opened, err := d.opened(ctx, scope, q.ActivityID)
	if err != nil {
		return ActivityDeals{}, err
	}
	model, err := d.deps.Settings.Designated(ctx)
	if err != nil {
		return ActivityDeals{}, err
	}
	jf, err := d.journeysOf(ctx, scope, q)
	if err != nil {
		return ActivityDeals{}, err
	}
	display, err := d.deps.Displays.Display(ctx, a, q.Currency)
	if err != nil {
		return ActivityDeals{}, err
	}
	p := panel{opened: opened, q: q, model: model, compare: comparedWith(q.Compare, model), display: display}
	return p.build(jf), nil
}

func (d *Deals) opened(ctx context.Context, scope authz.Scope, id string) (ActivityName, error) {
	names, err := d.deps.Store.ActivitiesInScope(ctx, scope, []string{id})
	if err != nil {
		return ActivityName{}, err
	}
	if len(names) == 0 {
		return ActivityName{}, errs.NotFound(msgActivityGone)
	}
	return names[0], nil
}

// journeyFacts is one panel's reading: the facts and touches in scope, the deals the activity is concerned in,
// the names of every activity they mention and the held facts around them.
type journeyFacts struct {
	activity string
	byID     map[string]RevenueFact
	byRef    map[string][]JourneyTouch
	rates    money.Rates
	deals    []Conversion
	without  int
	names    map[string]DealActivity
	held     int
}

func (d *Deals) journeysOf(ctx context.Context, scope authz.Scope, q DealsQuery) (journeyFacts, error) {
	jf, err := d.readJourneys(ctx, scope, q)
	if err != nil {
		return jf, err
	}
	jf.names, err = d.namesOf(ctx, scope, jf)
	if err != nil {
		return jf, err
	}
	jf.held, err = d.deps.Store.HeldFacts(ctx, scope, q.ActivityID, jf.refs())
	return jf, err
}

func (d *Deals) readJourneys(ctx context.Context, scope authz.Scope, q DealsQuery) (journeyFacts, error) {
	facts, err := d.deps.Store.Conversions(ctx, scope, []string{q.ActivityID}, q.Year)
	if err != nil {
		return journeyFacts{}, err
	}
	touches, err := d.deps.Store.Touches(ctx, scope, journeyRefs(facts))
	if err != nil {
		return journeyFacts{}, err
	}
	rates, err := d.deps.Rates.Rates(ctx)
	if err != nil {
		return journeyFacts{}, err
	}
	jf := newJourneyFacts(q.ActivityID, facts, touches)
	jf.rates = rates
	converted, without := conversions(facts, touches, rates)
	jf.deals, jf.without = concernedIn(converted, q.ActivityID), without
	return jf, nil
}

func newJourneyFacts(activity string, facts []RevenueFact, touches []JourneyTouch) journeyFacts {
	jf := journeyFacts{activity: activity, byID: make(map[string]RevenueFact, len(facts)), byRef: map[string][]JourneyTouch{}}
	for _, f := range facts {
		jf.byID[f.ID] = f
	}
	for _, t := range touches {
		jf.byRef[t.JourneyRef] = append(jf.byRef[t.JourneyRef], t)
	}
	return jf
}

func concernedIn(conversions []Conversion, activityID string) []Conversion {
	return slices.DeleteFunc(slices.Clone(conversions), func(c Conversion) bool {
		return !slices.Contains(concerned(c), activityID)
	})
}

// namesOf reads every activity the deals mention in one go; one the scope lost meanwhile keeps its ID as its name.
func (d *Deals) namesOf(ctx context.Context, scope authz.Scope, jf journeyFacts) (map[string]DealActivity, error) {
	ids := jf.activityIDs()
	names, err := d.deps.Store.ActivitiesInScope(ctx, scope, ids)
	if err != nil {
		return nil, err
	}
	out := make(map[string]DealActivity, len(ids))
	for _, id := range ids {
		out[id] = DealActivity{ID: id, Name: id}
	}
	for _, n := range names {
		out[n.ID] = dealActivityOf(n)
	}
	return out, nil
}

func dealActivityOf(n ActivityName) DealActivity {
	return DealActivity{ID: n.ID, Name: n.Name, PlanID: n.PlanID, PlanName: n.PlanName}
}

func (jf journeyFacts) activityIDs() []string {
	var ids []string
	for _, c := range jf.deals {
		for _, id := range concerned(c) {
			if !slices.Contains(ids, id) {
				ids = append(ids, id)
			}
		}
	}
	return ids
}

func (jf journeyFacts) refs() []string {
	var refs []string
	for _, c := range jf.deals {
		if ref := jf.byID[c.ID].JourneyRef; ref != "" && !slices.Contains(refs, ref) {
			refs = append(refs, ref)
		}
	}
	return refs
}

func comparedWith(compare, designated Model) Model {
	if compare == "" || compare == designated || !listedModel(compare) {
		return ""
	}
	return compare
}
