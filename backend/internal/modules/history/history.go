// Package history is the published contract of the history module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package history

import (
	"context"

	"mapp/internal/modules/history/internal/core"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/database"
	"mapp/internal/platform/ids"
)

type (
	Access         = core.Access
	Action         = core.Action
	BinEntry       = core.BinEntry
	BinEntryView   = core.BinEntryView
	BinPage        = core.BinPage
	Change         = core.Change
	ContentCount   = core.ContentCount
	DeleteResult   = core.DeleteResult
	Entry          = core.Entry
	EntryView      = core.EntryView
	Handler        = core.Handler
	Kind           = core.Kind
	LogFilter      = core.LogFilter
	LogInput       = core.LogInput
	LogPage        = core.LogPage
	LogQuery       = core.LogQuery
	LogSummary     = core.LogSummary
	PostgresStore  = core.PostgresStore
	RecordRef      = core.RecordRef
	Resolution     = core.Resolution
	RestoreContext = core.RestoreContext
	RestorePreview = core.RestorePreview
	RestoreResult  = core.RestoreResult
	Service        = core.Service
	Snapshot       = core.Snapshot
	Store          = core.Store
	Tools          = core.Tools
	Recorder       = core.Recorder
	Transactor     = core.Transactor
)

const (
	ActionChanged       = core.ActionChanged
	ActionCopied        = core.ActionCopied
	ActionCreated       = core.ActionCreated
	ActionDeleted       = core.ActionDeleted
	ActionMoved         = core.ActionMoved
	ActionRestored      = core.ActionRestored
	ActionStatusChanged = core.ActionStatusChanged
	RecordInRecycleBin  = core.RecordInRecycleBin
	Restorable          = core.Restorable
)

func Diff(before, after any) ([]Change, error) {
	return core.Diff(before, after)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tx Transactor, repo Store, generator *ids.Generator, now clock.Clock) *Service {
	return core.NewService(tx, repo, generator, now)
}

func WithNote(ctx context.Context, note string) context.Context {
	return core.WithNote(ctx, note)
}
