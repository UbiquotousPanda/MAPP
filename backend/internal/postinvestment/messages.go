package postinvestment

const (
	reviewNoun   = "post-investment review"
	reviewPlural = "post-investment reviews"
	kindReview   = "postInvestmentReview"
	kindActivity = "activity"

	fieldActivity     = "activityId"
	fieldVersion      = "version"
	fieldBusinessCase = "businessCase"
	fieldAmountSpent  = "amountSpent"
	fieldMargin       = "margin"
	fieldRemarks      = "remarks"

	maxBusinessCase = 200
	maxRemarks      = 2000

	msgChooseActivity     = "Choose the activity this review is about."
	msgActivityGone       = "This activity no longer exists or isn't shown to you."
	msgAlreadyReviewed    = "This activity already has a post-investment review: open it instead."
	msgEnterVersion       = "Send the version you started from."
	msgBusinessCaseLength = "Use at most 200 characters."
	msgRemarksLength      = "Use at most 2000 characters."
	msgEnterAmount        = "Enter an amount, such as 12500.00."
	msgTooManyDecimals    = "Use at most 2 decimals."
	msgSpentNegative      = "Enter 0.00 or more."
	msgWrongCurrency      = "Enter it in %s, the currency of this review."
	msgSubmitted          = "This review is submitted, so it can't be changed."
	msgBusinessCaseNeeded = "Enter the business case to submit the review."
	msgSpentNeeded        = "Enter the amount spent, above 0.00, to submit the review."
	msgMarginNeeded       = "Enter the margin to submit the review."
	msgUndoTaken          = "Not restored: the activity has a newer post-investment review."

	verbSubmitted = "submitted"
)
