package purchaserequest

import (
	"context"
	"slices"
	"strings"
	"time"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
)

const (
	stepCreated   = "created"
	stepSubmitted = "submitted"
	stepApproved  = "approved"
	stepSent      = "sentToGsap"
	stepPRNumber  = "gsapPrNumber"
	stepPO        = "purchaseOrder"
	stepInvoiced  = "invoiced"
	stepPaid      = "paid"
	timelineLimit = 200
)

var stepLabels = []struct{ key, label, waiting string }{
	{stepCreated, "Created", ""}, {stepSubmitted, "Submitted", "submission"}, {stepApproved, "Approved", "approval"},
	{stepSent, "Sent to GSAP", "release in GSAP"}, {stepPRNumber, "GSAP PR number", "a GSAP PR number"},
	{stepPO, "Purchase order", "a purchase order"}, {stepInvoiced, "Invoiced", "an invoice"}, {stepPaid, "Paid", "payment"},
}

// TimelineStep is one step of a purchase request's life; At and By are empty when the records do not say.
type TimelineStep struct {
	Key          string       `json:"key"`
	Label        string       `json:"label"`
	Reached      bool         `json:"reached"`
	At           *time.Time   `json:"at"`
	By           *actor.Actor `json:"by"`
	Detail       string       `json:"detail"`
	Waiting      string       `json:"waiting"`
	ReapprovedAt *time.Time   `json:"reapprovedAt,omitempty"`
}

// progress is what GSAP's invoices and payments say about a purchase request's PO lines, with the first posting dates.
type progress struct {
	invoiced, paid     bool
	invoicedOn, paidOn *date.Date
}

type timelineRecords struct {
	log      []history.EntryView
	routings []Routing
	rounds   []ApprovalRound
	progress progress
}

func (pr PurchaseRequest) reached(p progress) map[string]bool {
	sent := slices.ContainsFunc(pr.Lines, func(l Line) bool { return l.SentOn != nil })
	ordered := slices.ContainsFunc(pr.Lines, func(l Line) bool { return l.PO.Number != "" })
	return map[string]bool{
		stepCreated: true, stepSubmitted: pr.Status != StatusCreated || pr.Approved != nil,
		stepApproved: pr.Approved != nil, stepSent: sent, stepPRNumber: pr.GSAP.PRNumber != "",
		stepPO: ordered, stepInvoiced: p.invoiced, stepPaid: p.paid,
	}
}

// stageOf is the words of the last step the purchase request has reached; Declined and Closed replace them.
func stageOf(pr PurchaseRequest, p progress) string {
	switch pr.Status {
	case StatusDeclined:
		return "Declined"
	case StatusClosed:
		return "Closed"
	}
	reached := pr.reached(p)
	stage := stepLabels[0].label
	for _, s := range stepLabels {
		if reached[s.key] {
			stage = s.label
		}
	}
	return stage
}

func (s *Service) timelineOf(ctx context.Context, a actor.Actor, pr PurchaseRequest, routings []Routing, p progress) ([]TimelineStep, error) {
	page, err := s.history.QueryLog(ctx, a, history.LogQuery{RecordID: pr.ID, RecordTypes: []string{recordKind}, Limit: timelineLimit})
	if err != nil {
		return nil, err
	}
	records := timelineRecords{log: page.Items, routings: routings, progress: p}
	if s.deps.Approvals != nil {
		if records.rounds, err = s.deps.Approvals.RoundsOf(ctx, pr.ID); err != nil {
			return nil, err
		}
	}
	return stepsOf(pr, records), nil
}

// stepsOf lists the eight steps with who and when for each one reached, and for the first one not
// reached the words "Waiting for …"; a declined or closed request waits for nothing.
func stepsOf(pr PurchaseRequest, records timelineRecords) []TimelineStep {
	reached := pr.reached(records.progress)
	steps := make([]TimelineStep, 0, len(stepLabels))
	waitingSet := pr.Status == StatusDeclined || pr.Status == StatusClosed
	for _, def := range stepLabels {
		step := TimelineStep{Key: def.key, Label: def.label, Reached: reached[def.key]}
		if step.Reached {
			fillStep(&step, pr, records)
		} else if !waitingSet {
			step.Waiting, waitingSet = "Waiting for "+def.waiting, true
		}
		steps = append(steps, step)
	}
	return steps
}

