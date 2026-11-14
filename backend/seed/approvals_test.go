package seed_test

import (
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"mapp/internal/approval"
	"mapp/internal/platform/date"
)

func TestSeed_ApprovalRules_FR037(t *testing.T) {
	t.Parallel()
	d := loadDemo(t)
	managers := map[string]string{}
	for _, p := range d.people {
		managers[p.Name] = p.ManagerID
	}
	if managers["Priya Raman"] != "U-1003" || managers["Sara Novak"] != "U-1003" || managers["Mei Lin"] != "U-1005" ||
		managers["Daniel Okoro"] != "U-1001" || managers["Carlos Mendes"] != "U-1001" || managers["Alex Morgan"] != "" {
		t.Errorf("line managers = %v", managers)
	}

	var got []string
	for _, w := range d.workflows {
		line := fmt.Sprintf("%s %d/%d", w.ID, *w.ReminderDays, *w.EscalationDays)
		for _, l := range w.Levels {
			line += fmt.Sprintf(" | %s %s %s backup %s", l.ApproverType, l.Mode, strings.Join(l.ApproverIDs, ","), l.BackupApproverID)
			if l.AppliesWhen != nil {
				line += " only when"
			}
			if l.AutoApproveWhen != nil {
				line += " automatic when"
			}
		}
		got = append(got, line)
	}
	want := []string{
		"WF-1001 1/2 | people any U-1003 backup U-1001",
		"WF-1002 3/5 | people any U-1005 backup U-1001 | people any U-1001 backup U-1005",
		"WF-1003 3/5 | manager any  backup U-1001 automatic when | people any U-1001 backup U-1005 only when | people all U-1003,U-1001 backup U-1005 only when",
		"WF-1004 3/5 | recordField any  backup U-1001", "WF-1005 3/5 | recordField any  backup U-1001", // 032 FR-051
	}
	if !slices.Equal(got, want) {
		t.Errorf("workflows =\n%s\nwant\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
	standard := d.workflows[2]
	if standard.Name != "Standard marketing approval" || standard.Levels[0].AutoApproveWhen.PlannedCostBelow.String() != "10000.00" ||
		standard.Levels[1].AppliesWhen.PlannedCostAtLeast.String() != "100000.00" || d.label(standard.Levels[2].AppliesWhen.BusinessUnitIDs[0]) != "Mobility" {
		t.Errorf("WF-1003 = %+v", standard)
	}

	for _, r := range d.rounds {
		if r.Facts == nil || r.ReminderDays == nil || r.Levels[0].StartedAt == nil || r.Levels[0].Resolution != approval.ResolutionDecide ||
			r.Levels[0].Backup == nil {
			t.Errorf("round %s = %+v, want facts, timings, a start and a backup", r.ID, r)
		}
	}
	trade := d.rounds[3]
	if !trade.Levels[0].StartedAt.Equal(loadedAt.Add(-2*24*time.Hour)) || trade.Facts.PlannedCost == nil ||
		len(trade.Facts.BusinessUnits) != 1 || trade.Facts.BusinessUnits[0].Label != "Lubricants" {
		t.Errorf("Trade magazine ads round 2 = %+v", trade)
	}
	fleet := d.rounds[7]
	if !fleet.Levels[1].StartedAt.Equal(loadedAt.Add(-2*time.Hour)) || fleet.Levels[1].Backup.Name != "Carlos Mendes" {
		t.Errorf("Fleet card launch level 2 = %+v", fleet.Levels[1])
	}

	if len(d.delegations) != 1 {
		t.Fatalf("delegations = %+v, want DLG-1001", d.delegations)
	}
	dl := d.delegations[0]
	today := date.Today(loadedAt)
	if dl.ID != "DLG-1001" || dl.PersonID != "U-1003" || dl.DelegateID != "U-1005" || dl.StartDate != today.AddDays(7) ||
		dl.EndDate != today.AddDays(11) || dl.Note != "Annual leave" || dl.CancelledAt != nil || dl.CreatedBy.Name != "Daniel Okoro" {
		t.Errorf("DLG-1001 = %+v", dl)
	}
}
