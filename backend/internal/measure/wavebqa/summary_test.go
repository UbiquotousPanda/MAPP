package wavebqa_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	summaryPath  = "/reports/summary"
	leaguePath   = "/reports/summary/league/"
	noFinance    = "noFinancialAccess"
	noPerfData   = "noPerformanceData"
	summaryAhead = "projected"
)

func leagueTables() []string {
	return []string{"revenue", "performance", "cost", "roi"}
}

func everyone() []string {
	return []string{alex, carlos, priya, daniel, mei, sara, lea}
}

type summaryPeriod struct {
	Key, Label, State       string
	Actual, Projected, Goal *amount
}

type summaryStage struct {
	Stage             string          `json:"stage"`
	ActualOrProjected json.RawMessage `json:"actualOrProjected"`
	Goal              json.RawMessage `json:"goal"`
	Performance       *int64          `json:"performance"`
	Variance          string          `json:"variance"`
	PlansWithout      int             `json:"plansWithout"`
}

type summaryRate struct {
	Stage, Key, State string
	Rate, Goal        *string
	Variance          string
}

type coverage struct {
	Stage   string `json:"stage"`
	Percent *int64 `json:"percent"`
}

type summaryAnswer struct {
	Revenue struct {
		PeriodLabel       string          `json:"periodLabel"`
		ActualOrProjected *amount         `json:"actualOrProjected"`
		Goal              *amount         `json:"goal"`
		Performance       *int64          `json:"performance"`
		Variance          string          `json:"variance"`
		GoalCoverage      []coverage      `json:"goalCoverage"`
		Trend             []summaryPeriod `json:"trend"`
	} `json:"revenue"`
	Funnel struct {
		Stages      []summaryStage `json:"stages"`
		Conversions []summaryRate  `json:"conversions"`
		Trend       struct {
			Stage   string        `json:"stage"`
			Periods []summaryRate `json:"periods"`
		} `json:"trend"`
	} `json:"funnel"`
	Categories    []ref                   `json:"categories"`
	States        []string                `json:"states"`
	FinanceCovers struct{ Plans, Of int } `json:"financeCovers"`
}

func summaryOf(t *testing.T, who person, query string) summaryAnswer {
	t.Helper()
	return decode[summaryAnswer](t, who.expect(t, get(reportPath(summaryPath, query)), http.StatusOK))
}

// units is a served figure in whole units, cents for money; -1 marks one that is neither.
func units(raw json.RawMessage) *int64 {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || string(trimmed) == "null" {
		return nil
	}
	if trimmed[0] == '{' {
		var m amount
		if err := json.Unmarshal(trimmed, &m); err != nil {
			m.Amount = "x"
		}
		return cents(&m)
	}
	n, err := strconv.ParseInt(string(trimmed), 10, 64)
	if err != nil {
		n = -1
	}
	return &n
}

// exported is a served figure as the export writes it: the amount, the count or per cent, or "—".
func exported(raw json.RawMessage) string {
	if trimmed := bytes.TrimSpace(raw); len(trimmed) > 0 && trimmed[0] == '{' {
		var m amount
		if err := json.Unmarshal(trimmed, &m); err == nil {
			return m.Amount
		}
	}
	if v := units(raw); v != nil {
		return strconv.FormatInt(*v, 10)
	}
	return "—"
}

func varianceWord(v string) string {
	return map[string]string{"abovePlan": "Above plan", "onPlan": "On plan", "belowPlan": "Below plan", "noGoal": "No goal"}[v]
}

// shape is the revenue section with Revenue's word for a month ahead, so it compares with 049's shapes.
func (s summaryAnswer) shape() shape {
	r := s.Revenue
	out := shape{cards: figures{goal: cents(r.Goal), projected: cents(r.ActualOrProjected)}}
	for _, p := range r.Trend {
		state := p.State
		if state == summaryAhead {
			state = "planned"
		}
		out.periods = append(out.periods, point{p.Key, state, figures{cents(p.Goal), cents(p.Actual), cents(p.Projected)}})
	}
	return out
}

func (s summaryAnswer) stage(name string) summaryStage {
	i := slices.IndexFunc(s.Funnel.Stages, func(st summaryStage) bool { return st.Stage == name })
	if i < 0 {
		return summaryStage{Stage: name, ActualOrProjected: json.RawMessage("null"), Goal: json.RawMessage("null")}
	}
	return s.Funnel.Stages[i]
}