func fillStep(step *TimelineStep, pr PurchaseRequest, records timelineRecords) {
	switch step.Key {
	case stepCreated:
		step.At, step.By = &pr.CreatedAt, &pr.CreatedBy
	case stepSubmitted:
		fillSubmitted(step, records)
	case stepApproved:
		fillApproved(step, pr, records)
	case stepSent:
		if len(records.routings) > 0 {
			first := slices.MinFunc(records.routings, func(x, y Routing) int { return x.RoutedAt.Compare(y.RoutedAt) })
			step.At, step.By = &first.RoutedAt, &first.RoutedBy
		}
	default:
		fillGSAP(step, pr, records.progress)
	}
}

// fillSubmitted and fillApproved prefer the rounds: the engine logs a decision only after the request is routed.
func fillSubmitted(step *TimelineStep, records timelineRecords) {
	setFromLog(step, records.log, func(verb string) bool {
		return strings.HasPrefix(verb, "submitted") || strings.HasPrefix(verb, "re-submitted")
	}, true)
	if len(records.rounds) > 0 {
		first := slices.MinFunc(records.rounds, func(x, y ApprovalRound) int { return x.SubmittedAt.Compare(y.SubmittedAt) })
		step.At, step.By = &first.SubmittedAt, &first.SubmittedBy
	}
}

// fillApproved shows the first approval, which let the request go to GSAP; a later approved change is a note.
func fillApproved(step *TimelineStep, pr PurchaseRequest, records timelineRecords) {
	setFromLog(step, records.log, func(verb string) bool { return verb == "approved" || verb == "approved automatically" }, true)
	if pr.Approved != nil {
		step.At = &pr.Approved.ApprovedAt
	}
	approved := slices.DeleteFunc(slices.Clone(records.rounds), func(r ApprovalRound) bool { return r.ApprovedAt == nil })
	if len(approved) == 0 {
		return
	}
	slices.SortFunc(approved, func(x, y ApprovalRound) int { return x.ApprovedAt.Compare(*y.ApprovedAt) })
	first, last := approved[0], approved[len(approved)-1]
	step.At = first.ApprovedAt
	if first.ApprovedBy != nil {
		step.By = first.ApprovedBy
	}
	if len(approved) > 1 {
		step.ReapprovedAt = last.ApprovedAt
	}
}

func fillGSAP(step *TimelineStep, pr PurchaseRequest, p progress) {
	by := gsapActor(pr.GSAP.Source)
	switch step.Key {
	case stepPRNumber:
		step.Detail, step.By, step.At = pr.GSAP.PRNumber, by, dayStart(pr.GSAP.PRDate)
	case stepPO:
		fillOrder(step, pr)
	case stepInvoiced:
		step.By, step.At = by, dayStart(p.invoicedOn)
	case stepPaid:
		step.By, step.At = by, dayStart(p.paidOn)
	}
}

// setFromLog takes the oldest (oldest true) or newest log entry whose verb matches; items come newest first.
func setFromLog(step *TimelineStep, items []history.EntryView, match func(string) bool, oldest bool) {
	var found *history.Entry
	for i := range items {
		if !match(items[i].Verb) {
			continue
		}
		found = &items[i].Entry
		if !oldest {
			break
		}
	}
	if found != nil {
		step.At, step.By = &found.At, &found.Actor
	}
}

func fillOrder(step *TimelineStep, pr PurchaseRequest) {
	for _, l := range pr.Lines {
		if l.PO.Number == "" {
			continue
		}
		step.Detail, step.By = l.PO.Number, gsapActor(pr.GSAP.Source)
		step.At = dayStart(l.PO.Date)
		return
	}
}

func gsapActor(source string) *actor.Actor {
	if source == SourceSimulatedGSAP {
		return &actor.Actor{ID: "simulated-gsap", Name: "Simulated GSAP"}
	}
	return &actor.Actor{ID: "gsap", Name: "GSAP"}
}

func dayStart(d *date.Date) *time.Time {
	if d == nil {
		return nil
	}
	t := d.Time()
	return &t
}
