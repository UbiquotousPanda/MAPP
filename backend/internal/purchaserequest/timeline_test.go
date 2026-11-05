package purchaserequest

import (
	"testing"
	"time"

	"mapp/internal/platform/date"
)

func TestStageOf_NamesTheLastStepReached(t *testing.T) {
	t.Parallel()
	prDate := date.New(2026, time.November, 3)
	sent := &prDate
	approved := &Version{ApprovedAt: time.Date(2026, time.November, 2, 9, 0, 0, 0, time.UTC)}

	tests := []struct {
		name string
		pr   PurchaseRequest
		paid progress
		want string
	}{
		{"a new request is Created", PurchaseRequest{Status: StatusCreated}, progress{}, "Created"},
		{"a request in review is Submitted", PurchaseRequest{Status: StatusInReview}, progress{}, "Submitted"},
		{"an approved request not yet routed is Approved", PurchaseRequest{Status: StatusApproved, Approved: approved}, progress{}, "Approved"},
		{"a routed request is Sent to GSAP", PurchaseRequest{Status: StatusApproved, Approved: approved, Lines: []Line{{SentOn: sent}}}, progress{}, "Sent to GSAP"},
		{"a GSAP PR number is GSAP PR number", PurchaseRequest{Status: StatusApproved, Approved: approved, GSAP: GSAPHeader{PRNumber: "10001"}, Lines: []Line{{SentOn: sent}}}, progress{}, "GSAP PR number"},
		{"a PO is Purchase order", PurchaseRequest{Status: StatusApproved, Approved: approved, GSAP: GSAPHeader{PRNumber: "10001"}, Lines: []Line{{SentOn: sent, PO: PurchaseOrderLine{Number: "4500"}}}}, progress{}, "Purchase order"},
		{"an invoice is Invoiced", PurchaseRequest{Status: StatusApproved, Approved: approved, GSAP: GSAPHeader{PRNumber: "10001"}, Lines: []Line{{SentOn: sent, PO: PurchaseOrderLine{Number: "4500"}}}}, progress{invoiced: true}, "Invoiced"},
		{"a payment is Paid", PurchaseRequest{Status: StatusApproved, Approved: approved, GSAP: GSAPHeader{PRNumber: "10001"}, Lines: []Line{{SentOn: sent, PO: PurchaseOrderLine{Number: "4500"}}}}, progress{invoiced: true, paid: true}, "Paid"},
		{"a declined request says Declined", PurchaseRequest{Status: StatusDeclined}, progress{}, "Declined"},
		{"a closed request says Closed", PurchaseRequest{Status: StatusClosed, Approved: approved}, progress{}, "Closed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := stageOf(tt.pr, tt.paid); got != tt.want {
				t.Errorf("stageOf() = %q, want %q", got, tt.want)
			}
		})
	}
}
