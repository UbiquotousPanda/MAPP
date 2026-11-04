package apibench_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apibench"
)

// BenchmarkPurchaseRequestsReport measures feature 042's performance target: statements that stay fixed whatever the number of requests.
func BenchmarkPurchaseRequestsReport(b *testing.B) {
	for _, data := range []apibench.Data{apibench.Demo, apibench.Volume} {
		b.Run(string(data), func(b *testing.B) {
			server := apibench.New(b, data)
			clients := signIn(b, server)
			for _, p := range purchaseRequestPages() {
				b.Run(p.name, func(b *testing.B) { clients[p.who].Measure(b, http.MethodGet, p.path, nil) })
			}
		})
	}
}

func purchaseRequestPages() []page {
	const report = "/api/v1/reports/purchase-requests?year=2027"
	return []page{
		{"report", alex, report},
		{"report one market", priya, report},
		{"grid searched and sorted", alex, report + "&q=agency&sort=amount&order=desc&pageSize=100"},
		{"grid filtered", alex, report + "&status=approved&vendor=none"},
		{"export grid", alex, "/api/v1/reports/purchase-requests/export?year=2027&widget=grid&format=csv"},
	}
}
