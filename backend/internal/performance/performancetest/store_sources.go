package performancetest

import (
	"context"
	"slices"
	"strings"

	"mapp/internal/performance"
)

func (s *Store) ListSources(_ context.Context, id string) ([]performance.SourceView, error) {
	all, err := s.sources.List()
	if err != nil {
		return nil, err
	}
	views := make([]performance.SourceView, 0, len(all))
	for _, src := range all {
		if id != "" && src.ID != id {
			continue
		}
		views = append(views, performance.SourceView{Source: src, FactCount: s.factsOf(src.ID)})
	}
	slices.SortFunc(views, func(a, b performance.SourceView) int {
		return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
	})
	return views, nil
}

func (s *Store) factsOf(sourceID string) int {
	all, err := s.facts.List()
	if err != nil {
		return 0
	}
	count := 0
	for _, f := range all {
		if f.SourceID == sourceID {
			count++
		}
	}
	return count
}

func (s *Store) PutSource(ctx context.Context, src performance.Source) error {
	return s.sources.Put(ctx, src)
}

func (s *Store) SourceUse(_ context.Context, id string) (performance.SourceUse, error) {
	use := performance.SourceUse{Facts: s.factsOf(id)}
	imports, err := s.imports.List()
	if err != nil {
		return use, err
	}
	reviews, err := s.reviews.List()
	if err != nil {
		return use, err
	}
	use.Imports = countWhere(imports, func(i performance.Import) bool { return i.SourceID == id })
	use.ReviewRows = countWhere(reviews, func(r performance.ReviewRow) bool { return r.SourceID == id })
	for _, k := range s.integrations {
		if k.SourceID == id {
			use.IntegrationIDs++
		}
	}
	return use, nil
}

func countWhere[T any](all []T, match func(T) bool) int {
	count := 0
	for _, v := range all {
		if match(v) {
			count++
		}
	}
	return count
}

// DeleteSource takes the source's mappings with it, as their foreign key's ON DELETE CASCADE does.
func (s *Store) DeleteSource(ctx context.Context, id string) (bool, error) {
	use, err := s.SourceUse(ctx, id)
	if err != nil || use.IsUsed() {
		return false, err
	}
	if _, found, getErr := s.sources.Get(id); getErr != nil || !found {
		return false, getErr
	}
	mappings, err := s.ListMappings(ctx, []string{id})
	if err != nil {
		return false, err
	}
	for _, m := range mappings {
		if err = s.mappings.Delete(ctx, m.ID); err != nil {
			return false, err
		}
	}
	return true, s.sources.Delete(ctx, id)
}
