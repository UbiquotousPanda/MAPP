package seed

import (
	"context"
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
)

const (
	measurePlanName   = "FY2026 Measure demo – Lubricants Benelux"
	measureEmailGroup = "BE_LUBES"
	measurePRWorkflow = "Two-level PR approval (Measure demo)"
	moaApproverLevel  = "MoA approver"
)

// measureFile is measure.json: the plan as the showcase's, then the SWBS codes and purchase requests of its line items.
type measureFile struct {
	showcaseFile
	SwbsCodes        []measureSwbs
	PurchaseRequests []measurePR
	Categories       []measureCategory
	Feed             measureFeed
}

type measureSwbs struct {
	Activity, LineItem string
	DaysAgo            int
}

// measurePR is one purchase request; its steps are days before the seed time, 0 when not reached.
type measurePR struct {
	Name, Activity, LineItem, Amount, Delivery, Workflow string
	Vendor                                               struct{ ShortText, Name, Code string }
	CreatedAgo, SubmittedAgo, OrderedAgo, ClosedAgo      int
	Decisions                                            []struct {
		By       string
		DaysAgo  int
		Declined bool
		Comment  string
	}
	Documents []measureDocument
}

type measureDocument struct {
	Type                        financials.Type
	Number, Amount, Description string
	PostedAgo                   int
}

func (spec measurePR) decisions() []demoDecision {
	list := make([]demoDecision, 0, len(spec.Decisions))
	for _, dd := range spec.Decisions {
		list = append(list, demoDecision{by: dd.By, ago: time.Duration(dd.DaysAgo) * day, declined: dd.Declined, comment: dd.Comment})
	}
	return list
}

func (d *demo) addMeasurePurchases(ctx context.Context, file measureFile) error {
	if err := d.addMeasurePRWorkflow(ctx); err != nil {
		return err
	}
	for _, c := range file.SwbsCodes {
		if err := d.addMeasureSwbsRun(ctx, c.Activity, c.LineItem, d.at.Add(-time.Duration(c.DaysAgo)*day+2*time.Hour)); err != nil {
			return err
		}
	}
	p, err := d.measurePeople(ctx)
	if err != nil {
		return err
	}
	var ordered []measureDocuments
	for _, spec := range file.PurchaseRequests {
		docs, err := d.addMeasurePR(ctx, spec, p)
		if err != nil {
			return err
		}
		if len(docs.list) > 0 {
			ordered = append(ordered, docs)
		}
	}
	return d.bookMeasureDocuments(ctx, ordered)
}

func (d *demo) addMeasurePRWorkflow(ctx context.Context) error {
	var r resolver
	alex := r.id(d.people, "person", alexMorgan)
	id, err := d.next(ctx, ids.PrefixApprovalWorkflow)
	if err = cmpErr(err, r.err); err != nil {
		return err
	}
	w := approval.Workflow{ID: id, Name: measurePRWorkflow, Active: true, ObjectType: approval.KindPurchaseRequest,
		Description: "The MoA approver, then Alex Morgan for the marketing budget; Alex Morgan is the backup.", Meta: d.meta(),
		Levels: []approval.Level{
			{Name: moaApproverLevel, ApproverType: approval.SourceRecordField, ApproverIDs: []string{},
				RecordField: approval.RecordFieldMoAApprover, Mode: approval.ModeAny, BackupApproverID: alex},
			{Name: "Marketing budget", ApproverType: approval.SourcePeople, ApproverIDs: []string{alex}, Mode: approval.ModeAny},
		},
		ReminderDays: days(3), EscalationDays: days(5)}
	d.workflows[measurePRWorkflow] = id
	return d.stores.Approvals.PutWorkflow(ctx, w)
}

func (d *demo) addMeasurePR(ctx context.Context, spec measurePR, p measurePeople) (measureDocuments, error) {
	pr, li, err := d.newMeasurePR(ctx, spec)
	if err != nil {
		return measureDocuments{}, err
	}
	if spec.SubmittedAgo > 0 {
		if err = d.runMeasureRound(ctx, &pr, spec, p); err != nil {
			return measureDocuments{}, err
		}
	}
	docs := measureDocuments{lineItem: li}
	if spec.OrderedAgo > 0 {
		if err = d.orderMeasurePR(ctx, &pr, li, measureStep{by: p.lea, at: d.ago(spec.OrderedAgo)}); err != nil {
			return measureDocuments{}, err
		}
		docs.list = spec.Documents
	}
	if spec.ClosedAgo > 0 {
		if err = d.closeMeasurePR(ctx, &pr, measureStep{by: p.alex, at: d.ago(spec.ClosedAgo)}); err != nil {
			return measureDocuments{}, err
		}
	}
	docs.pr = pr
	return docs, d.stores.PurchaseRequests.Put(ctx, pr)
}

