package summary

import (
	"net/url"
	"regexp"

	"mapp/internal/platform/errs"
)

const (
	TableRevenue     = "revenue"
	TablePerformance = "performance"
	TableCost        = "cost"
	TableROI         = "roi"
	Uncategorised    = "uncategorised"

	paramCategory = "category"
	paramStage    = "stage"
	paramSegment  = "segment"
	paramTable    = "table"

	msgChooseListed = "Choose one of the listed values."
	msgIdentifier   = "Use an ID of letters, digits and hyphens, at most 40 characters."
	msgCategory     = "Choose a category from the list, or Uncategorised."
)

type Query struct {
	Category string
	Stage    Stage
	Segments map[string]string
}

type League struct {
	Table    string
	Segment  string
	Category string
}

func Params() []string {
	params := []string{paramCategory, paramStage}
	for _, table := range tables() {
		params = append(params, segmentParam(table))
	}
	return params
}

func tables() []string {
	return []string{TableRevenue, TablePerformance, TableCost, TableROI}
}

func segmentParam(table string) string {
	return table + "By"
}

func identifier() *regexp.Regexp {
	return regexp.MustCompile(`^[A-Za-z0-9-]{1,40}$`)
}

func ParseQuery(own url.Values) (Query, error) {
	var problems errs.Problems
	q := Query{Category: categoryOf(own, &problems), Stage: stageOf(own, &problems)}
	for _, table := range tables() {
		param := segmentParam(table)
		segment := identifierOf(own, param, &problems)
		if segment == "" {
			continue
		}
		if q.Segments == nil {
			q.Segments = map[string]string{}
		}
		q.Segments[table] = segment
	}
	return q, problems.Err()
}

func ParseLeague(table string, own url.Values) (League, error) {
	var problems errs.Problems
	switch table {
	case TableRevenue, TablePerformance, TableCost, TableROI:
	default:
		problems.Add(paramTable, msgChooseListed)
	}
	l := League{Table: table, Segment: identifierOf(own, paramSegment, &problems), Category: categoryOf(own, &problems)}
	if err := problems.Err(); err != nil {
		return League{}, err
	}
	return l, nil
}

func categoryOf(own url.Values, problems *errs.Problems) string {
	raw := own.Get(paramCategory)
	if raw == "" || raw == Uncategorised || categoryID().MatchString(raw) {
		return raw
	}
	problems.Add(paramCategory, msgCategory)
	return ""
}

func categoryID() *regexp.Regexp {
	return regexp.MustCompile(`^CAT-[0-9]+$`)
}

func stageOf(own url.Values, problems *errs.Problems) Stage {
	raw := Stage(own.Get(paramStage))
	if raw == "" || raw == StageMQL {
		return raw
	}
	problems.Add(paramStage, msgChooseListed)
	return ""
}

func identifierOf(own url.Values, param string, problems *errs.Problems) string {
	raw := own.Get(param)
	if raw == "" || identifier().MatchString(raw) {
		return raw
	}
	problems.Add(param, msgIdentifier)
	return ""
}
