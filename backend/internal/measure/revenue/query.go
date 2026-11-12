package revenue

import (
	"net/url"
	"strings"

	"mapp/internal/measure/ranking"
)

const (
	paramCategory = "category"
	paramStage    = "stage"
)

const (
	StageINQ = "inq"
	StageMQL = "mql"
)

const (
	OrderDesc = ranking.OrderDesc
	OrderAsc  = ranking.OrderAsc
	GroupNone = ranking.GroupNone
)

const (
	SortActualRevenue    = "actualRevenue"
	SortProjectedRevenue = "projectedRevenue"
	SortActual           = "actual"
	SortProjected        = "projected"
	SortGoal             = "goal"
	SortPerformance      = "performance"
	SortActualCost       = "actualCost"
	SortROI              = "roi"
)

// categoryOf reads the category parameter: "" for all categories, "uncategorised", or a category id.
func categoryOf(values url.Values) string {
	return strings.TrimSpace(values.Get(paramCategory))
}

func revenueSorts() []string {
	return []string{SortActualRevenue, SortProjectedRevenue, SortGoal, SortPerformance, SortActualCost, SortROI}
}
func funnelSorts() []string { return []string{SortActual, SortProjected, SortGoal, SortPerformance} }

// revenueOpening is lowest performance first so the entries most behind their goal are on top.
func revenueOpening() ranking.Opening { return ranking.Opening{Sort: SortPerformance, Order: OrderAsc} }
func funnelOpening() ranking.Opening  { return ranking.Opening{Sort: SortProjected, Order: OrderDesc} }

// RankedQuery is the shared ranked list's parameters and, for Funnel stages, the stage it ranks.
type RankedQuery struct {
	Sort, Order, Group, Search, Drill, Stage string
	Size, Page                               int
}

func rankedQueryOf(q ranking.Query, stage string) RankedQuery {
	return RankedQuery{Sort: q.Sort, Order: q.Order, Group: q.Group, Search: q.Search, Drill: q.Drill, Stage: stage,
		Size: q.Size, Page: q.Page}
}

func (q RankedQuery) shared() ranking.Query {
	return ranking.Query{Sort: q.Sort, Order: q.Order, Group: q.Group, Search: q.Search, Drill: q.Drill,
		Size: q.Size, Page: q.Page}
}
