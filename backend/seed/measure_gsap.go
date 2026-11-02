package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"time"

	"mapp/internal/approval"
	"mapp/internal/financials"
	"mapp/internal/lineitem"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
	"mapp/internal/purchaserequest"
	"mapp/internal/settings"
	"mapp/internal/swbs"
)

// As the simulated GSAP numbers its answers (033): SIM- and ten digits, PR numbers from 10,000,000, POs from 4.5 billion.
const (
	simulatedNumber   = "SIM-%010d"
	simulatedPRBase   = 10_000_000
	simulatedPOBase   = 4_500_000_000
	simulatedPOLine   = "10"
	simulatedPOStatus = "Released"
	simulatedPOFeed   = "Simulated GSAP purchase order"
	demoFeed          = "Demo data (simulated GSAP)"
)

type measureStep struct {
	by actor.Actor
	at time.Time
}

type measureRouting struct {
	typ  purchaserequest.RoutingType
	step measureStep
}

// measureDocuments are the invoices and payments GSAP sends on a purchase request's PO line.
type measureDocuments struct {
	pr       purchaserequest.PurchaseRequest
	lineItem lineitem.LineItem
	list     []measureDocument
}

func (d *demo) addMeasureSwbsRun(ctx context.Context, activityName, lineItemName string, at time.Time) error {
	request, err := d.swbsRequest(ctx, measurePlanName, activityName, lineItemName)
	if err != nil {
		return err
	}
	_, err = swbs.LoadDemo(ctx, d.stores.SwbsRuns, d.ids, swbs.DemoLoad{
		Requests: []swbs.Request{request}, Items: demoReceiver{repo: d.stores.LineItems}, At: at,
	})
	return err
}

// runMeasureRound submits pr as the approval engine does, takes the decisions and moves pr's status with them.
func (d *demo) runMeasureRound(ctx context.Context, pr *purchaserequest.PurchaseRequest, spec measurePR, p measurePeople) error {
	workflow, _, err := d.stores.Approvals.GetWorkflow(ctx, pr.WorkflowID)
	if err != nil {
		return err
	}
	levels, err := d.measureLevels(ctx, workflow, p.carlos)
	if err != nil {
		return err
	}
	usd, err := d.rates.Convert(money.Money{Amount: pr.Lines[0].Amount, Currency: pr.Lines[0].Currency}, money.BaseCurrency)
	if err != nil {
		return err
	}
	at := d.ago(spec.SubmittedAgo)
	round := approval.Round{
		SubjectKind: approval.KindPurchaseRequest, SubjectID: pr.ID, Number: 1, WorkflowID: workflow.ID,
		WorkflowName: workflow.Name, Levels: levels, CurrentLevel: 1, Outcome: approval.OutcomeOpen, SubmittedAt: at,
		SubmittedBy: p.alex, Facts: &approval.RuleFacts{PlannedCost: &usd, BusinessUnits: []approval.FactOption{}},
		ReminderDays: workflow.ReminderDays, EscalationDays: workflow.EscalationDays, Meta: record.NewMeta(p.alex, at),
	}
	round.Levels[0].StartedAt = &at
	if round.ID, err = d.next(ctx, ids.PrefixApprovalRound); err != nil {
		return err
	}
	pr.Status = purchaserequest.StatusSubmitted
	pr.Touch(p.alex, at)
	if err = d.addAction(ctx, d.stores.Approvals, round, roundAction{kind: approval.ActionSubmitted, by: p.alex, at: at}); err != nil {
		return err
	}
	if err = d.decide(ctx, &round, spec.decisions()); err != nil {
		return err
	}
	if err = d.measureRoundEnded(ctx, pr, round); err != nil {
		return err
	}
	return d.stores.Approvals.PutRound(ctx, round)
}

// measureRoundEnded moves pr as the round's last event does (032 data-model §3.5); an approval routes it.
func (d *demo) measureRoundEnded(ctx context.Context, pr *purchaserequest.PurchaseRequest, round approval.Round) error {
	step := measureStep{by: round.UpdatedBy, at: round.UpdatedAt}
	switch round.Outcome { //nolint:exhaustive // the Measure demo's rounds stay open, or are declined or approved
	case approval.OutcomeOpen:
		if round.CurrentLevel > 1 {
			pr.Status = purchaserequest.StatusInReview
			pr.Touch(step.by, step.at)
		}
		return nil
	case approval.OutcomeDeclined:
		pr.Status = purchaserequest.StatusDeclined
		pr.Touch(step.by, step.at)
		return nil
	}
	pr.Status, pr.Approved = purchaserequest.StatusApproved, measureSnapshot(*pr, step.at)
	pr.Touch(step.by, step.at)
	return d.routeMeasurePR(ctx, pr, measureRouting{typ: purchaserequest.RoutingOriginal, step: step})
}

