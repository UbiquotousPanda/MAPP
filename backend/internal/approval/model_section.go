package approval

import (
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

type ActionAvailability struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason"`
}

type Viewer struct {
	IsOwner            bool         `json:"isOwner"`
	IsCurrentApprover  bool         `json:"isCurrentApprover"`
	OnBehalfOf         []PersonView `json:"onBehalfOf"`
	CanDecide          bool         `json:"canDecide"`
	Capacity           *Capacity    `json:"capacity"`
	AsDelegateOf       []PersonView `json:"asDelegateOf"`
	CannotDecideReason string       `json:"cannotDecideReason"`
	IsSubmitter        bool         `json:"isSubmitter"`
}

type ActionSet struct {
	Submit        ActionAvailability `json:"submit"`
	Resubmit      ActionAvailability `json:"resubmit"`
	Approve       ActionAvailability `json:"approve"`
	Decline       ActionAvailability `json:"decline"`
	Recall        ActionAvailability `json:"recall"`
	SendLineItems ActionAvailability `json:"sendLineItems,omitzero"`
}

type SubjectView struct {
	Kind          SubjectKind `json:"kind"`
	Label         string      `json:"label"`
	ID            string      `json:"id"`
	Name          string      `json:"name"`
	Status        string      `json:"status"`
	DisplayStatus string      `json:"displayStatus"`
	Version       int         `json:"version,omitempty"`
}

// Section is a record's approval section, whatever its record type (contract ApprovalSection).
type Section struct {
	Subject        SubjectView  `json:"subject"`
	OwnerID        string       `json:"ownerId"`
	Owner          *PersonView  `json:"owner"`
	Workflow       *WorkflowRef `json:"workflow"`
	UpcomingLevels []LevelView  `json:"upcomingLevels"`
	Rounds         []RoundView  `json:"rounds"`
	LatestDecline  *DeclineNote `json:"latestDecline"`
	Viewer         Viewer       `json:"viewer"`
	Actions        ActionSet    `json:"actions"`

	OverPlannedCost []Overage       `json:"-"`
	LineItems       []RoundLineItem `json:"-"`
}

type ActivityApproval struct {
	ActivityID      string          `json:"activityId"`
	ActivityName    string          `json:"activityName"`
	ActivityVersion int             `json:"activityVersion"`
	Status          string          `json:"status"`
	DisplayStatus   string          `json:"displayStatus"`
	OwnerID         string          `json:"ownerId"`
	Owner           *PersonView     `json:"owner"`
	Workflow        *WorkflowRef    `json:"workflow"`
	UpcomingLevels  []LevelView     `json:"upcomingLevels"`
	Rounds          []RoundView     `json:"rounds"`
	LatestDecline   *DeclineNote    `json:"latestDecline"`
	Viewer          Viewer          `json:"viewer"`
	Actions         ActionSet       `json:"actions"`
	OverPlannedCost []Overage       `json:"overPlannedCost"`
	LineItems       []RoundLineItem `json:"lineItems"`
}

// Overage is an activity whose line items exceed its planned cost (contract ActivityOverage).
type Overage struct {
	Activity errs.RecordRef `json:"activity"`
	OverBy   money.Money    `json:"overBy"`
}

func activityApproval(sec Section) ActivityApproval {
	return ActivityApproval{
		ActivityID: sec.Subject.ID, ActivityName: sec.Subject.Name, ActivityVersion: sec.Subject.Version,
		Status: sec.Subject.Status, DisplayStatus: sec.Subject.DisplayStatus, OwnerID: sec.OwnerID, Owner: sec.Owner,
		Workflow: sec.Workflow, UpcomingLevels: sec.UpcomingLevels, Rounds: sec.Rounds, LatestDecline: sec.LatestDecline,
		Viewer: sec.Viewer, Actions: sec.Actions, OverPlannedCost: append([]Overage{}, sec.OverPlannedCost...),
		LineItems: append([]RoundLineItem{}, sec.LineItems...),
	}
}

type SubmitProblem struct {
	Field      string `json:"field"`
	Group      string `json:"group"`
	LineItemID string `json:"lineItemId"`
	Message    string `json:"message"`
}

type Submission struct {
	ActivityID            string            `json:"activityId"`
	ActivityName          string            `json:"activityName"`
	ActivityVersion       int               `json:"activityVersion"`
	Kind                  string            `json:"kind"`
	Available             bool              `json:"available"`
	Reason                string            `json:"reason"`
	RoundNumber           int               `json:"roundNumber"`
	Ready                 bool              `json:"ready"`
	Problems              []SubmitProblem   `json:"problems"`
	Workflow              *WorkflowRef      `json:"workflow"`
	Levels                []LevelView       `json:"levels"`
	UnassignedPlannedCost *money.Money      `json:"unassignedPlannedCost"`
	Outcomes              []SubmissionLevel `json:"outcomes"`
	ApprovedAutomatically bool              `json:"approvedAutomatically"`
	Replaces              *ReplacedRound    `json:"replaces"`
	LineItems             []errs.RecordRef  `json:"lineItems"`
}

// ReplacedRound is the open round a re-submission would end.
type ReplacedRound struct {
	RoundNumber int    `json:"roundNumber"`
	Level       int    `json:"level"`
	LevelLabel  string `json:"levelLabel"`
}

type SubmissionLevel struct {
	Number     int            `json:"number"`
	Label      string         `json:"label"`
	Outcome    string         `json:"outcome"`
	Approvers  []PersonView   `json:"approvers"`
	Source     string         `json:"source"`
	Mode       string         `json:"mode"`
	RuleText   string         `json:"ruleText"`
	Excluded   []ExcludedView `json:"excluded"`
	BackupUsed bool           `json:"backupUsed"`
	NoApprover bool           `json:"noApprover"`
	Advice     string         `json:"advice"`
}

type SubmitInput struct {
	Version *int   `json:"version"`
	Comment string `json:"comment"`
}

// DecisionInput's ApprovedLineItemIDs is nil when the request leaves them out: every line item is approved.
type DecisionInput struct {
	RoundID             string   `json:"roundId"`
	Level               *int     `json:"level"`
	Comment             string   `json:"comment"`
	ApprovedLineItemIDs []string `json:"approvedLineItemIds"`
}

// RoundLineItem is a line item the open round decides; HeldBack when an earlier decision left it unticked.
type RoundLineItem struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	PlannedCost money.Money `json:"plannedCost"`
	HeldBack    bool        `json:"heldBack"`
}

// SubjectDecision is an approval (Action ActionApproved) or a decline (ActionDeclined) of a record's open round.
type SubjectDecision struct {
	Action ActionKind
	DecisionInput
}

type RecallInput struct {
	RoundID string `json:"roundId"`
	Reason  string `json:"reason"`
}
