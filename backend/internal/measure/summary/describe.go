package summary

import (
	"context"
	"net/url"

	"mapp/internal/platform/actor"
)

// Describe names Summary's own parameters for the export's About this export, as Revenue's does.
func (r *ReportEntry) Describe(ctx context.Context, _ actor.Actor, own url.Values) ([][2]string, error) {
	q, err := ParseQuery(own)
	if err != nil {
		return nil, err
	}
	var lines [][2]string
	err = r.service.tx.Read(ctx, func(ctx context.Context) error {
		var readErr error
		lines, readErr = r.service.describe(ctx, q)
		return readErr
	})
	return lines, err
}

func (s *Service) describe(ctx context.Context, q Query) ([][2]string, error) {
	category, err := s.categoryWords(ctx, q.Category)
	if err != nil {
		return nil, err
	}
	lines := [][2]string{{"Category", category}}
	if q.Stage != "" {
		lines = append(lines, [2]string{"Conversion trend", stageWord(q.Stage)})
	}
	for _, table := range tables() {
		segment, chosen := q.Segments[table]
		if !chosen {
			continue
		}
		label, err := s.deps.Segments.SegmentLabel(ctx, segment)
		if err != nil {
			return nil, err
		}
		if label == "" {
			label = segment
		}
		lines = append(lines, [2]string{tableWord(table) + " by", label})
	}
	return lines, nil
}

// categoryWords names the category as its selector does; a category no longer listed keeps its ID.
func (s *Service) categoryWords(ctx context.Context, category string) (string, error) {
	switch category {
	case "":
		return "All categories", nil
	case Uncategorised:
		return uncategorisedCategory, nil
	}
	list, err := s.deps.Categories.ListCategories(ctx)
	for _, c := range list {
		if c.ID == category {
			return c.Name, err
		}
	}
	return category, err
}
