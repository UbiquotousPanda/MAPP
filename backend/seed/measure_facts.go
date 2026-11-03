package seed

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"time"

	"mapp/internal/activity"
	"mapp/internal/history"
	"mapp/internal/performance"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/ids"
	"mapp/internal/stores"
)

// measureFeed is the Measure plan's performance source, its column mappings and the one file loaded through it.
type measureFeed struct {
	Name, Description, Owner, File string
	Category                       performance.Category
	DeliveryRoute                  performance.DeliveryRoute
	Cadence                        performance.Cadence
	Mappings                       []measureMapping
	Facts                          []measureFact
}

type measureMapping struct {
	Column, Stage, Model string
	Meaning              performance.Meaning
	KeyType              performance.MatchedOn
}

// measureFact is one row of the file; its activity is named, the file carries the activity's ID.
type measureFact struct {
	Ref, Date, Activity, INQ, MQL, Revenue, Currency, Journey string
}

func measureFactColumns() []string {
	return []string{"Ref", "Date", "Activity", "INQ", "MQL", "Revenue", "Currency", "Journey"}
}

func (f measureFact) cells(activityID string) []string {
	return []string{f.Ref, f.Date, activityID, f.INQ, f.MQL, f.Revenue, f.Currency, f.Journey}
}

// addMeasureFacts stores the feed like any seed record, then uploads the file through 046's own reading and import, so
// matching, the load record and Undo are real; the import's one log entry is at the seed time, after the history (D-188).
func (d *demo) addMeasureFacts(ctx context.Context, feed measureFeed) error {
	sourceID, err := d.putMeasureFeed(ctx, feed)
	if err != nil {
		return err
	}
	content, err := d.measureFactsFile(feed.Facts)
	if err != nil {
		return err
	}
	service, err := d.performanceService()
	if err != nil {
		return err
	}
	mappings, err := service.Mappings(ctx, actor.System, sourceID)
	if err != nil {
		return err
	}
	file, err := performance.ReadFile(content, mappings)
	if err != nil {
		return err
	}
	run, err := service.RunImport(ctx, actor.System, performance.ImportInput{SourceID: sourceID, FileName: feed.File,
		Origin: performance.OriginUpload, Headings: file.Headings, Rows: file.Rows})
	if err == nil && run.Counts.Matched != run.Counts.Read {
		err = fmt.Errorf("seed: %s matched %d of its %d rows, want every row", feed.File, run.Counts.Matched, run.Counts.Read)
	}
	return err
}

func (d *demo) putMeasureFeed(ctx context.Context, feed measureFeed) (string, error) {
	var r resolver
	owner := r.id(d.people, "person", feed.Owner)
	if r.err != nil {
		return "", r.err
	}
	id, err := d.next(ctx, ids.PrefixPerformanceSource)
	if err != nil {
		return "", err
	}
	source := performance.Source{ID: id, Name: feed.Name, Description: feed.Description, OwnerID: owner,
		Category: feed.Category, Status: performance.StatusActive, DeliveryRoute: feed.DeliveryRoute,
		Cadence: feed.Cadence, Meta: d.meta()}
	if err = d.stores.Performance.PutSource(ctx, source); err != nil {
		return "", err
	}
	for _, m := range feed.Mappings {
		if err = d.putMeasureMapping(ctx, id, m); err != nil {
			return "", err
		}
	}
	return id, nil
}

func (d *demo) putMeasureMapping(ctx context.Context, sourceID string, m measureMapping) error {
	var r resolver
	modelID := ""
	if m.Model != "" {
		modelID = r.id(d.settings.Models, "model", m.Model)
	}
	if r.err != nil {
		return r.err
	}
	id, err := d.next(ctx, ids.PrefixPerformanceMapping)
	if err != nil {
		return err
	}
	return d.stores.Performance.PutMapping(ctx, performance.Mapping{ID: id, SourceID: sourceID, ColumnName: m.Column,
		Meaning: m.Meaning, KeyType: m.KeyType, Stage: m.Stage, ModelID: modelID, Meta: d.meta()})
}

func (d *demo) measureFactsFile(facts []measureFact) ([]byte, error) {
	var file bytes.Buffer
	w := csv.NewWriter(&file)
	if err := w.Write(measureFactColumns()); err != nil {
		return nil, err
	}
	var r resolver
	for _, f := range facts {
		if err := w.Write(f.cells(r.id(d.activities, "activity", measurePlanName+"/"+f.Activity))); err != nil {
			return nil, err
		}
	}
	if r.err != nil {
		return nil, r.err
	}
	w.Flush()
	return file.Bytes(), w.Error()
}

// performanceService is 046's service as the API wires it, on the seed's stores, IDs and time; of its kinds only
// those without a parent are registered, as only the API registers the planning kinds the others hang off.
func (d *demo) performanceService() (*performance.Service, error) {
	now := func() time.Time { return d.at }
	log := history.NewService(d.stores.Tx, d.stores.History, d.ids, now)
	service := performance.NewService(history.Tools{Tx: d.stores.Tx, IDs: d.ids, Log: log, Now: now}, d.stores.Performance)
	service.UseApprovals(approvedActivities{activities: d.stores.Activities})
	for _, k := range service.Kinds() {
		if k.Parent != "" {
			continue
		}
		if err := log.Register(k); err != nil {
			return nil, err
		}
	}
	return service, nil
}

// approvedActivities answers 046's approval gate as the API's adapter does: In progress and Complete are Approved.
type approvedActivities struct {
	activities stores.ActivityStore
}

func (a approvedActivities) ApprovedIDs(ctx context.Context, activityIDs []string) (map[string]bool, error) {
	found, err := a.activities.ListByIDs(ctx, activityIDs)
	if err != nil {
		return nil, err
	}
	approved := make(map[string]bool, len(found))
	for _, act := range found {
		approved[act.ID] = act.Status == activity.StatusApproved
	}
	return approved, nil
}
