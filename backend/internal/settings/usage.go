package settings

import (
	"context"
	"encoding/json"
	"fmt"

	"mapp/internal/history"
	"mapp/internal/platform/money"
)

// Reference is one record outside Settings, live or binned, and the Settings records it uses.
type Reference struct {
	Record              history.RecordRef
	InBin               bool
	Level               Level
	PlanID              string
	ActivityID          string // an activity: its own id; a line item: its activity; "" otherwise
	Attributes          AttributeValues
	ModelID             string
	GoalStage           string
	ActivityTypeID      string
	Currency            string // line items: their currency; people: their display currency; plans: their plan currency
	PlannedCost         *money.Amount
	Budget              *money.Amount
	FinanceBudgetID     string
	FinanceBudgetItemID string
}

// CurrencyUse counts the records of a kind too numerous to list as References that hold amounts in Currency.
type CurrencyUse struct {
	Kind     string
	Currency string
	Count    int
}

const (
	UseOfPerformanceFact      = "performanceFact"
	UseOfFinancialTransaction = "financialTransaction"
)

// ReferenceSource lists every record of one kind, live and in the bin; each record area provides one.
type ReferenceSource func(ctx context.Context) ([]Reference, error)

const (
	usedByPerson       = "person"
	usedByModel        = "model"
	usedByDependent    = "dependentAttribute"
	usedByCondition    = "condition"
	usedByLinkedOption = "linkedOption"
	usedByCategory     = "activityCategory"
)

const notUsedYet = "Not used yet"

const maxUsageRecords = 50

var levelNouns = map[Level][2]string{
	LevelPlan:       {"plan", "plans"},
	LevelCampaign:   {"campaign", "campaigns"},
	LevelInitiative: {"initiative", "initiatives"},
	LevelActivity:   {"activity", "activities"},
	LevelLineItem:   {"line item", "line items"},
}

type tally struct {
	count, inBin int
}

func (t *tally) add(inBin bool) {
	t.count++
	if inBin {
		t.inBin++
	}
}

type binned[T any] struct {
	record T
	inBin  bool
}

// usageIndex answers "Used by" for every Settings record, built once per request.
type usageIndex struct {
	refs       []Reference
	attributes map[string]Attribute

	plansByModel       map[string]*tally
	activitiesByType   map[string]*tally
	modelsByType       map[string]*tally
	categoriesByType   map[string]*tally
	valuesByAttribute  map[string]*tally
	valuesByOption     map[string]*tally
	dependents         map[string][]binned[Attribute] // parent attribute id → the attributes depending on it
	conditions         tally
	conditionsByOption map[string]*tally
	linkedOptions      map[string]map[string]*tally // parent option id → dependent attribute id → its options linked to it
	lineItemsByCurr    map[string]*tally
	peopleByCurr       map[string]*tally
	plansByCurr        map[string]*tally
	prLinesByCurr      map[string]*tally
	usesByCurr         map[string][]CurrencyUse
	lineItemsByItem    map[string]*tally
	plansByBudget      map[string]*tally
}

func (s *Service) usage(ctx context.Context) (*usageIndex, error) {
	u := &usageIndex{
		attributes:   map[string]Attribute{},
		plansByModel: map[string]*tally{}, activitiesByType: map[string]*tally{}, modelsByType: map[string]*tally{},
		categoriesByType:  map[string]*tally{},
		valuesByAttribute: map[string]*tally{}, valuesByOption: map[string]*tally{},
		dependents: map[string][]binned[Attribute]{}, conditionsByOption: map[string]*tally{},
		linkedOptions:   map[string]map[string]*tally{},
		lineItemsByCurr: map[string]*tally{}, peopleByCurr: map[string]*tally{}, plansByCurr: map[string]*tally{}, lineItemsByItem: map[string]*tally{},
		plansByBudget: map[string]*tally{}, prLinesByCurr: map[string]*tally{}, usesByCurr: map[string][]CurrencyUse{},
	}
	refs, err := s.references(ctx)
	if err != nil {
		return nil, err
	}
	u.refs = refs
	models, attributes, options, categories, err := s.settingsInUse(ctx)
	if err != nil {
		return nil, err
	}
	for _, a := range attributes {
		u.attributes[a.record.ID] = a.record
	}

	for _, m := range models {
		for _, typeID := range m.record.ActivityTypeIDs {
			count(u.modelsByType, typeID, m.inBin)
		}
	}
	addCategoryTypes(u.categoriesByType, categories)
	for _, a := range attributes {
		if a.record.ParentAttributeID != "" {
			u.dependents[a.record.ParentAttributeID] = append(u.dependents[a.record.ParentAttributeID], a)
		}
		if len(a.record.Condition) > 0 {
			u.conditions.add(a.inBin)
		}
		for _, optionID := range unique(a.record.Condition) {
			count(u.conditionsByOption, optionID, a.inBin)
		}
	}
	for _, o := range options {
		for _, parentID := range unique(o.record.ParentOptionIDs) {
			if u.linkedOptions[parentID] == nil {
				u.linkedOptions[parentID] = map[string]*tally{}
			}
			count(u.linkedOptions[parentID], o.record.AttributeID, o.inBin)
		}
	}
	for _, ref := range u.refs {
		u.addReference(ref)
	}
	uses, err := s.repo.CurrencyUses(ctx)
	for _, use := range uses {
		u.usesByCurr[use.Currency] = append(u.usesByCurr[use.Currency], use)
	}
	return u, err
}

