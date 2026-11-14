// Package home is the published contract of the home module: the types, ports and constructors that cross its
// boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package home

import (
	"mapp/internal/modules/home/internal/core"
)

type (
	Activity          = core.Activity
	Container         = core.Container
	Currency          = core.Currency
	Decline           = core.Decline
	Handler           = core.Handler
	HomeAttentionPage = core.HomeAttentionPage
	Plan              = core.Plan
	RecentChangesPage = core.RecentChangesPage
	Service           = core.Service
	Sources           = core.Sources
	SummaryView       = core.SummaryView
	Team              = core.Team
	Transactor        = core.Transactor
	Waiting           = core.Waiting
	WaitingPage       = core.WaitingPage
)

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewService(tx Transactor, src Sources) *Service {
	return core.NewService(tx, src)
}
