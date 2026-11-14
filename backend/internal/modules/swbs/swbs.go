// Package swbs is the published contract of the swbs module: the types, ports and constructors that cross its
// boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package swbs

import (
	"context"

	"mapp/internal/modules/history"
	"mapp/internal/modules/swbs/internal/core"
	"mapp/internal/platform/database"
	"mapp/internal/platform/ids"
)

type (
	Answer        = core.Answer
	Candidate     = core.Candidate
	Code          = core.Code
	DemoLoad      = core.DemoLoad
	GSAP          = core.GSAP
	Handler       = core.Handler
	Issued        = core.Issued
	LineItems     = core.LineItems
	PostgresStore = core.PostgresStore
	Request       = core.Request
	Run           = core.Run
	Service       = core.Service
	Simulated     = core.Simulated
	Store         = core.Store
)

func LoadDemo(ctx context.Context, repo Store, generator *ids.Generator, demo DemoLoad) (Run, error) {
	return core.LoadDemo(ctx, repo, generator, demo)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, items LineItems, gsap GSAP) *Service {
	return core.NewService(tools, repo, items, gsap)
}

func NewSimulated(issued Issued) Simulated {
	return core.NewSimulated(issued)
}
