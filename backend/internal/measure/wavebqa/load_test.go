package wavebqa_test

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

type importList struct {
	Items []load `json:"items"`
}

// TestWaveB_LoadReconciles_046_SC001: five outcomes add to rows read; a re-load changes nothing; undo restores.
func TestWaveB_LoadReconciles_046_SC001(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	facts := loadFacts(t, alexSees)
	helix := facts.ids[helixFirstHalf]
	row := func(ref, activity, inq string) string {
		return fmt.Sprintf("%s,2026-03-02,%s,,%s,,,", ref, activity, inq)
	}
	mixed := csvOf(row("m1", helix, "10"), row("m2", facts.ids[fleetExpo], "5"), row("m3", "", "7"),
		row("m4", helix, "oops"), row("m5", "A-9999", "3"))
	helixINQ := func(want int64, after string) {
		t.Helper()
		if got := panelOf(t, alexSees, helix).inq(); got != want {
			t.Errorf("after %s Helix's INQ actual = %d, want %d (FR-013, SC-004)", after, got, want)
		}
	}

	first := upload(t, alexSees, facts.source, mixed)
	reconciled(t, alexSees, first, counts{Read: 5, Matched: 1, Held: 1, Unattributed: 1, Rejected: 1, Unmatched: 1})
	helixINQ(710, "the mixed load")
	again := upload(t, alexSees, facts.source, mixed)
	helixINQ(710, "the identical file again")
	repeated := upload(t, alexSees, facts.source, csvOf(row("m1", helix, "60")))
	helixINQ(760, "m1 again with 60")
	for _, undo := range []struct {
		load load
		inq  int64
	}{{repeated, 710}, {again, 710}, {first, 700}} {
		alexSees.expect(t, post("/performance/imports/"+undo.load.ID+"/undo", nil), http.StatusOK)
		helixINQ(undo.inq, "undoing "+undo.load.ID)
	}
	undone := decode[importList](t, alexSees.expect(t, get("/performance/imports?status=undone"), http.StatusOK))
	if len(undone.Items) != 3 {
		t.Errorf("imports listed as undone = %d, want the three undone loads still listed (FR-017)", len(undone.Items))
	}
}

func reconciled(t *testing.T, alexSees person, run load, want counts) {
	t.Helper()
	if run.Status != "completed" || run.Counts != want || run.Counts.outcomes() != run.Counts.Read {
		t.Errorf("load = %s %+v, want completed with %+v adding up to rows read", run.Status, run.Counts, want)
	}
	if len(run.Breakdown) != 1 || run.Breakdown[0].Stage != "inq" || run.Breakdown[0].Counts != want {
		t.Errorf("breakdown = %+v, want the five counts again under INQ (FR-022, 046-C18)", run.Breakdown)
	}
	if stored := decode[load](t, alexSees.expect(t, get("/performance/imports/"+run.ID), http.StatusOK)); stored.Counts != want {
		t.Errorf("the stored summary = %+v, want %+v", stored.Counts, want)
	}
}

type factList struct {
	Items []struct {
		Held bool `json:"held"`
	} `json:"items"`
}

// TestWaveB_HeldFactsCountNowhere_046_SC002: the activity half; the report half waits for 049's Funnel stages.
func TestWaveB_HeldFactsCountNowhere_046_SC002(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	facts := loadFacts(t, alexSees)
	more := upload(t, alexSees, facts.source, csvOf(
		fmt.Sprintf("d1,2026-03-01,%s,,20,,,", facts.ids[workshopRoadshow]),
		fmt.Sprintf("d2,2026-03-01,%s,,30,,,", facts.ids[dealerSummit])))

	if facts.first.Counts.Held != 1 || more.Counts.Held != 2 {
		t.Errorf("held = %d and %d, want Fleet expo (Submitted), Workshop (Declined), Dealer summit (Created) held",
			facts.first.Counts.Held, more.Counts.Held)
	}
	gated(t, alexSees, facts.ids, fleetExpo, workshopRoadshow, dealerSummit)
	if got := panelOf(t, alexSees, facts.ids[helixFirstHalf]).inq(); got != 700 {
		t.Errorf("Helix's INQ actual = %d, want 700: only its own released facts", got)
	}
	approveOpenRound(t, signIn(t, server, daniel), facts.ids[fleetExpo])
	if released := panelOf(t, alexSees, facts.ids[fleetExpo]); released.State != "ok" || released.inq() != 100 {
		t.Errorf("Fleet expo after Daniel approves = %+v, want ok and its 100 INQ released (FR-020)", released)
	}
}

