package apibench_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apibench"
)

// BenchmarkSummaryReport measures feature 048's plan benchmark: statements that stay fixed whatever the number of
// activities and segment values.
func BenchmarkSummaryReport(b *testing.B) {
	for _, data := range []apibench.Data{apibench.Demo, apibench.Volume} {
		b.Run(string(data), func(b *testing.B) {
			server := apibench.New(b, data)
			clients := signIn(b, server)
			for _, p := range summaryPages() {
				b.Run(p.name, func(b *testing.B) { clients[p.who].Measure(b, http.MethodGet, p.path, nil) })
			}
		})
	}
}

func summaryPages() []page {
	const report = "/api/v1/reports/summary?year=2026"
	const league = "/api/v1/reports/summary/league/"
	return []page{
		{"report", alex, report},
		{"report one market", priya, report},
		{"report by quarter, uncategorised", alex, report + "&period=quarter&category=uncategorised"},
		{"league revenue", alex, league + "revenue?year=2026"},
		{"league cost", alex, league + "cost?year=2026"},
		{"league roi", alex, league + "roi?year=2026"},
		{"export", alex, "/api/v1/reports/performance/export?year=2026&format=xlsx"},
	}
}