func measureSnapshot(pr purchaserequest.PurchaseRequest, at time.Time) *purchaserequest.Version {
	v := &purchaserequest.Version{Name: pr.Name, Description: pr.Description, OwnerID: pr.OwnerID,
		MoAApproverID: pr.MoAApproverID, Attributes: pr.Attributes, Vendor: pr.Vendor, ApprovedAt: at,
		Lines: make([]purchaserequest.VersionLine, 0, len(pr.Lines))}
	for _, l := range pr.Lines {
		v.Lines = append(v.Lines, purchaserequest.VersionLine{ID: l.ID, LineItemID: l.LineItemID, Currency: l.Currency,
			Amount: l.Amount, DeliveryDate: l.DeliveryDate, OverallLimit: l.OverallLimit, Description: l.Description,
			Attributes: l.Attributes})
	}
	return v
}

func (d *demo) measureLevels(ctx context.Context, w approval.Workflow, moa actor.Actor) ([]approval.RoundLevel, error) {
	levels := make([]approval.RoundLevel, 0, len(w.Levels))
	for i, l := range w.Levels {
		level := approval.RoundLevel{Number: i + 1, Name: l.Name, Approvers: []actor.Actor{}, ApproverType: l.ApproverType,
			Mode: l.Mode, Resolution: approval.ResolutionDecide, Excluded: []approval.Excluded{}}
		approverIDs := l.ApproverIDs
		if l.ApproverType == approval.SourceRecordField {
			approverIDs, level.Source = []string{moa.ID}, moaApproverLevel
		}
		for _, id := range append(slices.Clone(approverIDs), l.BackupApproverID) {
			if id == "" {
				continue
			}
			p, _, err := d.stores.People.Get(ctx, id)
			if err != nil {
				return nil, err
			}
			switch person := p.Actor(); {
			case slices.Contains(approverIDs, id):
				level.Approvers = append(level.Approvers, person)
			case id == l.BackupApproverID:
				level.Backup = &person
			}
		}
		levels = append(levels, level)
	}
	return levels, nil
}

// routeMeasurePR hands pr to the requisitioners as the purchase request's route does, with its PR form rows.
func (d *demo) routeMeasurePR(ctx context.Context, pr *purchaserequest.PurchaseRequest, rt measureRouting) error {
	moa, _, err := d.stores.People.Get(ctx, pr.MoAApproverID)
	if err != nil {
		return err
	}
	rows := make([]purchaserequest.FormRow, 0, len(pr.Lines))
	for _, l := range pr.Lines {
		li, _, found := d.stores.LineItems.Get(ctx, l.LineItemID)
		if found != nil {
			return found
		}
		act, _, found := d.stores.Activities.Get(ctx, li.ActivityID)
		if found != nil {
			return found
		}
		rows = append(rows, purchaserequest.FormRow{PurchaseRequestID: pr.ID, PurchaseRequestName: pr.Name, LineID: l.ID,
			HXKey: purchaserequest.HXKey(l.LineItemID), ShortText: d.measureText(pr.Attributes, "Short text"),
			Vendor: pr.Vendor, VendorCode: d.measureText(pr.Attributes, "Vendor code"),
			CostCentre: d.choiceLabel(act.Attributes, attributeKey(settings.LevelActivity, "Cost centre")),
			SwbsCode:   li.SwbsCode, GLCode: d.choiceLabel(li.Attributes, attributeKey(settings.LevelLineItem, "GL code")),
			Amount: l.Amount, Currency: l.Currency, DeliveryDate: l.DeliveryDate, MoAApproverName: moa.Name,
			MoAApproverEmail: moa.Email})
	}
	id, err := d.next(ctx, ids.PrefixPurchaseRequestRouting)
	if err != nil {
		return err
	}
	if rt.typ == purchaserequest.RoutingOriginal {
		today := date.Today(rt.step.at)
		for i := range pr.Lines {
			pr.Lines[i].SentOn = &today
		}
	}
	return d.stores.PurchaseRequests.AddRouting(ctx, purchaserequest.Routing{ID: id, PurchaseRequestID: pr.ID, Type: rt.typ,
		RoutedAt: rt.step.at, RoutedBy: rt.step.by, Recipients: []string{measureEmailGroup}, Form: rows})
}

func (d *demo) choiceLabel(values settings.AttributeValues, key string) string {
	var optionID string
	if err := json.Unmarshal(values[d.settings.Attributes[key]], &optionID); err != nil {
		return ""
	}
	return d.optionLabel(optionID)
}

func (d *demo) measureText(values settings.AttributeValues, label string) string {
	var text string
	_ = json.Unmarshal(values[d.settings.Attributes[attributeKey(settings.LevelPurchaseRequest, label)]], &text)
	return text
}

