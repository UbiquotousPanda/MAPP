package home

import (
	"slices"
	"testing"
	"time"

	"mapp/internal/platform/errs"
)

// teamFixture: Priya shares Lubricants Europe with Daniel and Sara; Mei is in another team. Daniel owns one
// activity Priya may see and one she may not (A-2003), and waits on one of each.
func teamFixture(t *testing.T) *fakeSources {
	t.Helper()
	f := newFakeSources()
	f.plans = []Plan{newPlan(lubricantsRef.ID, lubricantsRef.Name, 2026, lubricantsEurope)}
	declined := activityIn("A-2003", "Hidden declined", now)
	declined.Status, declined.DisplayStatus = "declined", "declined"
	f.activities[priya.ID] = []Activity{activityIn("A-2001", "Priya's own", now)}
	f.activities[daniel.ID] = []Activity{activityIn("A-2002", "Daniel's visible", now), declined}
	f.activities[mei.ID] = []Activity{activityIn("A-2004", "Mei's, not the team's", now)}
	f.waiting[daniel.ID] = []Waiting{
		{ActivityID: "A-3001", ActivityName: "Visible wait", Plan: lubricantsRef, Level: 1, Levels: 1, WaitingSince: now},
		{ActivityID: "A-3002", ActivityName: "Hidden wait", Plan: lubricantsRef, Level: 1, Levels: 1, WaitingSince: now},
	}
	f.waiting[sara.ID] = []Waiting{ // the same activity waits on Sara too, since earlier: shown once
		{ActivityID: "A-3001", ActivityName: "Visible wait", Plan: lubricantsRef, Level: 1, Levels: 1, WaitingSince: now.Add(-time.Hour)},
	}
	f.hidden["A-2003"], f.hidden["A-3002"] = true, true
	return f
}

func rowIDs(view MyActivitiesView) []string {
	ids := []string{}
	for _, g := range view.Groups {
		for _, row := range g.Items {
			ids = append(ids, row.ID)
		}
	}
	slices.Sort(ids)
	return ids
}

// My team shows every team member's activities, but never one the person signed in may not see.
func TestMyTeamActivitiesKeepToTheViewersScope(t *testing.T) {
	s := newService(t, teamFixture(t))

	team, err := s.MyActivities(t.Context(), priya, "team")
	if err != nil {
		t.Fatal(err)
	}
	if got, want := rowIDs(team), []string{"A-2001", "A-2002"}; !slices.Equal(got, want) || team.Total != 2 {
		t.Errorf("team activities = %q (total %d), want %q: Daniel's hidden one and Mei's are left out", got, team.Total, want)
	}
	me, err := s.MyActivities(t.Context(), priya, "me")
	if err != nil {
		t.Fatal(err)
	}
	if got := rowIDs(me); !slices.Equal(got, []string{"A-2001"}) {
		t.Errorf("my activities = %q, want only Priya's", got)
	}
}

func TestMyTeamWaitingKeepsToTheViewersScopeAndShowsEachOnce(t *testing.T) {
	s := newService(t, teamFixture(t))

	page, err := s.Waiting(t.Context(), priya, "team")

	if err != nil || page.Total != 1 || len(page.Items) != 1 || page.Items[0].ID != "A-3001" {
		t.Fatalf("Waiting = %+v, %v; want only A-3001", page, err)
	}
	if want := now.Add(-time.Hour); !page.Items[0].WaitingSince.Equal(want) {
		t.Errorf("waiting since = %v, want the earliest wait %v", page.Items[0].WaitingSince, want)
	}
}

func TestMyTeamAttentionAndSummaryKeepToTheViewersScope(t *testing.T) {
	s := newService(t, teamFixture(t))

	page, err := s.Attention(t.Context(), priya, "team")
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range page.Items {
		if item.ID == "A-2003" {
			t.Errorf("attention shows A-2003, which Priya may not see")
		}
	}
	view, err := s.Summary(t.Context(), priya, "myTeams", "team")
	if err != nil {
		t.Fatal(err)
	}
	if view.ActivitiesOwned.Count != 2 || view.ActivitiesOwned.Declined != 0 || view.WaitingForMe.Count != 1 {
		t.Errorf("summary = %+v / %+v; want 2 activities, none declined, 1 waiting", view.ActivitiesOwned, view.WaitingForMe)
	}
}

func TestMyTeamRecentChangesAreTheMembersOnes(t *testing.T) {
	f := teamFixture(t)
	s := newService(t, f)

	if _, err := s.RecentChanges(t.Context(), priya, "everything", "team"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.RecentChanges(t.Context(), priya, "everything", ""); err != nil {
		t.Fatal(err)
	}
	want := []string{priya.ID, daniel.ID, sara.ID}
	if len(f.actorsAsked) != 2 || !slices.Equal(f.actorsAsked[0], want) || f.actorsAsked[1] != nil {
		t.Errorf("actors asked = %q, want %q for My team and anyone for Me", f.actorsAsked, want)
	}
}

func TestForMustBeMeOrMyTeam(t *testing.T) {
	s := newService(t, newFakeSources())

	_, err := s.Waiting(t.Context(), priya, "everyone")

	assertError(t, err, errs.Validation(errs.FieldError{Field: "for", Message: "Choose Me or My team."}))
}
