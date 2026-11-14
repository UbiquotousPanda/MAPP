package purchaserequest

import "mapp/internal/approval"

// The status rules of a purchase request: access, save, close, delete and the approval engine read them.

// submissionOf is what a submission of kind does to pr now: approval.SubmissionSubmit, SubmissionResubmit or "".
func submissionOf(pr PurchaseRequest, kind RoundKind) string {
	if kind == KindModification {
		return changeSubmission(pr)
	}
	switch pr.Status {
	case StatusCreated:
		return approval.SubmissionSubmit
	case StatusDeclined:
		return approval.SubmissionResubmit
	case StatusSubmitted, StatusInReview:
		if !pr.ChangePending {
			return approval.SubmissionResubmit
		}
	case StatusApproved, StatusClosed:
	}
	return ""
}

func changeSubmission(pr PurchaseRequest) string {
	switch {
	case pr.ChangePending:
		return approval.SubmissionResubmit
	case pr.Status == StatusApproved:
		return approval.SubmissionSubmit
	}
	return ""
}

// saveSteps: the step of a save and of a save that only adds lines; "" where it is not allowed.
func saveSteps(pr PurchaseRequest, config Configuration) (step, addingLines string) {
	switch pr.Status {
	case StatusClosed:
		return "", ""
	case StatusSubmitted, StatusInReview:
		step = ThenResubmit
	case StatusApproved:
		step = ThenSubmitChanges
	case StatusCreated, StatusDeclined:
		step = ThenSave
	}
	return step, addingStep(pr, config, step)
}

func addingStep(pr PurchaseRequest, config Configuration, step string) string {
	switch {
	case (pr.Status == StatusApproved || pr.ChangePending) && config.LinesOnApproved == NotAllowed:
		return ""
	case pr.Status == StatusApproved && config.LinesOnApproved == WithoutApproval:
		return ThenSave
	}
	return step
}

func deleteRefusal(status Status) string {
	switch status {
	case StatusApproved:
		return msgApprovedNoDelete
	case StatusSubmitted, StatusInReview:
		return msgAwaitingNoDelete
	case StatusClosed:
		return msgClosedNoChange
	case StatusCreated, StatusDeclined:
	}
	return ""
}

func closeRefusal(pr PurchaseRequest, config Configuration) string {
	switch {
	case !config.PurchaseSupport:
		return msgSwitchedOff
	case pr.ChangePending:
		return msgChangeInReview
	case pr.Status != StatusApproved:
		return msgOnlyApprovedClose
	}
	return ""
}
