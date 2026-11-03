package wavebqa_test

import (
	"math"
	"net/http"
	"slices"
	"strings"
	"testing"
)

const (
	lubricantsPlan = "FY2026 Lubricants Europe"
	mobilityPlan   = "FY2026 Mobility China"
	uncategorised  = "uncategorised"
	statePast      = "actual"
)

func levels() []string {
	return []string{"plan", "campaign", "initiative", "activity"}
}

// reportPath is a 049 path for the plan year 2026 unless a parameter names another, then the parameters.
func reportPath(path string, params ...string) string {
	if slices.ContainsFunc(params, func(p string) bool { return strings.HasPrefix(p, "year=") }) {
		return path + "?" + joined(params...)
	}
	return path + "?" + joined(append([]string{"year=2026"}, params...)...)
}

func joined(params ...string) string {
	kept := make([]string, 0, len(params))
	for _, p := range params {
		if p != "" {
			kept = append(kept, p)
		}
	}
	return strings.Join(kept, "&")
}

type card[T any] struct {
	Value  *T     `json:"value"`
	Reason string `json:"reason"`
}

type revenueAnswer struct {
	Cards struct {
		Goal, Actual, Projected card[amount]
		Performance             card[float64]
	} `json:"cards"`
	Periods []struct {
		Key, State              string
		Actual, Projected, Goal *amount
	} `json:"periods"`
	Projection *stamp `json:"projection"`
	Reason     string `json:"reason"`
}

type funnelAnswer struct {
	Stage           string   `json:"stage"`
	AvailableStages []string `json:"availableStages"`
	UncoveredCount  int      `json:"uncoveredCount"`
	Cards           struct {
		Goal, Actual, Projected, Performance, Conversion card[float64]
	} `json:"cards"`
	Periods []struct {
		Key, State              string
		Actual, Projected, Goal *int64
	} `json:"periods"`
	Projection *stamp `json:"projection"`
	Reason     string `json:"reason"`
}

func revenueOf(t *testing.T, who person, query string) revenueAnswer {
	t.Helper()
	return decode[revenueAnswer](t, who.expect(t, get(reportPath("/reports/revenue", query)), http.StatusOK))
}

func funnelOf(t *testing.T, who person, query string) funnelAnswer {
	t.Helper()
	return decode[funnelAnswer](t, who.expect(t, get(reportPath("/reports/funnel", query)), http.StatusOK))
}

// figures are a goal, an actual and an "actual or projected" in whole units: cents or counts.
type figures struct{ goal, actual, projected *int64 }

type point struct {
	key, state string
	figures
}

// shape is one report's cards and series in whole units, so Revenue and Funnel stages are checked alike.
type shape struct {
	cards   figures
	periods []point
}

func (a revenueAnswer) shape() shape {
	s := shape{cards: figures{cents(a.Cards.Goal.Value), cents(a.Cards.Actual.Value), cents(a.Cards.Projected.Value)}}
	for _, p := range a.Periods {
		s.periods = append(s.periods, point{p.Key, p.State, figures{cents(p.Goal), cents(p.Actual), cents(p.Projected)}})
	}
	return s
}

func (a funnelAnswer) shape() shape {
	s := shape{cards: figures{whole(a.Cards.Goal.Value), whole(a.Cards.Actual.Value), whole(a.Cards.Projected.Value)}}
	for _, p := range a.Periods {
		s.periods = append(s.periods, point{p.Key, p.State, figures{p.Goal, p.Actual, p.Projected}})
	}
	return s
}

func whole(v *float64) *int64 {
	if v == nil {
		return nil
	}
	n := int64(math.Round(*v))
	return &n
}

