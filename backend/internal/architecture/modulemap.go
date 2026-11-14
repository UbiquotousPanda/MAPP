// Package architecture declares the API's module graph, its tiers and edges, and tests the code against it (ADR-0022).
package architecture

var kernel = []string{"platform"} //nolint:gochecknoglobals // the declared map: read by the tests only

// A module may use the kernel and any lower tier, never its own tier or a higher one.
var tiers = map[string]int{ //nolint:gochecknoglobals // the declared map: read by the tests only
	"access":          1,
	"activity":        3,
	"allwork":         2,
	"approval":        2,
	"auth":            2,
	"budget":          2,
	"bulk":            1,
	"campaign":        2,
	"customdashboard": 2,
	"dashboard":       4,
	"dataset":         2,
	"financials":      1,
	"history":         0,
	"home":            2,
	"lineitem":        2,
	"overspend":       1,
	"people":          1,
	"plan":            2,
	"purchaserequest": 3,
	"rollup":          1,
	"sample":          1,
	"settings":        1,
	"simulatedgsap":   4,
	"spa":             0,
	"swbs":            1,
	"widgetdata":      0,
	"workbook":        3,
}

var edges = map[string][]string{ //nolint:gochecknoglobals // the declared map: read by the tests only
	"access":          {"history"},
	"activity":        {"approval", "campaign", "history", "overspend", "people", "plan", "settings"},
	"allwork":         {"history", "rollup"},
	"approval":        {"history", "people"},
	"auth":            {"people"},
	"budget":          {"history", "overspend", "people", "settings"},
	"bulk":            {"history"},
	"campaign":        {"history", "overspend", "people", "rollup", "settings"},
	"customdashboard": {"history", "people"},
	"dashboard":       {"allwork", "approval", "budget", "financials", "people", "purchaserequest", "rollup"},
	"dataset":         {"history", "people", "settings", "widgetdata"},
	"financials":      {"history"},
	"home":            {"rollup"},
	"lineitem":        {"history", "people", "settings"},
	"overspend":       {"history"},
	"people":          {"history"},
	"plan":            {"history", "overspend", "people", "rollup", "settings"},
	"purchaserequest": {"approval", "history", "people", "settings"},
	"rollup":          {"history"},
	"sample":          {"history"},
	"settings":        {"history"},
	"simulatedgsap":   {"purchaserequest"},
	"swbs":            {"history"},
	"workbook":        {"allwork", "history"},
}

// A fake stands in for its module's SQL, so it may read the modules whose tables that SQL reads.
var fakeEdges = map[string][]string{ //nolint:gochecknoglobals // the declared map: read by the tests only
	"overspend":       {"activity", "budget", "campaign", "plan"},
	"purchaserequest": {"plan"},
	"workbook":        {"plan"},
}

var wiringOnly = []string{"app", "stores"} //nolint:gochecknoglobals // the declared map: read by the tests only

// These build the whole API for tests and benchmarks, so they know every module by design.
var testSupport = []string{"apitest", "apibench"} //nolint:gochecknoglobals // the declared map: read by the tests only

const fakeSuffix = "test"
