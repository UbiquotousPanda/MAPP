package purchaserequest

import (
	"testing"
	"time"

	"mapp/internal/platform/actor"
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

func TestStepsOf_032Timeline_SentToGSAPIsTheFirstSend(t *testing.T) {
	t.Parallel()
	sentOn := date.New(2026, time.November, 3)
	first := time.Date(2026, time.November, 3, 9, 0, 0, 0, time.UTC)
	resent := time.Date(2026, time.November, 4, 9, 0, 0, 0, time.UTC)
	pr := PurchaseRequest{Status: StatusApproved, Approved: &Version{ApprovedAt: first}, Lines: []Line{{SentOn: &sentOn}}}
	newestFirst := []Routing{{RoutedAt: resent, RoutedBy: actor.Actor{Name: "Resender"}}, {RoutedAt: first, RoutedBy: actor.Actor{Name: "Sender"}}}

	sent := stepsOf(pr, nil, newestFirst, progress{})[3]
	if sent.Key != stepSent || sent.At == nil || !sent.At.Equal(first) || sent.By.Name != "Sender" {
		t.Errorf("Sent to GSAP = %+v at %v, want the first send at %v by Sender", sent, sent.At, first)
	}
}

func TestStepsOf_032Timeline_DeclinedOrClosedWaitsForNothing(t *testing.T) {
	t.Parallel()
	approved := &Version{ApprovedAt: time.Date(2026, time.November, 2, 9, 0, 0, 0, time.UTC)}
	tests := []struct {
		name string
		pr   PurchaseRequest
	}{
		{"declined", PurchaseRequest{Status: StatusDeclined}},
		{"closed", PurchaseRequest{Status: StatusClosed, Approved: approved}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			for _, step := range stepsOf(tt.pr, nil, nil, progress{}) {
				if step.Waiting != "" {
					t.Errorf("step %s waits %q, want no waiting step", step.Key, step.Waiting)
				}
			}
		})
	}
}

func TestStepsOf_032Timeline_OpenRequestWaitsForTheNextStep(t *testing.T) {
	t.Parallel()
	steps := stepsOf(PurchaseRequest{Status: StatusInReview}, nil, nil, progress{})
	if steps[2].Waiting != "Waiting for approval" {
		t.Errorf("approved step waits %q, want %q", steps[2].Waiting, "Waiting for approval")
	}
}
