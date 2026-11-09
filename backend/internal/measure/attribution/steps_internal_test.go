package attribution

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/platform/date"
)

func on(activityID string, d int, kind string) JourneyTouch {
	return JourneyTouch{JourneyRef: "J-1", Touch: Touch{ActivityID: activityID, Date: date.New(2026, time.March, d)}, Kind: kind}
}

func TestSteps_OnePerActivityAndDay_058_R3(t *testing.T) {
	t.Parallel()
	touches := []JourneyTouch{on("A-1", 2, "mql"), on("A-1", 1, "mql"), on("A-1", 1, "inq"), on("A-2", 1, "sessions"), on("A-1", 1, "inq")}

	got := steps(touches)
	want := []Touch{
		{ActivityID: "A-1", Date: date.New(2026, time.March, 1)},
		{ActivityID: "A-2", Date: date.New(2026, time.March, 1)},
		{ActivityID: "A-1", Date: date.New(2026, time.March, 2)},
	}
	if diff := cmp.Diff(want, got, cmp.AllowUnexported(date.Date{})); diff != "" {
		t.Errorf("steps: one per activity and day, by date then activity (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff([]string{"inq", "mql"}, kindsOf(touches, want[0])); diff != "" {
		t.Errorf("kinds of A-1 on 1 March, once each in funnel order (-want +got):\n%s", diff)
	}
}