// orderMeasurePR is the simulated GSAP's answer to a routed purchase request: a PR number, a PO and its booked line.
func (d *demo) orderMeasurePR(ctx context.Context, pr *purchaserequest.PurchaseRequest, li lineitem.LineItem, step measureStep) error {
	prNumber, err := d.simulatedNumber(ctx, ids.PrefixSimulatedGSAPPR, simulatedPRBase)
	if err != nil {
		return err
	}
	poNumber, err := d.simulatedNumber(ctx, ids.PrefixSimulatedPO, simulatedPOBase)
	if err != nil {
		return err
	}
	today := date.Today(step.at)
	pr.GSAP = purchaserequest.GSAPHeader{PRNumber: prNumber, PRDate: &today, Source: purchaserequest.SourceSimulatedGSAP}
	l := &pr.Lines[0]
	l.PO = purchaserequest.PurchaseOrderLine{Number: poNumber, Line: simulatedPOLine, Status: simulatedPOStatus,
		Date: &today, Value: &money.Money{Amount: l.Amount, Currency: l.Currency}}
	pr.Touch(step.by, step.at)
	imp, err := d.measureImport(ctx, financials.Import{Source: financials.SourceSimulatedGSAP, FeedName: simulatedPOFeed,
		FileName: pr.ID, Rows: 1, New: 1, Meta: record.NewMeta(step.by, step.at)})
	if err != nil {
		return err
	}
	t, err := d.measureTransaction(ctx, financials.Transaction{Fields: financials.Fields{Type: financials.TypePurchaseOrder,
		DocumentNumber: poNumber, LineNumber: simulatedPOLine, PONumber: poNumber, PostingDate: today, Amount: l.Amount,
		Currency: l.Currency, VendorCode: d.measureText(pr.Attributes, "Vendor code"), VendorName: pr.Vendor,
		Description: d.measureText(pr.Attributes, "Short text"), SwbsCode: li.SwbsCode, TrackingKey: purchaserequest.HXKey(li.ID)},
		LineItemID: li.ID, MatchedBy: financials.MatchedByTrackingKey, ImportID: imp.ID, Meta: imp.Meta})
	if err != nil {
		return err
	}
	if err = d.stores.Financials.AddTransactions(ctx, []financials.Transaction{t}); err != nil {
		return err
	}
	return d.stores.Financials.PutImport(ctx, imp)
}

func (d *demo) simulatedNumber(ctx context.Context, prefix string, base int) (string, error) {
	n, err := d.ids.NextNumber(ctx, prefix)
	return fmt.Sprintf(simulatedNumber, base+n), err
}

// bookMeasureDocuments loads the invoices and payments on the purchase orders in one import, the last of the seed.
func (d *demo) bookMeasureDocuments(ctx context.Context, ordered []measureDocuments) error {
	count := 0
	for _, docs := range ordered {
		count += len(docs.list)
	}
	imp, err := d.measureImport(ctx, financials.Import{Source: financials.SourceDemo, FeedName: demoFeed, Rows: count,
		New: count, Meta: record.NewMeta(actor.System, d.at)})
	if err != nil {
		return err
	}
	list := make([]financials.Transaction, 0, count)
	for _, docs := range ordered {
		line := docs.pr.Lines[0]
		for _, doc := range docs.list {
			amount, parsed := money.ParseAmount(doc.Amount)
			if parsed != nil {
				return parsed
			}
			t, booked := d.measureTransaction(ctx, financials.Transaction{Fields: financials.Fields{Type: doc.Type,
				DocumentNumber: doc.Number, PONumber: line.PO.Number, POLineNumber: line.PO.Line,
				PostingDate: date.Today(d.ago(doc.PostedAgo)), Amount: amount, Currency: line.Currency,
				VendorCode: d.measureText(docs.pr.Attributes, "Vendor code"), VendorName: docs.pr.Vendor,
				Description: doc.Description}, LineItemID: docs.lineItem.ID, MatchedBy: financials.MatchedByPONumber,
				ImportID: imp.ID, Meta: imp.Meta})
			if booked != nil {
				return booked
			}
			list = append(list, t)
		}
	}
	if err = d.stores.Financials.AddTransactions(ctx, list); err != nil {
		return err
	}
	return d.stores.Financials.PutImport(ctx, imp)
}

func (d *demo) measureImport(ctx context.Context, imp financials.Import) (financials.Import, error) {
	var err error
	imp.ID, err = d.next(ctx, ids.PrefixFinancialImport)
	return imp, err
}

func (d *demo) measureTransaction(ctx context.Context, t financials.Transaction) (financials.Transaction, error) {
	var err error
	t.ID, err = d.next(ctx, ids.PrefixFinancialTransaction)
	return t, err
}