// closeMeasurePR closes a fully invoiced purchase request as Close does: nothing released, a close routing.
func (d *demo) closeMeasurePR(ctx context.Context, pr *purchaserequest.PurchaseRequest, step measureStep) error {
	pr.Status, pr.ClosedAt = purchaserequest.StatusClosed, &step.at
	for i := range pr.Lines {
		pr.Lines[i].Touch(step.by, step.at)
	}
	pr.Touch(step.by, step.at)
	return d.routeMeasurePR(ctx, pr, measureRouting{typ: purchaserequest.RoutingClose, step: step})
}

func (d *demo) ago(days int) time.Time {
	return d.at.Add(-time.Duration(days) * day)
}

func (d *demo) newMeasurePR(ctx context.Context, spec measurePR) (purchaserequest.PurchaseRequest, lineitem.LineItem, error) {
	li, err := d.measureLineItem(ctx, spec.Activity, spec.LineItem)
	if err != nil {
		return purchaserequest.PurchaseRequest{}, lineitem.LineItem{}, err
	}
	amount, err := money.ParseAmount(spec.Amount)
	if err != nil {
		return purchaserequest.PurchaseRequest{}, lineitem.LineItem{}, err
	}
	var r resolver
	owner, moa := r.id(d.people, "person", alexMorgan), r.id(d.people, "person", carlosMendes)
	workflow, change := r.id(d.workflows, "workflow", spec.Workflow), r.id(d.workflows, "workflow", prChangeWorkflowName)
	planID := r.id(d.plans, "plan", measurePlanName)
	attributes := d.prAttributes(&r, prVendor{shortText: spec.Vendor.ShortText, name: spec.Vendor.Name,
		code: spec.Vendor.Code, emailGroup: measureEmailGroup})
	prID, err := d.next(ctx, ids.PrefixPurchaseRequest)
	if err = cmpErr(err, r.err); err != nil {
		return purchaserequest.PurchaseRequest{}, lineitem.LineItem{}, err
	}
	lineID, err := d.next(ctx, ids.PrefixPurchaseRequestLine)
	if err != nil {
		return purchaserequest.PurchaseRequest{}, lineitem.LineItem{}, err
	}
	alex, err := d.personActor(ctx)(alexMorgan)
	createdAt := d.ago(spec.CreatedAgo).Add(-2 * time.Hour)
	limit := amount
	return purchaserequest.PurchaseRequest{
		ID: prID, PlanID: planID, Name: spec.Name, OwnerID: owner, MoAApproverID: moa, WorkflowID: workflow,
		ModificationWorkflowID: change, Status: purchaserequest.StatusCreated, Attributes: attributes,
		Vendor: spec.Vendor.Name, Meta: record.NewMeta(alex, createdAt),
		Lines: []purchaserequest.Line{{ID: lineID, PurchaseRequestID: prID, Position: 1, LineItemID: li.ID,
			Currency: li.Currency, Amount: amount, DeliveryDate: date.MustParse(spec.Delivery), OverallLimit: &limit,
			Attributes: settings.AttributeValues{}, Meta: record.NewMeta(alex, createdAt)}},
	}, li, err
}

func (d *demo) measureLineItem(ctx context.Context, activityName, name string) (lineitem.LineItem, error) {
	activityID, err := find(d.activities, "activity", measurePlanName+"/"+activityName)
	if err != nil {
		return lineitem.LineItem{}, err
	}
	items, err := d.stores.LineItems.ListByActivity(ctx, activityID)
	if err != nil {
		return lineitem.LineItem{}, err
	}
	i := slices.IndexFunc(items, func(li lineitem.LineItem) bool { return li.Name == name })
	if i < 0 {
		return lineitem.LineItem{}, fmt.Errorf("seed: '%s' has no line item '%s'", activityName, name)
	}
	return items[i], nil
}

// measurePeople are the owner, the MoA approver and the requisitioner of the Measure demo's purchase requests.
type measurePeople struct {
	alex, carlos, lea actor.Actor
}

func (d *demo) measurePeople(ctx context.Context) (measurePeople, error) {
	person := d.personActor(ctx)
	alex, err := person(alexMorgan)
	if err != nil {
		return measurePeople{}, err
	}
	carlos, err := person(carlosMendes)
	if err != nil {
		return measurePeople{}, err
	}
	lea, err := person(leaSantos)
	return measurePeople{alex: alex, carlos: carlos, lea: lea}, err
}