func gated(t *testing.T, alexSees person, ids map[string]string, names ...string) {
	t.Helper()
	for _, name := range names {
		if p := panelOf(t, alexSees, ids[name]); p.State != "notApproved" || len(p.Stages) != 0 || p.Revenue.Actual != nil {
			t.Errorf("%s's panel = %+v, want notApproved and no figure at all (FR-027)", name, p)
		}
		listed := decode[factList](t, alexSees.expect(t, get("/activities/"+ids[name]+"/performance/facts"), http.StatusOK))
		if len(listed.Items) == 0 || !listed.Items[0].Held {
			t.Errorf("%s's facts = %+v, want its fact listed and held", name, listed.Items)
		}
	}
}

type approvalState struct {
	Rounds []struct {
		ID           string `json:"id"`
		Outcome      string `json:"outcome"`
		CurrentLevel int    `json:"currentLevel"`
	} `json:"rounds"`
}

func approveOpenRound(t *testing.T, danielSees person, activityID string) {
	t.Helper()
	state := decode[approvalState](t, danielSees.expect(t, get("/activities/"+activityID+"/approval"), http.StatusOK))
	for _, round := range state.Rounds {
		if round.Outcome == "open" {
			danielSees.expect(t, post("/activities/"+activityID+"/approval/approve",
				map[string]any{"roundId": round.ID, "level": round.CurrentLevel}), http.StatusOK)
			return
		}
	}
	t.Fatalf("%s has no open approval round for Daniel to approve: %+v", activityID, state)
}

// TestWaveB_PersonalDataRefused_046_FR012: the whole file refused, its columns named, nothing stored (SC-007).
func TestWaveB_PersonalDataRefused_046_FR012(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	facts := loadFacts(t, alexSees)
	tellus := facts.ids[tellusCaseStudies]
	file := "Ref,Date,Activity,INQ,E-mail,Phone\n" + fmt.Sprintf("p1,2026-03-02,%s,9,ann@example.com,0612345678\n", tellus)
	body := map[string]string{"fileName": "with-people.csv", "content": encoded(file)}

	refused := alexSees.send(t, post("/performance/sources/"+facts.source+"/uploads", body))
	reason := decode[errorBody](t, refused)
	if refused.Status != http.StatusConflict || reason.Error.Code != "not_allowed" ||
		!strings.Contains(reason.Error.Message, "E-mail") || !strings.Contains(reason.Error.Message, "Phone") {
		t.Errorf("a file with personal data = %d %s, want 409 not_allowed naming E-mail and Phone", refused.Status, refused.Body)
	}
	loads := decode[importList](t, alexSees.expect(t, get("/performance/imports?sourceId="+facts.source), http.StatusOK))
	if len(loads.Items) != 1 || loads.Items[0].ID != facts.first.ID {
		t.Errorf("imports = %+v, want only the first load: a refused file is no load (046-C17)", loads.Items)
	}
	rows := decode[struct{ Items []any }](t, alexSees.expect(t, get("/performance/review-rows?sourceId="+facts.source), http.StatusOK))
	if got := panelOf(t, alexSees, tellus).inq(); got != 150 || len(rows.Items) != 0 {
		t.Errorf("Tellus case studies' INQ = %d, rows to review %d; want 150 and none: nothing of the file stored", got, len(rows.Items))
	}
}
