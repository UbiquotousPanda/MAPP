package ranking

import (
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"mapp/internal/platform/errs"
)

const (
	paramSort   = "sort"
	paramOrder  = "order"
	paramGroup  = "group"
	paramSize   = "size"
	paramPage   = "page"
	paramSearch = "q"
	paramDrill  = "drill"
)

const (
	OrderDesc  = "desc"
	OrderAsc   = "asc"
	GroupNone  = "none"
	GroupPlan  = "plan"
	GroupOwner = "owner"
	groupAttr  = "attr:"
)

const (
	msgChooseListed = "Choose one of the listed values."
	msgSearchLong   = "Use 100 characters or fewer."
	maxSearch       = 100
	defaultSize     = 10
)

var (
	groupPattern = regexp.MustCompile(`^(none|plan|owner|attr:[A-Z]+-[0-9]+)$`)
	idPattern    = regexp.MustCompile(`^[A-Z]+-[0-9]+$`)
)

// Query is the ranked list's own part of the address (040 research R5).
type Query struct {
	Sort, Order, Group, Search, Drill string
	Size, Page                        int
}

// Parse reads the ranked list's parameters, sorted by one of the report's sorts; every problem is answered at once.
func Parse(values url.Values, sorts []string, defaultSort string) (Query, error) {
	var problems errs.Problems
	q := Query{Sort: orDefault(values.Get(paramSort), defaultSort), Order: orDefault(values.Get(paramOrder), OrderDesc),
		Group: orDefault(values.Get(paramGroup), GroupNone), Search: strings.TrimSpace(values.Get(paramSearch)),
		Drill: values.Get(paramDrill)}
	listed := map[string]bool{paramSort: slices.Contains(sorts, q.Sort),
		paramOrder: q.Order == OrderDesc || q.Order == OrderAsc, paramGroup: groupPattern.MatchString(q.Group),
		paramDrill: q.Drill == "" || idPattern.MatchString(q.Drill)}
	for _, name := range []string{paramSort, paramOrder, paramGroup, paramDrill} {
		if !listed[name] {
			problems.Add(name, msgChooseListed)
		}
	}
	if utf8.RuneCountInString(q.Search) > maxSearch {
		problems.Add(paramSearch, msgSearchLong)
	}
	q.Size, q.Page = defaultSize, 1
	if n, ok := number(values, paramSize, &problems, func(n int) bool { return slices.Contains([]int{10, 25, 50}, n) }); ok {
		q.Size = n
	}
	if n, ok := number(values, paramPage, &problems, func(n int) bool { return n >= 1 }); ok {
		q.Page = n
	}
	return q, problems.Err()
}

// Params are the ranked list's own address parameters that saved views keep and the export passes on; never the page.
func Params() []string {
	return []string{paramSort, paramOrder, paramGroup, paramSize, paramSearch, paramDrill}
}

func number(values url.Values, name string, problems *errs.Problems, allowed func(int) bool) (int, bool) {
	text := values.Get(name)
	if text == "" {
		return 0, false
	}
	n, err := strconv.Atoi(text)
	if err != nil || !allowed(n) {
		problems.Add(name, msgChooseListed)
		return 0, false
	}
	return n, true
}

func orDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
