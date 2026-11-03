package attribution

import (
	"context"
	"fmt"

	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
)

type RateSource interface {
	Rates(ctx context.Context) (money.Rates, error)
}

// Crediting is how 048 and 049 read attributed revenue, worked out from the facts at each read (FR-009).
type Crediting struct {
	settings *Service
	facts    FactStore
	rates    RateSource
}

func NewCrediting(settings *Service, facts FactStore, rates RateSource) *Crediting {
	return &Crediting{settings: settings, facts: facts, rates: rates}
}

// Credit reads the conversions on activityIDs and on every journey they touched, dated in year, and returns the
// view's share only, so an activity's credit is the same whatever else is in view (050-C3).
func (c *Crediting) Credit(ctx context.Context, scope authz.Scope, activityIDs []string, year int) (Credited, error) {
	model, err := c.settings.Designated(ctx)
	if err != nil {
		return Credited{}, err
	}
	facts, err := c.facts.Conversions(ctx, scope, activityIDs, year)
	if err != nil {
		return Credited{}, fmt.Errorf("read the conversions of %d activities: %w", len(activityIDs), err)
	}
	touches, err := c.facts.Touches(ctx, scope, journeyRefs(facts))
	if err != nil {
		return Credited{}, fmt.Errorf("read the journeys' touches: %w", err)
	}
	rates, err := c.rates.Rates(ctx)
	if err != nil {
		return Credited{}, err
	}
	converted, withoutRate := conversions(facts, touches, rates)
	credited := CreditAll(converted, model, activityIDs)
	credited.WithoutRate = withoutRate
	return credited, nil
}
