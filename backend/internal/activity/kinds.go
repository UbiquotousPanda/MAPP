package activity

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"mapp/internal/history"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

const kindName = "activity"

const parentKind = "initiative"

const (
	undoNameTakenFormat = "Can't undo — there is now another activity called '%s'. Restore it from the recycle bin instead."
	renamedFormat       = "Renamed to '%s' because the name was taken."
	statusResetNote     = "Status reset to Created because it was restored from the recycle bin."
)

var labels = map[string]string{
	"name": "Activity name", "externalName": "External name", "description": "Description",
	"activityTypeId": "Activity type", "ownerId": "Owner", "startDate": "Start date", "endDate": "End date",
	"ongoing": "Ongoing (no end date)", "setLaterStagesMyself": "Set later stages myself",
	"plannedCost": "Planned cost", "revenue": "Revenue", "approvalWorkflowId": "Approval workflow",
	"inq": "INQ", "mql": "MQL", "status": "Status", "initiativeId": "Initiative", "parent": "Initiative",
}

// Kinds is registered after the initiative kind; history bins an activity with its line items.
func (s *Service) Kinds() []history.Kind {
	return []history.Kind{{
		Name:           kindName,
		Singular:       "activity",
		Plural:         "activities",
		Parent:         parentKind,
		Snapshot:       s.snapshot,
		ChildIDs:       s.childIDs,
		Remove:         s.repo.Delete,
		Put:            s.putSnapshot,
		AllChildIDs:    s.allChildIDs,
		SnapshotsOf:    s.snapshotsOf,
		RemoveAll:      s.repo.DeleteMany,
		PutAll:         s.putSnapshots,
		Describe:       s.describe,
		PrepareRestore: s.prepareRestore,
	}}
}

func (s *Service) snapshot(ctx context.Context, id string) (history.Snapshot, bool, error) {
	activity, found, err := s.repo.Get(ctx, id)
	if err != nil || !found {
		return history.Snapshot{}, false, err
	}
	data, err := json.Marshal(activity)
	if err != nil {
		return history.Snapshot{}, false, err
	}
	return history.Snapshot{ID: activity.ID, Name: activity.Name, ParentID: activity.InitiativeID, Data: data}, true, nil
}

func (s *Service) childIDs(ctx context.Context, initiativeID string) ([]string, error) {
	list, err := s.repo.ListByInitiative(ctx, initiativeID)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(list))
	for _, a := range list {
		ids = append(ids, a.ID)
	}
	return ids, nil
}

func (s *Service) putSnapshot(ctx context.Context, snapshot history.Snapshot) error {
	var activity Activity
	if err := json.Unmarshal(snapshot.Data, &activity); err != nil {
		return err
	}
	return s.repo.Put(ctx, activity)
}

// prepareRestore refuses an Undo whose name is now taken, where a Restore renames it "<name> (restored)"; a
// Restore also returns the activity to Created and tells approvals, while an Undo keeps its status.
func (s *Service) prepareRestore(ctx context.Context, rc history.RestoreContext, snapshot *history.Snapshot) ([]string, error) {
	var activity Activity
	if err := json.Unmarshal(snapshot.Data, &activity); err != nil {
		return nil, err
	}
	if err := s.checkRestoreFits(ctx, activity); err != nil {
		return nil, err
	}
	siblings, err := s.repo.ListByInitiative(ctx, activity.InitiativeID)
	if err != nil {
		return nil, err
	}
	var notes []string
	changed := false
	if other, taken := namedLike(siblings, activity.Name, activity.ID); taken {
		if rc.Undo {
			return nil, errs.NameTaken(fmt.Sprintf(undoNameTakenFormat, other.Name))
		}
		activity.Name = restoredName(siblings, activity.Name, activity.ID)
		notes = append(notes, fmt.Sprintf(renamedFormat, activity.Name))
		changed = true
	}
	if !rc.Undo {
		if status, reset := history.StatusAfterRestore(rc, activity.Status, StatusCreated); reset {
			if err = activity.MoveTo(status); err != nil {
				return nil, err
			}
			notes = append(notes, statusResetNote)
			changed = true
		}
		hookNotes, err := s.hooks.ActivityRestored(ctx, rc, activity.ID)
		if err != nil {
			return nil, err
		}
		notes = append(notes, hookNotes...)
	}
	if !changed {
		return notes, nil
	}
	activity.Touch(rc.Actor, rc.Now) // a changed record gets a new version
	data, err := json.Marshal(activity)
	if err != nil {
		return nil, err
	}
	snapshot.Name, snapshot.Data = activity.Name, data
	return notes, nil
}

// describe gives a field's log label and a value's text; an empty text means "use the default".
func (s *Service) describe(ctx context.Context, field string, value any) (string, string, error) {
	label := labels[field]
	if label == "" {
		return s.settings.DescribeAttribute(ctx, field, value)
	}
	text, isText := value.(string)
	switch field {
	case "activityTypeId":
		if isText && text != "" {
			t, found, err := s.settings.ActivityType(ctx, text)
			if err != nil || !found {
				return label, "", err
			}
			return label, t.Name, nil
		}
	case "ownerId":
		ref, err := s.personRef(ctx, text)
		if err != nil || ref == nil {
			return label, "", err
		}
		return label, ref.Name, nil
	case "approvalWorkflowId":
		if isText && text != "" {
			w, found, err := s.workflows.GetWorkflow(ctx, text)
			if err != nil || !found {
				return label, "", err
			}
			return label, w.Name, nil
		}
	case "startDate", "endDate":
		if d, err := date.Parse(text); isText && err == nil {
			return label, date.Format(d), nil
		}
	case "plannedCost", "revenue":
		if m, ok := value.(map[string]any); ok {
			amount, err := money.ParseAmount(fmt.Sprint(m["amount"]))
			if err == nil {
				return label, money.Money{Amount: amount, Currency: fmt.Sprint(m["currency"])}.Format(), nil
			}
		}
	case "inq", "mql":
		if n, ok := value.(json.Number); ok {
			if whole, err := n.Int64(); err == nil {
				return label, groupedInt(whole), nil
			}
		}
	case "status":
		return label, statusWords[Status(text)], nil
	case "parent": // a move: the initiative, as {type, id, name}
		if ref, ok := value.(map[string]any); ok {
			id, _ := ref["id"].(string)
			name, _ := ref["name"].(string)
			path, err := s.initiativePath(ctx, id, name)
			return label, path, err
		}
	}
	return label, "", nil
}

// initiativePath is "Helix launch › Digital & social"; the name alone when the initiative or campaign is gone.
func (s *Service) initiativePath(ctx context.Context, id, name string) (string, error) {
	initiative, found, err := s.hierarchy.GetInitiative(ctx, id)
	if err != nil || !found {
		return name, err
	}
	campaign, found, err := s.hierarchy.GetCampaign(ctx, initiative.CampaignID)
	if err != nil || !found {
		return initiative.Name, err
	}
	return campaign.Name + " › " + initiative.Name, nil
}

// groupedInt writes a whole number with thousands separators: 250000 → "250,000".
func groupedInt(n int64) string {
	digits := strconv.FormatInt(n, 10)
	sign := ""
	if n < 0 {
		sign, digits = "-", digits[1:]
	}
	for i := len(digits) - 3; i > 0; i -= 3 {
		digits = digits[:i] + "," + digits[i:]
	}
	return sign + digits
}
