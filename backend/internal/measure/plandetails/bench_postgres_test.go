package plandetails_test

import (
	"net/http"
	"os"
	"testing"

	"mapp/internal/platform/apibench"
)

type benchPage struct {
	name, who, path string
}

// BenchmarkPlanDetailsOnPostgres_SC001 sends each level's requests to the API on PostgreSQL, holding the demo data and
// then 028's volume, and reports the time and the statements of each, as apibench's benchmarks do.
func BenchmarkPlanDetailsOnPostgres_SC001(b *testing.B) {
	for _, data := range []apibench.Data{apibench.Demo, apibench.Volume} {
		b.Run(string(data), func(b *testing.B) {
			server := onPostgres(b, data)
			clients := map[string]*apibench.Client{alex: server.SignIn(b, alex), priya: server.SignIn(b, priya)}
			for _, p := range planDetailsPages() {
				b.Run(p.name, func(b *testing.B) { clients[p.who].Measure(b, http.MethodGet, p.path, nil) })
			}
		})
	}
}

func planDetailsPages() []benchPage {
	return []benchPage{
		{"frame", alex, "/api/v1/reports/frame?report=planData&year=2026"},
		{"activity", alex, report + "&show=activity"},
		{"campaign", alex, report + "&show=campaign"},
		{"plan", alex, report + "&show=plan"},
		{"activity one market", priya, report + "&show=activity"},
		{"activity filtered", alex, report + "&show=activity&planType=operational&activityStatus=approved"},
		{"export xlsx", alex, exported + "&show=activity&format=xlsx"},
	}
}

func onPostgres(b *testing.B, data apibench.Data) *apibench.Server {
	b.Helper()
	if testing.Short() || os.Getenv("TEST_DATABASE_URL") == "" {
		b.Skip("needs PostgreSQL at TEST_DATABASE_URL, and no -short")
	}
	return apibench.New(b, data)
}