func orZero(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

// actualOrProjected is the series' own total: actual in the months behind today, projected from the month in progress.
func (s shape) actualOrProjected() int64 {
	var total int64
	for _, p := range s.periods {
		if p.state == statePast {
			total += orZero(p.actual)
		} else {
			total += orZero(p.projected)
		}
	}
	return total
}

func (s shape) actualTotal() int64 {
	var total int64
	for _, p := range s.periods {
		total += orZero(p.actual)
	}
	return total
}

type revenueFigures struct {
	Goal             *amount  `json:"goal"`
	Actual           *amount  `json:"actual"`
	Projected        *amount  `json:"projected"`
	Performance      *float64 `json:"performance"`
	ActualCost       *amount  `json:"actualCost"`
	ROI              *float64 `json:"roi"`
	ActualCostReason string   `json:"actualCostReason"`
	ROIReason        string   `json:"roiReason"`
}

func (f revenueFigures) whole() figures {
	return figures{cents(f.Goal), cents(f.Actual), cents(f.Projected)}
}

type funnelFigures struct {
	Goal, Actual, Projected *int64
	Performance, Conversion *float64
}

func (f funnelFigures) whole() figures { return figures{f.Goal, f.Actual, f.Projected} }

type entry[F any] struct {
	ID, Level, Name, PlanID string
	Figures                 F
	Children                []entry[F]
}

type rankedGroup[F any] struct {
	Key     string     `json:"key"`
	Totals  F          `json:"totals"`
	Entries []entry[F] `json:"entries"`
}

type ranked[F any] struct {
	Total  int              `json:"total"`
	Groups []rankedGroup[F] `json:"groups"`
}

func (r ranked[F]) tops() []entry[F] {
	var out []entry[F]
	for _, g := range r.Groups {
		out = append(out, g.Entries...)
	}
	return out
}

// everyFigure is each group's totals, each top entry's and each child's, in that order.
func (r ranked[F]) everyFigure() []F {
	var out []F
	for _, g := range r.Groups {
		out = append(out, g.Totals)
		for _, e := range g.Entries {
			out = append(out, e.Figures)
			for _, child := range e.Children {
				out = append(out, child.Figures)
			}
		}
	}
	return out
}

func revenueRankedOf(t *testing.T, who person, query string) ranked[revenueFigures] {
	t.Helper()
	page := who.expect(t, get(reportPath("/reports/revenue/ranked", "size=50", query)), http.StatusOK)
	return decode[ranked[revenueFigures]](t, page)
}

func funnelRankedOf(t *testing.T, who person, query string) ranked[funnelFigures] {
	t.Helper()
	page := who.expect(t, get(reportPath("/reports/funnel/ranked", "size=50", query)), http.StatusOK)
	return decode[ranked[funnelFigures]](t, page)
}

type wholeFigures interface{ whole() figures }

// listing is a ranked answer in whole units: the count over every page, the top entries' IDs and figures, the groups'.
type listing struct {
	total       int
	ids         []string
	tops, sums  []figures
	groupOfTops []int
}

func listingOf[F wholeFigures](r ranked[F]) listing {
	l := listing{total: r.Total}
	for i, g := range r.Groups {
		l.sums = append(l.sums, g.Totals.whole())
		for _, e := range g.Entries {
			l.ids, l.tops, l.groupOfTops = append(l.ids, e.ID), append(l.tops, e.Figures.whole()), append(l.groupOfTops, i)
		}
	}
	return l
}

// reportUnderTest reads one of 049's reports, Funnel stages once per stage, both as shapes and as listings.
type reportUnderTest struct {
	name    string
	shapeOf func(t *testing.T, who person, query string) shape
	listOf  func(t *testing.T, who person, query string) listing
}

func reportsUnderTest() []reportUnderTest {
	funnel := func(stage string) reportUnderTest {
		return reportUnderTest{name: "Funnel stages " + stage,
			shapeOf: func(t *testing.T, who person, query string) shape {
				t.Helper()
				return funnelOf(t, who, joined("stage="+stage, query)).shape()
			},
			listOf: func(t *testing.T, who person, query string) listing {
				t.Helper()
				return listingOf(funnelRankedOf(t, who, joined("stage="+stage, query)))
			}}
	}
	revenue := reportUnderTest{name: "Revenue",
		shapeOf: func(t *testing.T, who person, query string) shape {
			t.Helper()
			return revenueOf(t, who, query).shape()
		},
		listOf: func(t *testing.T, who person, query string) listing {
			t.Helper()
			return listingOf(revenueRankedOf(t, who, query))
		}}
	return []reportUnderTest{revenue, funnel("inq"), funnel("mql")}
}

func add(all ...figures) figures {
	var goal, actual, projected int64
	for _, f := range all {
		goal, actual, projected = goal+orZero(f.goal), actual+orZero(f.actual), projected+orZero(f.projected)
	}
	return figures{&goal, &actual, &projected}
}

func (f figures) String() string {
	return "goal " + shown(f.goal) + ", actual " + shown(f.actual) + ", actual or projected " + shown(f.projected)
}
