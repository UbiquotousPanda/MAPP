package history

import (
	"context"
	"encoding/json"
	"errors"

	"mapp/internal/platform/record"
)

type seenKey struct{}

type seen struct {
	id      string
	version int
}

// WithSeenVersion makes MoveToBin bin record id only at version, the one the person saw; bulk checks its own.
func WithSeenVersion(ctx context.Context, id string, version int) context.Context {
	return context.WithValue(ctx, seenKey{}, seen{id: id, version: version})
}

func checkSeen(ctx context.Context, k Kind, top Snapshot) error {
	want, found := ctx.Value(seenKey{}).(seen)
	if !found || want.id != top.ID {
		return nil
	}
	meta, err := metaOf(top.Data)
	if err != nil {
		return err
	}
	return meta.CheckVersion(want.version, k.Singular)
}

// metaOf reads the record's bookkeeping at the top of the snapshot or, for a snapshot that wraps the record with
// what goes with it (a dataset and its rows), in the one wrapped object that has a version.
func metaOf(data json.RawMessage) (record.Meta, error) {
	var meta record.Meta
	if err := json.Unmarshal(data, &meta); err != nil || meta.Version > 0 {
		return meta, err
	}
	var parts map[string]json.RawMessage
	if err := json.Unmarshal(data, &parts); err != nil {
		return meta, err
	}
	for _, part := range parts {
		if json.Unmarshal(part, &meta) == nil && meta.Version > 0 {
			return meta, nil
		}
	}
	return meta, errors.New("history: the snapshot has no version to check a delete against")
}
