package purchaserequest

import (
	"mapp/internal/settings"
)

// What a save does next (contract PurchaseRequestInput.then).
const (
	ThenSave          = "save"
	ThenResubmit      = "resubmit"
	ThenSubmitChanges = "submitChanges"
)

// Input is the body of POST and PUT /api/v1/purchase-requests (contract PurchaseRequestInput).
type Input struct {
	Version                *int                     `json:"version"`
	Name                   string                   `json:"name"`
	Description            string                   `json:"description"`
	OwnerID                string                   `json:"ownerId"`
	MoAApproverID          *string                  `json:"moaApproverId"`
	ApprovalWorkflowID     string                   `json:"approvalWorkflowId"`
	ModificationWorkflowID string                   `json:"modificationWorkflowId"`
	Attributes             settings.AttributeValues `json:"attributes"`
	Lines                  []LineInput              `json:"lines"`
	Then                   string                   `json:"then"`
	Comment                string                   `json:"comment"`
}

type LineInput struct {
	ID           string                   `json:"id"`
	LineItemID   string                   `json:"lineItemId"`
	Currency     string                   `json:"currency"`
	Amount       string                   `json:"amount"`
	DeliveryDate string                   `json:"deliveryDate"`
	OverallLimit *string                  `json:"overallLimit"`
	Description  string                   `json:"description"`
	Attributes   settings.AttributeValues `json:"attributes"`
}

type VersionInput struct {
	Version int `json:"version"`
}

type SubmitInput struct {
	Version int    `json:"version"`
	Comment string `json:"comment"`
}

type ConfigurationInput struct {
	Version                         int             `json:"version"`
	PurchaseSupport                 bool            `json:"purchaseSupport"`
	LinesOnApprovedPurchaseRequests LinesOnApproved `json:"linesOnApprovedPurchaseRequests"`
	// ReleaseInGSAPAfterApproval nil keeps the saved choice.
	ReleaseInGSAPAfterApproval *bool `json:"releaseInGsapAfterApproval"`
}

func (in Input) moaApprover() string {
	if in.MoAApproverID == nil {
		return ""
	}
	return *in.MoAApproverID
}

// inputOf is the save that would store pr as it is, so that the save checks can run on it again.
func inputOf(pr PurchaseRequest) Input {
	moa := pr.MoAApproverID
	in := Input{Name: pr.Name, Description: pr.Description, OwnerID: pr.OwnerID, MoAApproverID: &moa,
		ApprovalWorkflowID: pr.WorkflowID, ModificationWorkflowID: pr.ModificationWorkflowID, Attributes: pr.Attributes,
		Lines: make([]LineInput, 0, len(pr.Lines))}
	for _, l := range pr.Lines {
		line := LineInput{ID: l.ID, LineItemID: l.LineItemID, Currency: l.Currency, Amount: l.Amount.String(),
			DeliveryDate: l.DeliveryDate.String(), Description: l.Description, Attributes: l.Attributes}
		if l.OverallLimit != nil {
			limit := l.OverallLimit.String()
			line.OverallLimit = &limit
		}
		in.Lines = append(in.Lines, line)
	}
	return in
}
