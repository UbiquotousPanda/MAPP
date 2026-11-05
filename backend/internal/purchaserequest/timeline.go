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
	Key     string       `json:"key"`
	Label   string       `json:"label"`
	Reached bool         `json:"reached"`
	At      *time.Time   `json:"at"`
	By      *actor.Actor `json:"by"`
	Detail  string       `json:"detail"`
	Waiting string       `json:"waiting"`
}

// progress is what GSAP's invoices and payments say about a purchase request's PO lines.
type progress struct{ invoiced, paid bool }

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
	return stepsOf(pr, page.Items, routings, p), nil
}

// stepsOf lists the eight steps with who and when for each one reached, and for the first one not
// reached the words "Waiting for …"; a declined or closed request waits for nothing.
func stepsOf(pr PurchaseRequest, items []history.EntryView, routings []Routing, p progress) []TimelineStep {
	reached := pr.reached(p)
	steps := make([]TimelineStep, 0, len(stepLabels))
	waitingSet := pr.Status == StatusDeclined || pr.Status == StatusClosed
	for _, def := range stepLabels {
		step := TimelineStep{Key: def.key, Label: def.label, Reached: reached[def.key]}
		if step.Reached {
			fillStep(&step, pr, items, routings)
		} else if !waitingSet {
			step.Waiting, waitingSet = "Waiting for "+def.waiting, true
		}
		steps = append(steps, step)
	}
	return steps
}

func fillStep(step *TimelineStep, pr PurchaseRequest, items []history.EntryView, routings []Routing) {
	switch step.Key {
	case stepCreated:
		step.At, step.By = &pr.CreatedAt, &pr.CreatedBy
	case stepSubmitted:
		setFromLog(step, items, func(verb string) bool {
			return strings.HasPrefix(verb, "submitted") || strings.HasPrefix(verb, "re-submitted")
		}, true)
	case stepApproved:
		setFromLog(step, items, func(verb string) bool { return verb == "approved" || verb == "approved automatically" }, false)
		if step.At == nil && pr.Approved != nil {
			step.At = &pr.Approved.ApprovedAt
		}
	case stepSent:
		if len(routings) > 0 {
			first := slices.MinFunc(routings, func(x, y Routing) int { return x.RoutedAt.Compare(y.RoutedAt) })
			step.At, step.By = &first.RoutedAt, &first.RoutedBy
		}
	case stepPRNumber:
		step.Detail, step.By = pr.GSAP.PRNumber, gsapActor(pr.GSAP.Source)
		step.At = dayStart(pr.GSAP.PRDate)
	case stepPO:
		fillOrder(step, pr)
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