func (st summaryStage) figures() figures {
	return figures{goal: units(st.Goal), projected: units(st.ActualOrProjected)}
}

// headline is every figure the two sections show above the trends, in words, so two answers compare at once.
func (s summaryAnswer) headline() string {
	r := s.Revenue
	words := []string{"revenue", shown(cents(r.ActualOrProjected)), "of", shown(cents(r.Goal)), shown(r.Performance),
		r.Variance}
	for _, st := range s.Funnel.Stages {
		words = append(words, st.Stage, st.figures().String(), shown(st.Performance), st.Variance)
	}
	return strings.Join(words, " ")
}

type segment struct{ ID, Label, Level string }

type leagueEntry struct {
	Key   string          `json:"key"`
	Name  string          `json:"name"`
	Value json.RawMessage `json:"value"`
}

type leagueAnswer struct {
	Table    string                         `json:"table"`
	Segment  *segment                       `json:"segment"`
	Segments []segment                      `json:"segments"`
	Rows     []leagueEntry                  `json:"rows"`
	Total    json.RawMessage                `json:"total"`
	ROI      *struct{ Model, Basis string } `json:"roi"`
	Reason   *string                        `json:"reason"`
}

func leagueOf(t *testing.T, who person, table, query string) leagueAnswer {
	t.Helper()
	return decode[leagueAnswer](t, who.expect(t, get(reportPath(leaguePath+table, query)), http.StatusOK))
}

func (l leagueAnswer) values() string {
	words := []string{"total", shown(units(l.Total))}
	for _, r := range l.Rows {
		words = append(words, r.Name, shown(units(r.Value)))
	}
	return strings.Join(words, " ")
}

// valued is the total and the rows with a value, so a table compares whatever its "—" rows are.
func (l leagueAnswer) valued() string {
	words := []string{"total", shown(units(l.Total))}
	for _, r := range l.Rows {
		if v := units(r.Value); v != nil {
			words = append(words, r.Name, shown(v))
		}
	}
	return strings.Join(words, " ")
}

func plansQuery(frame reportFrame, names []string) string {
	params := make([]string, 0, len(names))
	for _, name := range names {
		params = append(params, "plan="+frame.planID(name))
	}
	return joined(params...)
}

// TestWaveB_ScopePerRole_Summary_048_FR003: each role's Summary is Alex's for that role's plans, and no other.
func TestWaveB_ScopePerRole_Summary_048_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	frame := frameOf(t, alexSees, "summary")
	for who, names := range reportPlans() {
		p, want := signIn(t, server, who), slices.Sorted(slices.Values(names))
		if got := frameOf(t, p, "summary").planNames(); !slices.Equal(got, want) {
			t.Errorf("%s's Summary frame offers %v, want %v", who, got, want)
		}
		got, ofPlans := summaryOf(t, p, ""), summaryOf(t, alexSees, plansQuery(frame, names))
		if got.headline() != ofPlans.headline() || got.FinanceCovers.Of != len(names) {
			t.Errorf("%s's Summary %q over %d plans, want Alex's for %v: %q", who, got.headline(),
				got.FinanceCovers.Of, names, ofPlans.headline())
		}
	}
	priyaSees, measureID := signIn(t, server, priya), frame.planID(measurePlan)
	if asked := frameOf(t, priyaSees, "summary", "plan="+measureID); len(asked.Filter.Plans) != 0 || asked.LeftOut != 1 {
		t.Errorf("Priya asking for %s: filter %v, left out %d; want it dropped and counted", measureID,
			asked.Filter.Plans, asked.LeftOut)
	}
	if got, own := summaryOf(t, priyaSees, "plan="+measureID), summaryOf(t, priyaSees, ""); got.headline() != own.headline() {
		t.Errorf("Priya's Summary with the Measure plan's ID %q, want her own %q", got.headline(), own.headline())
	}
}

// TestWaveB_CatalogueMatchesAccess_Summary_048_FR001: Summary is listed and available, and opens for all seven.
func TestWaveB_CatalogueMatchesAccess_Summary_048_FR001(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	want := catalogueEntry{"summary", "Summary", true}
	for _, who := range everyone() {
		p := signIn(t, server, who)
		listed := decode[struct{ Items []catalogueEntry }](t, p.expect(t, get("/reports"), http.StatusOK))
		if !slices.Contains(listed.Items, want) {
			t.Errorf("%s's catalogue = %+v, want %+v", who, listed.Items, want)
		}
		p.expect(t, get(reportPath(summaryPath)), http.StatusOK)
		for _, table := range leagueTables() {
			p.expect(t, get(reportPath(leaguePath+table)), http.StatusOK)
		}
	}
}

