package apibench_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apibench"
)

// BenchmarkRevenueReports measures feature 049's Revenue and Funnel stages: statements that stay fixed whatever the
// number of activities.
func BenchmarkRevenueReports(b *testing.B) {
	for _, data := range []apibench.Data{apibench.Demo, apibench.Volume} {
		b.Run(string(data), func(b *testing.B) {
			server := apibench.New(b, data)
			clients := signIn(b, server)
			for _, p := range revenuePages() {
				b.Run(p.name, func(b *testing.B) { clients[p.who].Measure(b, http.MethodGet, p.path, nil) })
			}
		})
	}
}

func revenuePages() []page {
	return []page{
		{"revenue", alex, "/api/v1/reports/revenue?year=2026"},
		{"revenue one market", priya, "/api/v1/reports/revenue?year=2026"},
		{"revenue by quarter, uncategorised", alex, "/api/v1/reports/revenue?year=2026&period=quarter&category=uncategorised"},
		{"revenue ranked", alex, "/api/v1/reports/revenue/ranked?year=2026&show=campaign"},
		{"funnel mql", alex, "/api/v1/reports/funnel?year=2026&stage=mql"},
		{"funnel ranked", alex, "/api/v1/reports/funnel/ranked?year=2026&show=activity&stage=inq"},
		{"export", alex, "/api/v1/reports/revenue/export?year=2026&format=xlsx"},
	}
}
