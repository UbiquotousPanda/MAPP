package core

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/ids"
)

// Tools are what every area's service changes records with, so its constructor stays within four parameters.
type Tools struct {
	Tx  Transactor
	IDs *ids.Generator
	Log Recorder
	Now clock.Clock
}

// Recorder is all another module's service may do with history; the screens' methods stay on Service.
type Recorder interface {
	Log(ctx context.Context, a actor.Actor, in LogInput) (Entry, error)
	MoveToBin(ctx context.Context, a actor.Actor, kindName, id string) (BinEntry, error)
	Undo(ctx context.Context, a actor.Actor, entryID string) (RestoreResult, error)
	ListLog(ctx context.Context, a actor.Actor, filter LogFilter) ([]Entry, int, error)
	Entries(ctx context.Context) ([]Entry, error)
	EntryViews(ctx context.Context, entries []Entry) ([]EntryView, error)
	SnapshotsInBin(ctx context.Context, kindName string) ([]Snapshot, error)
	ListBin(ctx context.Context, a actor.Actor) ([]BinEntry, error)
	CountsText(counts map[string]int) string
}