func costHidden(t *testing.T, who person, label string) {
	t.Helper()
	for _, table := range []string{"cost", "roi"} {
		l := leagueOf(t, who, table, "")
		if units(l.Total) != nil || slices.ContainsFunc(l.Rows, func(r leagueEntry) bool { return units(r.Value) != nil }) {
			t.Errorf("%s's %s league = %s, want every value and the total null (FR-003)", label, table, l.values())
		}
	}
}

func checkCovers(t *testing.T, label string, got summaryAnswer, plans int) {
	t.Helper()
	if got.FinanceCovers.Plans != plans || got.FinanceCovers.Of != 3 || slices.Contains(got.States, noFinance) == (plans == 3) {
		t.Errorf("%s's Summary: finance covers %+v, states %v; want %d of 3, %s unless all", label, got.FinanceCovers,
			got.States, plans, noFinance)
	}
}

// TestWaveB_NoFinancialAccess_Summary_048_FR003: Lea's cost and ROI are null over 0 of 3 plans; revenue still shows.
func TestWaveB_NoFinancialAccess_Summary_048_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees, leaSees := signIn(t, server, alex), signIn(t, server, lea)
	got, alexView := summaryOf(t, leaSees, ""), summaryOf(t, alexSees, "")
	checkCovers(t, "Lea", got, 0)
	checkCovers(t, "Alex", alexView, 3)
	if got.headline() != alexView.headline() {
		t.Errorf("Lea's Summary %q, want Alex's revenue, performance and volumes %q (US2-5)", got.headline(), alexView.headline())
	}
	costHidden(t, leaSees, "Lea")
	for _, table := range []string{"revenue", "performance"} {
		if l, a := leagueOf(t, leaSees, table, ""), leagueOf(t, alexSees, table, ""); l.values() != a.values() || units(l.Total) == nil {
			t.Errorf("Lea's %s league %s, want Alex's %s (US2-5)", table, l.values(), a.values())
		}
	}
}

// givePriyaAllMarkets adds a reader of every market without finance.view to Priya's Planner role.
func givePriyaAllMarkets(t *testing.T, alexSees person) {
	t.Helper()
	roles := decode[struct{ Items []ref }](t, alexSees.expect(t, get("/roles"), http.StatusOK)).Items
	i := slices.IndexFunc(roles, func(r ref) bool { return r.Name == "Planner" })
	if i < 0 {
		t.Fatalf("no Planner role among %+v", roles)
	}
	reader := decode[ref](t, alexSees.expect(t, post("/roles", map[string]any{"name": "All markets reader",
		"defaultScope": "all", "permissions": []string{"plans.view", "reports.view"}}), http.StatusCreated))
	alexSees.expect(t, put("/people/U-1002/roles", map[string]any{"version": 1, "roles": []map[string]any{
		{"roleId": roles[i].ID, "scope": map[string]any{"type": "myTeams"}},
		{"roleId": reader.ID, "scope": map[string]any{"type": "all"}}}}), http.StatusOK)
}

// TestWaveB_FinanceCoversSomePlans_048_FR003: finance in one plan of three: cost is that plan's, revenue all three's.
func TestWaveB_FinanceCoversSomePlans_048_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	givePriyaAllMarkets(t, alexSees)
	priyaSees, lubricants := signIn(t, server, priya), "plan="+frameOf(t, alexSees, "summary").planID(lubricantsPlan)
	got := summaryOf(t, priyaSees, "")
	checkCovers(t, "Priya, finance in one plan,", got, 1)
	if alexView := summaryOf(t, alexSees, ""); got.headline() != alexView.headline() {
		t.Errorf("Priya's Summary %q, want all three plans' %q", got.headline(), alexView.headline())
	}
	cost, ownCost := leagueOf(t, priyaSees, "cost", ""), leagueOf(t, alexSees, "cost", lubricants)
	if units(cost.Total) == nil || cost.valued() != ownCost.valued() {
		t.Errorf("Priya's cost league %s, want %s's alone: %s", cost.values(), lubricantsPlan, ownCost.values())
	}
	if revenue, all := leagueOf(t, priyaSees, "revenue", ""), leagueOf(t, alexSees, "revenue", ""); revenue.values() != all.values() {
		t.Errorf("Priya's revenue league %s, want every plan's %s", revenue.values(), all.values())
	}
}
