package plan

import (
	"cmp"
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"mapp/internal/history"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
	"mapp/internal/rollup"
)

const (
	kindName     = "plan"
	kindSingular = "plan" // mid-sentence, as in "Not saved — Daniel Okoro changed this plan"
	kindPlural   = "plans"
)

const (
	labelName          = "Plan name"
	labelYear          = "Year"
	labelModel         = "Model"
	labelTeams         = "Teams"
	labelOwner         = "Owner"
	labelAOP           = "Strategic / AOP plan"
	labelDescription   = "Description"
	labelBudget        = "Plan budget"
	labelFinanceBudget = "Default finance budget"
	labelSpread        = "Default line-item spread"
	labelBCPIR         = "BCPIR plan"
	labelGoalStage     = "Goal stage"
	labelGoalAmount    = "Goal amount"
	labelStatus        = "Status"
	labelCurrency      = "Plan currency"
	labelPlanType      = "Plan type"
)

var (
	spreadWords = map[string]string{
		string(SpreadEvenly): "Evenly", string(SpreadFirstMonth): "All in first month",
		string(SpreadLastMonth): "All in last month", string(SpreadCustom): "Custom",
	}
	stageWords  = map[string]string{string(StageINQ): "INQ", string(StageMQL): "MQL", string(StageRevenue): "Revenue"}
	statusWords = map[string]string{string(StatusDraft): "Draft", string(StatusPublished): "Published"}

	planTypeWords = map[PlanType]string{TypeOperational: "Operational", TypeStrategic: "Strategic", TypeCrossMarket: "Cross-market"}
)

const (
	undoNameTakenMessage = "Can't undo — there is now another plan called '%s'. Restore it from the recycle bin instead."
	renamedNote          = "Renamed to '%s' because the name was taken."
	returnedAsDraftNote  = "Returned as Draft — publish it again when it's ready."
)

// Kinds must be registered before the kinds of the levels below a plan.
func (s *Service) Kinds() []history.Kind {
	return []history.Kind{{
		Name:           kindName,
		Singular:       kindSingular,
		Plural:         kindPlural,
		Snapshot:       s.snapshot,
		SnapshotsOf:    s.snapshotsOf,
		Remove:         s.repo.Delete,
		Put:            s.put,
		Describe:       s.describe,
		PrepareRestore: s.prepareRestore,
	}}
}

func (s *Service) snapshot(ctx context.Context, id string) (history.Snapshot, bool, error) {
	p, found, err := s.repo.Get(ctx, id)
	if err != nil || !found {
		return history.Snapshot{}, false, err
	}
	data, err := json.Marshal(p)
	if err != nil {
		return history.Snapshot{}, false, err
	}
	return history.Snapshot{ID: p.ID, Name: p.Name, Data: data}, true, nil
}

func (s *Service) put(ctx context.Context, snapshot history.Snapshot) error {
	var p Plan
	if err := json.Unmarshal(snapshot.Data, &p); err != nil {
		return err
	}
	return s.repo.Put(ctx, p)
}

// describe answers "" for history's default text; an id that no longer resolves is shown as it is.
func (s *Service) describe(ctx context.Context, field string, value any) (label, text string, err error) {
	if strings.HasPrefix(field, "attributes.") {
		return s.settings.DescribeAttribute(ctx, field, value)
	}
	if label, text, ok := rollup.DescribePhasing(field, value); ok {
		return label, text, nil
	}
	stored, _ := value.(string) // most fields are stored as text
	switch field {
	case "name":
		return labelName, "", nil
	case "year":
		return labelYear, "", nil
	case "modelId":
		m, found, err := s.settings.Model(ctx, stored)
		if err != nil || !found {
			return labelModel, "", err
		}
		return labelModel, m.Name, nil
	case "teamIds":
		names, err := s.describeTeams(ctx, value)
		return labelTeams, names, err
	case "ownerId":
		refs, err := s.directory.PersonRefs(ctx, []string{stored})
		return labelOwner, refs[stored].Name, err
	case "aop":
		return labelAOP, "", nil
	case "description":
		return labelDescription, "", nil
	case "budget":
		if amount, err := money.ParseAmount(stored); err == nil { // logged before plan currencies: USD
			return labelBudget, money.USD(amount).Format(), nil
		}
		return labelBudget, rollup.MoneyText(value), nil
	case "currency":
		return labelCurrency, stored, nil
	case "planType":
		return labelPlanType, planTypeWords[PlanType(stored)], nil
	case "defaultFinanceBudgetId":
		b, found, err := s.settings.FinanceBudget(ctx, stored)
		if err != nil || !found {
			return labelFinanceBudget, "", err
		}
		return labelFinanceBudget, b.Name, nil
	case "defaultSpread":
		return labelSpread, spreadWords[stored], nil
	case "bcpir":
		return labelBCPIR, "", nil
	case "goalStage":
		return labelGoalStage, stageWords[stored], nil
	case "goalAmount":
		return labelGoalAmount, goalText(stored), nil
	case "status":
		return labelStatus, statusWords[stored], nil
	}
	return "", "", nil
}

func (s *Service) describeTeams(ctx context.Context, value any) (string, error) {
	list, _ := value.([]any)
	ids := make([]string, 0, len(list))
	for _, item := range list {
		if id, ok := item.(string); ok {
			ids = append(ids, id)
		}
	}
	refs, err := s.directory.TeamRefs(ctx, ids)
	if err != nil {
		return "", err
	}
	names := make([]string, 0, len(ids))
	for _, id := range ids {
		names = append(names, cmp.Or(refs[id].Name, id))
	}
	return strings.Join(names, ", "), nil
}

// goalText: INQ and MQL are counts; revenue is stored with two decimals.
func goalText(stored string) string {
	if stored == "" {
		return ""
	}
	if strings.Contains(stored, ".") {
		if amount, err := money.ParseAmount(stored); err == nil {
			return money.USD(amount).Format()
		}
		return stored
	}
	if n, ok := wholeNumber(stored); ok {
		return strings.TrimSuffix(money.FromCents(n*100).Format(), ".00")
	}
	return stored
}

// prepareRestore: plan names are unique, so an Undo of a plan whose name was taken meanwhile is refused and a
// Restore renames it; a Restore (not an Undo) of a Published plan returns it as Draft.
func (s *Service) prepareRestore(ctx context.Context, rc history.RestoreContext, snapshot *history.Snapshot) ([]string, error) {
	var p Plan
	if err := json.Unmarshal(snapshot.Data, &p); err != nil {
		return nil, err
	}
	all, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	var notes []string
	if other, taken := planNamed(all, p.Name, p.ID); taken {
		if rc.Undo {
			return nil, errs.NameTaken(fmt.Sprintf(undoNameTakenMessage, other.Name))
		}
		p.Name = restoredName(all, p.Name, p.ID)
		notes = append(notes, fmt.Sprintf(renamedNote, p.Name))
	}
	if status, reset := history.StatusAfterRestore(rc, p.Status, StatusDraft); reset {
		p.Status = status
		notes = append(notes, returnedAsDraftNote)
	}
	if len(notes) == 0 {
		return nil, nil
	}
	p.Touch(rc.Actor, rc.Now)
	data, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	snapshot.Name, snapshot.Data = p.Name, data
	return notes, nil
}

// restoredName may exceed 120 characters: nothing but a missing parent may block a restore.
func restoredName(all []Plan, name, id string) string {
	candidate := name + " (restored)"
	for n := 2; ; n++ {
		if _, taken := planNamed(all, candidate, id); !taken {
			return candidate
		}
		candidate = fmt.Sprintf("%s (restored %d)", name, n)
	}
}