func (s *Service) references(ctx context.Context) ([]Reference, error) {
	refs := []Reference{}
	for _, source := range s.sources {
		listed, err := source(ctx)
		if err != nil {
			return nil, err
		}
		refs = append(refs, listed...)
	}
	return refs, nil
}

func addCategoryTypes(tallies map[string]*tally, categories []ActivityCategory) {
	for _, c := range categories {
		for _, typeID := range c.ActivityTypeIDs {
			count(tallies, typeID, false)
		}
	}
}

func (u *usageIndex) addReference(ref Reference) {
	if ref.ModelID != "" {
		count(u.plansByModel, ref.ModelID, ref.InBin)
	}
	if ref.ActivityTypeID != "" {
		count(u.activitiesByType, ref.ActivityTypeID, ref.InBin)
	}
	if ref.Currency != "" {
		switch ref.Level {
		case "":
			count(u.peopleByCurr, ref.Currency, ref.InBin)
		case LevelPlan:
			count(u.plansByCurr, ref.Currency, ref.InBin)
		case LevelPurchaseRequestLine:
			count(u.prLinesByCurr, ref.Currency, ref.InBin)
		default:
			count(u.lineItemsByCurr, ref.Currency, ref.InBin)
		}
	}
	if ref.FinanceBudgetItemID != "" {
		count(u.lineItemsByItem, ref.FinanceBudgetItemID, ref.InBin)
	}
	if ref.FinanceBudgetID != "" {
		count(u.plansByBudget, ref.FinanceBudgetID, ref.InBin)
	}
	for attributeID, raw := range ref.Attributes {
		attribute, known := u.attributes[attributeID]
		if !known || attribute.Level != ref.Level || isEmptyValue(raw) {
			continue
		}
		count(u.valuesByAttribute, attributeID, ref.InBin)
		for _, optionID := range optionIDsOf(attribute, raw) {
			count(u.valuesByOption, optionID, ref.InBin)
		}
	}
}

func count(tallies map[string]*tally, key string, inBin bool) {
	if tallies[key] == nil {
		tallies[key] = &tally{}
	}
	tallies[key].add(inBin)
}

func (s *Service) settingsInUse(ctx context.Context) ([]binned[Model], []binned[Attribute], []binned[Option], []ActivityCategory, error) {
	models, err := liveAndBinned(ctx, s, modelKind, s.repo.ListModels)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	attributes, err := liveAndBinned(ctx, s, attributeKind, s.repo.ListAttributes)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	options, err := liveAndBinned(ctx, s, optionKind, s.repo.ListOptions)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	categories, err := s.repo.ListActivityCategories(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	return models, attributes, options, categories, nil
}

func liveAndBinned[T any](ctx context.Context, s *Service, kind string, list func(context.Context) ([]T, error)) ([]binned[T], error) {
	snapshots, err := s.history.SnapshotsInBin(ctx, kind)
	if err != nil {
		return nil, err
	}
	stored, err := list(ctx)
	if err != nil {
		return nil, err
	}
	return withBinned(stored, snapshots)
}

func withBinned[T any](stored []T, snapshots []history.Snapshot) ([]binned[T], error) {
	list := make([]binned[T], 0, len(stored)+len(snapshots))
	for _, record := range stored {
		list = append(list, binned[T]{record: record})
	}
	for _, snapshot := range snapshots {
		var record T
		if err := json.Unmarshal(snapshot.Data, &record); err != nil {
			return nil, fmt.Errorf("settings: read %s %s in the recycle bin: %w", snapshot.Kind, snapshot.ID, err)
		}
		list = append(list, binned[T]{record: record, inBin: true})
	}
	return list, nil
}
