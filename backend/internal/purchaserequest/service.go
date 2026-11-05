package purchaserequest

import (
	"context"

	"mapp/internal/history"
	"mapp/internal/overspend"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/ids"
)

const (
	recordKind        = "purchaseRequest"
	lineKind          = "purchaseRequestLine"
	configurationKind = "purchaseRequestConfiguration"
	recordNoun        = "purchase request"
)

type Service struct {
	tx      Transactor
	repo    Store
	ids     *ids.Generator
	history *history.Service
	now     clock.Clock
	deps    Deps
	rounds  Rounds
	engine  Engine
	gsap    GSAP
	// overspend is Settings › Overspend control; nil allows no tolerance and only warns.
	overspend Overspend
}

// Overspend is Settings › Overspend control as purchase requests read it.
type Overspend interface {
	overspend.Tolerance
	RefusesOverPlannedCost(ctx context.Context) (bool, error)
}

func NewService(store Store, tools history.Tools, deps Deps) *Service {
	return &Service{tx: tools.Tx, repo: store, ids: tools.IDs, history: tools.Log, now: tools.Now, deps: deps}
}

// UseRounds connects the approval engine; until then saving with a submission answers not found.
func (s *Service) UseRounds(r Rounds) {
	s.rounds = r
}

// UseOverspend lets a line exceed what its line item has left by the tolerance of its amount and, under Warn,
// lets a submission go while line items exceed an activity's planned cost.
func (s *Service) UseOverspend(o Overspend) {
	s.overspend = o
}

func (s *Service) tolerancePercent(ctx context.Context) (int, error) {
	if s.overspend == nil {
		return 0, nil
	}
	return s.overspend.TolerancePercent(ctx)
}

func (s *Service) refusesOverPlannedCost(ctx context.Context) (bool, error) {
	if s.overspend == nil {
		return false, nil
	}
	return s.overspend.RefusesOverPlannedCost(ctx)
}

// UseGSAP connects GSAP (the simulated GSAP now, 033); until then the GSAP run is unavailable.
func (s *Service) UseGSAP(g GSAP) {
	s.gsap = g
}

func viewScope(ctx context.Context) ViewScope {
	return ViewScope{Plans: authz.ScopeOf(ctx), List: authz.PermissionScopeOf(ctx, authz.PurchaseRequestsList)}
}

// visible returns the purchase request when the person acting sees it, and not found otherwise.
func (s *Service) visible(ctx context.Context, id string) (PurchaseRequest, error) {
	pr, found, err := s.repo.GetInScope(ctx, viewScope(ctx), id)
	if err != nil {
		return PurchaseRequest{}, err
	}
	if !found {
		return PurchaseRequest{}, errs.NotFound(msgNotFound)
	}
	return pr, nil
}

// switchedOn refuses every change while Purchase Support is off.
func (s *Service) switchedOn(ctx context.Context) (Configuration, error) {
	c, err := s.repo.Configuration(ctx)
	if err != nil {
		return Configuration{}, err
	}
	if !c.PurchaseSupport {
		return c, errs.NotAllowed(msgSwitchedOff)
	}
	return c, nil
}

func (pr PurchaseRequest) planFacts(facts map[string]LineItemFacts) authz.PlanFacts {
	for _, l := range pr.Lines {
		if f, found := facts[l.LineItemID]; found {
			return f.Plan.Access
		}
	}
	return authz.PlanFacts{ID: pr.PlanID}
}

func (pr PurchaseRequest) lineItemIDs() []string {
	list := make([]string, 0, len(pr.Lines))
	for _, l := range pr.Lines {
		list = append(list, l.LineItemID)
	}
	return list
}

// factsOf reads the line items of the purchase request's lines; one gone from the plan is left out.
func (s *Service) factsOf(ctx context.Context, pr PurchaseRequest) (map[string]LineItemFacts, error) {
	return s.deps.LineItems.Facts(ctx, pr.lineItemIDs())
}
