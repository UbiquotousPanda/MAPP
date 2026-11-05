package purchaserequest

import (
	"testing"
	"time"

	"mapp/internal/history"
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

	sent := stepsOf(pr, timelineRecords{routings: newestFirst})[3]
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
			for _, step := range stepsOf(tt.pr, timelineRecords{}) {
				if step.Waiting != "" {
					t.Errorf("step %s waits %q, want no waiting step", step.Key, step.Waiting)
				}
			}
		})
	}
}

func TestStepsOf_032Timeline_ApprovedIsTheDecisionNotTheLaterLogEntry(t *testing.T) {
	t.Parallel()
	decided := time.Date(2026, time.November, 3, 13, 39, 25, 400_000_000, time.UTC)
	sentOn := date.New(2026, time.November, 3)
	pr := PurchaseRequest{Status: StatusApproved, Approved: &Version{ApprovedAt: decided}, Lines: []Line{{SentOn: &sentOn}}}
	daniel := actor.Actor{Name: "Daniel Okoro"}
	items := []history.EntryView{{Entry: history.Entry{Verb: "approved", At: decided.Add(250 * time.Millisecond), Actor: daniel}}}
	routings := []Routing{{RoutedAt: decided.Add(80 * time.Millisecond), RoutedBy: daniel}}

	steps := stepsOf(pr, timelineRecords{log: items, routings: routings})
	approved, sent := steps[2], steps[3]
	if approved.At == nil || !approved.At.Equal(decided) || approved.By == nil || approved.By.Name != daniel.Name {
		t.Errorf("Approved = %v by %v, want the decision at %v by Daniel Okoro", approved.At, approved.By, decided)
	}
	if sent.At == nil || approved.At.After(*sent.At) {
		t.Errorf("Approved %v is after Sent to GSAP %v", approved.At, sent.At)
	}
}

func TestStepsOf_032Timeline_OpenRequestWaitsForTheNextStep(t *testing.T) {
	t.Parallel()
	steps := stepsOf(PurchaseRequest{Status: StatusInReview}, timelineRecords{})
	if steps[2].Waiting != "Waiting for approval" {
		t.Errorf("approved step waits %q, want %q", steps[2].Waiting, "Waiting for approval")
	}
}

func TestStepsOf_032Timeline_WithoutLogEntriesTheRoundsSayWhoAndWhen(t *testing.T) {
	t.Parallel()
	submitted := time.Date(2026, time.October, 20, 9, 0, 0, 0, time.UTC)
	decided := submitted.Add(26 * time.Hour)
	alex, daniel := actor.Actor{Name: "Alex Morgan"}, actor.Actor{Name: "Daniel Okoro"}
	pr := PurchaseRequest{Status: StatusApproved, Approved: &Version{ApprovedAt: decided.Add(time.Second)}}
	rounds := []ApprovalRound{{SubmittedAt: submitted, SubmittedBy: alex, ApprovedAt: &decided, ApprovedBy: &daniel}}

	steps := stepsOf(pr, timelineRecords{rounds: rounds})
	for _, want := range []struct {
		step TimelineStep
		at   time.Time
		by   string
	}{{steps[1], submitted, alex.Name}, {steps[2], decided, daniel.Name}} {
		if want.step.At == nil || !want.step.At.Equal(want.at) || want.step.By == nil || want.step.By.Name != want.by {
			t.Errorf("%s = %v by %v, want %v by %s", want.step.Label, want.step.At, want.step.By, want.at, want.by)
		}
	}
}

func TestStepsOf_032Timeline_InvoicedAndPaidAreGSAPsFirstPostings(t *testing.T) {
	t.Parallel()
	invoicedOn, paidOn := date.New(2026, time.November, 10), date.New(2026, time.November, 24)
	pr := PurchaseRequest{Status: StatusApproved, GSAP: GSAPHeader{PRNumber: "10001", Source: SourceSimulatedGSAP},
		Lines: []Line{{PO: PurchaseOrderLine{Number: "4500", Line: "10"}}}}
	p := progress{invoiced: true, paid: true, invoicedOn: &invoicedOn, paidOn: &paidOn}

	steps := stepsOf(pr, timelineRecords{progress: p})
	for i, on := range map[int]date.Date{6: invoicedOn, 7: paidOn} {
		got := steps[i]
		if got.At == nil || !got.At.Equal(on.Time()) || got.By == nil || got.By.Name != "Simulated GSAP" {
			t.Errorf("%s = %v by %v, want %v by Simulated GSAP", got.Label, got.At, got.By, on)
		}
	}
}

func TestProgressOf_032Timeline_TakesTheEarliestPostingOfThePOLines(t *testing.T) {
	t.Parallel()
	first, later := date.New(2026, time.November, 10), date.New(2026, time.November, 12)
	r := reader{posted: map[POLineRef]FirstPosted{
		{PONumber: "4500", Line: "10"}: {Invoice: &later, Payment: &later},
		{PONumber: "4500", Line: "20"}: {Invoice: &first},
	}}
	p := r.progressOf([]Line{{PO: PurchaseOrderLine{Number: "4500", Line: "10"}}, {PO: PurchaseOrderLine{Number: "4500", Line: "20"}}})
	if p.invoicedOn == nil || *p.invoicedOn != first || p.paidOn == nil || *p.paidOn != later {
		t.Errorf("progressOf() dates = %v, %v, want %v, %v", p.invoicedOn, p.paidOn, first, later)
	}
}

func TestStepsOf_032Timeline_ApprovedIsTheFirstApprovalAndALaterChangeIsANote(t *testing.T) {
	t.Parallel()
	first := time.Date(2026, time.November, 20, 10, 0, 0, 0, time.UTC)
	change := time.Date(2026, time.November, 25, 15, 0, 0, 0, time.UTC)
	daniel, mei := actor.Actor{Name: "Daniel Okoro"}, actor.Actor{Name: "Mei Lin"}
	sentOn := date.New(2026, time.November, 20)
	pr := PurchaseRequest{Status: StatusApproved, Approved: &Version{ApprovedAt: change}, Lines: []Line{{SentOn: &sentOn}}}
	rounds := []ApprovalRound{
		{SubmittedAt: change.Add(-time.Hour), ApprovedAt: &change, ApprovedBy: &mei},
		{SubmittedAt: first.Add(-time.Hour), ApprovedAt: &first, ApprovedBy: &daniel},
	}
	routings := []Routing{{RoutedAt: first.Add(time.Minute), RoutedBy: daniel}}

	steps := stepsOf(pr, timelineRecords{rounds: rounds, routings: routings})
	approved, sent := steps[2], steps[3]
	if approved.At == nil || !approved.At.Equal(first) || approved.By == nil || approved.By.Name != daniel.Name {
		t.Errorf("Approved = %v by %v, want the first approval on 20 Nov by Daniel Okoro", approved.At, approved.By)
	}
	if approved.Detail != "change re-approved 25 Nov 2026" {
		t.Errorf("Approved detail = %q, want the later re-approval as a note", approved.Detail)
	}
	if sent.At == nil || approved.At.After(*sent.At) {
		t.Errorf("Approved %v is after Sent to GSAP %v", approved.At, sent.At)
	}
}
