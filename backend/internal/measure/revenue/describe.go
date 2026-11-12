package revenue

import (
	"context"
	"net/url"

	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/actor"
)

const (
	wordsActual      = "Actual"
	wordsProjected   = "Projected"
	wordsGoal        = "Goal"
	wordsPerformance = "Performance"
)

// sortWords name each sort as the ranked list's column, with the sort and order the report opens on.
type sortWords struct {
	words   map[string]string
	sorts   []string
	opening ranking.Opening
}

func (revenueReport) sortWords() sortWords {
	return sortWords{words: map[string]string{SortActualRevenue: wordsActual, SortProjectedRevenue: wordsProjected,
		SortGoal: wordsGoal, SortPerformance: wordsPerformance}, sorts: revenueSorts(), opening: revenueOpening()}
}

func (funnelReport) sortWords() sortWords {
	return sortWords{words: map[string]string{SortActual: wordsActual, SortProjected: wordsProjected,
		SortGoal: wordsGoal, SortPerformance: wordsPerformance}, sorts: funnelSorts(), opening: funnelOpening()}
}

func (r revenueReport) Describe(ctx context.Context, a actor.Actor, own url.Values) ([][2]string, error) {
	lines, err := r.service.describe(ctx, own, r.sortWords(), nil)
	if err != nil {
		return nil, err
	}
	return r.service.withDealNotes(ctx, a, own, lines)
}

// withDealNotes adds the deals widget's notes when the export names an activity (058).
func (s *Service) withDealNotes(ctx context.Context, a actor.Actor, own url.Values, lines [][2]string) ([][2]string, error) {
	q, asked := dealsQueryOf(measure.Filter{Own: own})
	if !asked || s.deps.Deals == nil {
		return lines, nil
	}
	notes, err := s.deps.Deals.Describe(ctx, a, q)
	if err != nil {
		return nil, err
	}
	return append(lines, notes...), nil
}

func (r funnelReport) Describe(ctx context.Context, _ actor.Actor, own url.Values) ([][2]string, error) {
	var stage [][2]string
	if words, known := stageWords(own.Get(paramStage)); known {
		stage = [][2]string{{"Stage", words}}
	}
	return r.service.describe(ctx, own, r.sortWords(), stage)
}

func (s *Service) describe(ctx context.Context, own url.Values, sorts sortWords, stage [][2]string) ([][2]string, error) {
	q, err := ranking.Parse(own, sorts.sorts, sorts.opening)
	if err != nil {
		return nil, err
	}
	category, err := s.categoryWords(ctx, categoryOf(own))
	if err != nil {
		return nil, err
	}
	lines := append([][2]string{{"Category", category}}, stage...)
	order := map[string]string{ranking.OrderDesc: "High to low", ranking.OrderAsc: "Low to high"}[q.Order]
	lines = append(lines, [2]string{"Sort by", sorts.words[q.Sort]}, [2]string{"Order", order})
	if q.Search != "" {
		lines = append(lines, [2]string{"Search", q.Search})
	}
	return lines, nil
}

// categoryWords names the category as its selector does; a category no longer listed keeps its ID.
func (s *Service) categoryWords(ctx context.Context, category string) (string, error) {
	switch category {
	case "":
		return "All categories", nil
	case categoryUncategorised:
		return "Uncategorised", nil
	}
	name := category
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		list, err := s.deps.Categories.ListCategories(ctx)
		for _, c := range list {
			if c.ID == category {
				name = c.Name
			}
		}
		return err
	})
	return name, err
}

func stageWords(stage string) (string, bool) {
	words, known := map[string]string{StageINQ: "INQ", StageMQL: "MQL"}[stage]
	return words, known
}
