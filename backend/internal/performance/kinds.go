package performance

import (
	"context"
	"encoding/json"
	"fmt"

	"mapp/internal/history"
)

// A data source reaches the recycle bin with its mappings; a fact is replaced or undone with its import.
func (s *Service) Kinds() []history.Kind {
	return append([]history.Kind{{
		Name: sourceKind, Singular: sourceKindSingular, Plural: sourceKindPlural,
		Snapshot: s.snapshotSource, Remove: s.removeSource, Put: s.restoreSource,
	}, {
		Name: mappingKind, Singular: mappingKindSingular, Plural: mappingKindPlural, Parent: sourceKind,
		Snapshot: s.snapshotMapping, ChildIDs: s.mappingIDsOf, Remove: s.removeMapping, Put: s.restoreMapping,
	}, {
		Name: importKind, Singular: importKindSingular, Plural: importKindPlural,
		Snapshot: neverBinned, Remove: noRemove, Put: noPut,
	}, {
		Name: reviewKind, Singular: "row to review", Plural: "rows to review",
		Snapshot: neverBinned, Remove: noRemove, Put: noPut,
	}, {
		Name: configurationKind, Singular: configurationWord, Plural: configurationWord,
		Snapshot: neverBinned, Remove: noRemove, Put: noPut,
	}}, s.childKinds()...)
}

func neverBinned(context.Context, string) (history.Snapshot, bool, error) {
	return history.Snapshot{}, false, nil
}

func noRemove(context.Context, string) error { return nil }

func noPut(context.Context, history.Snapshot) error { return nil }

func (s *Service) snapshotSource(ctx context.Context, id string) (history.Snapshot, bool, error) {
	found, err := s.repo.ListSources(ctx, id)
	if err != nil || len(found) == 0 {
		return history.Snapshot{}, false, err
	}
	data, err := json.Marshal(found[0].Source)
	if err != nil {
		return history.Snapshot{}, false, err
	}
	return history.Snapshot{ID: found[0].ID, Name: found[0].Name, Data: data}, true, nil
}

func (s *Service) removeSource(ctx context.Context, id string) error {
	deleted, err := s.repo.DeleteSource(ctx, id)
	if err == nil && !deleted {
		return fmt.Errorf("performance source %s is still in use", id)
	}
	return err
}

func (s *Service) restoreSource(ctx context.Context, snapshot history.Snapshot) error {
	var src Source
	if err := json.Unmarshal(snapshot.Data, &src); err != nil {
		return err
	}
	return s.repo.PutSource(ctx, src)
}

func (s *Service) snapshotMapping(ctx context.Context, id string) (history.Snapshot, bool, error) {
	found, err := s.mapping(ctx, id)
	if err != nil {
		return history.Snapshot{}, false, nil //nolint:nilerr // a missing mapping is not a snapshot failure
	}
	data, err := json.Marshal(found)
	if err != nil {
		return history.Snapshot{}, false, err
	}
	return history.Snapshot{ID: found.ID, Name: found.ColumnName, ParentID: found.SourceID, Data: data}, true, nil
}

func (s *Service) mappingIDsOf(ctx context.Context, sourceID string) ([]string, error) {
	mappings, err := s.repo.ListMappings(ctx, []string{sourceID})
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(mappings))
	for _, m := range mappings {
		ids = append(ids, m.ID)
	}
	return ids, nil
}

func (s *Service) removeMapping(ctx context.Context, id string) error {
	return s.repo.DeleteMapping(ctx, id)
}

func (s *Service) restoreMapping(ctx context.Context, snapshot history.Snapshot) error {
	var mapping Mapping
	if err := json.Unmarshal(snapshot.Data, &mapping); err != nil {
		return err
	}
	return s.repo.PutMapping(ctx, mapping)
}
