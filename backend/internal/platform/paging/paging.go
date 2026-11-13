// Package paging holds the one set of rows per page that every paged table offers, and the size it opens at.
package paging

import "slices"

const (
	Default = 50
	Message = "Choose 25, 50, 100 or 200 rows per page."
)

func Valid(n int) bool {
	return slices.Contains([]int{25, 50, 100, 200}, n)
}
