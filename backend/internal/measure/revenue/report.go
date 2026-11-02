package revenue

import (
	"context"

	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/actor"
)

// revenueReport is Revenue in 039's registry.
type revenueReport struct {
	service *Service
}

func NewRevenueReport(s *Service) measure.Report {
	return revenueReport{service: s}
}

func (revenueReport) Key() string     { return measure.KeyRevenue }
func (revenueReport) Available() bool { return true }

func (revenueReport) Params() []string {
	return append([]string{paramCategory}, ranking.Params()...)
}

func (r revenueReport) Sheets(ctx context.Context, a actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	return r.service.revenueSheets(ctx, a, f)
}

// funnelReport is Funnel stages in 039's registry, sharing Revenue's service.
type funnelReport struct {
	service *Service
}

func NewFunnelReport(s *Service) measure.Report {
	return funnelReport{service: s}
}

func (funnelReport) Key() string     { return measure.KeyFunnel }
func (funnelReport) Available() bool { return true }

func (funnelReport) Params() []string {
	return append([]string{paramCategory, paramStage}, ranking.Params()...)
}

func (r funnelReport) Sheets(ctx context.Context, a actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	return r.service.funnelSheets(ctx, a, f)
}
