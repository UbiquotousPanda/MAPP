package settings

import (
	"encoding/json"

	"mapp/internal/history"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

// API types, kept apart from the stored records. Lists are never nil. An update sends only the fields to
// change: a field left out is nil, and Version is a pointer so a missing version can be told apart.

type SettingRef struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Active bool   `json:"active"`
}

type UsagePart struct {
	Kind         string `json:"kind"`
	Text         string `json:"text"`
	Count        int    `json:"count"`
	InRecycleBin int    `json:"inRecycleBin"` // of which in the recycle bin
}

type Usage struct {
	InUse   bool                `json:"inUse"`
	Summary string              `json:"summary"` // the parts joined with " · ", or "Not used yet"
	Parts   []UsagePart         `json:"parts"`
	Records []history.RecordRef `json:"records"` // models and finance budgets: the live plans using it, by name, at most 50
}

type Lock struct {
	Field  string `json:"field"` // type, level, code, rate, year, section, position, condition, parentAttributeId, active, delete
	Reason string `json:"reason"`
}

const (
	fieldType          = "type"
	fieldLevel         = "level"
	fieldCode          = "code"
	fieldRate          = "rate"
	fieldSection       = "section"
	fieldPosition      = "position"
	fieldCondition     = "condition"
	fieldParent        = "parentAttributeId"
	fieldParentOptions = "parentOptionIds"
	fieldActive        = "active"
	fieldDirection     = "direction"
	actionDelete       = "delete"
)

const (
	ImpactGoalsRecalculated   = "goalsRecalculated"
	ImpactActivityTypeRemoved = "activityTypeRemoved"
	ImpactGoalStageRemoved    = "goalStageRemoved"
	ImpactBecomesIncomplete   = "becomesIncomplete"
	ImpactOptionsRemoved      = "optionsRemoved"
	ImpactAmountsRecalculated = "amountsRecalculated"
)

type ImpactWarning struct {
	Kind    string `json:"kind"`
	Message string `json:"message"`
	Count   int    `json:"count"`
}

type ChangeImpact struct {
	Warnings []ImpactWarning `json:"warnings"`
}

type StatusUpdate struct {
	Active  *bool `json:"active"`
	Version *int  `json:"version"`
}

type SettingsOverview struct {
	Models             int `json:"models"`
	ActivityTypes      int `json:"activityTypes"`
	ShellAttributes    int `json:"shellAttributes"`
	Currencies         int `json:"currencies"`
	FinanceBudgetItems int `json:"financeBudgetItems"`
}

// OptionalMoney tells a field left out (Set false) from one sent as null to remove the value (Value nil).
type OptionalMoney struct {
	Set   bool
	Value *money.Input
}

func (o *OptionalMoney) UnmarshalJSON(data []byte) error {
	o.Set = true
	if string(data) == "null" {
		o.Value = nil
		return nil
	}
	var in money.Input
	if err := json.Unmarshal(data, &in); err != nil {
		return err
	}
	o.Value = &in
	return nil
}

type ModelView struct {
	ID                      string        `json:"id"`
	Name                    string        `json:"name"`
	InqToMqlRate            money.Percent `json:"inqToMqlRate"`
	MqlToDealRate           money.Percent `json:"mqlToDealRate"`
	AverageDealSize         money.Money   `json:"averageDealSize"`
	ActivityTypes           []SettingRef  `json:"activityTypes"` // the allowed types, by name
	InqToMqlVelocityMonths  int           `json:"inqToMqlVelocityMonths"`
	MqlToDealVelocityMonths int           `json:"mqlToDealVelocityMonths"`
	AllowedGoalStages       []string      `json:"allowedGoalStages"`
	Active                  bool          `json:"active"`
	Usage                   Usage         `json:"usage"`
	record.Meta
}

type ModelPage struct {
	Items []ModelView `json:"items"`
	Total int         `json:"total"`
}

// ModelInput takes rates as percent texts and the deal size as a money input, so problems become field messages.
type ModelInput struct {
	Name                    string       `json:"name"`
	InqToMqlRate            string       `json:"inqToMqlRate"`
	MqlToDealRate           string       `json:"mqlToDealRate"`
	AverageDealSize         *money.Input `json:"averageDealSize"`
	ActivityTypeIDs         []string     `json:"activityTypeIds"`
	InqToMqlVelocityMonths  *int         `json:"inqToMqlVelocityMonths"`  // nil = 0
	MqlToDealVelocityMonths *int         `json:"mqlToDealVelocityMonths"` // nil = 0
	AllowedGoalStages       []string     `json:"allowedGoalStages"`       // nil = every stage
}

type ModelUpdate struct {
	Name                    *string       `json:"name"`
	InqToMqlRate            *string       `json:"inqToMqlRate"`
	MqlToDealRate           *string       `json:"mqlToDealRate"`
	AverageDealSize         OptionalMoney `json:"averageDealSize"`
	ActivityTypeIDs         *[]string     `json:"activityTypeIds"`
	InqToMqlVelocityMonths  *int          `json:"inqToMqlVelocityMonths"`
	MqlToDealVelocityMonths *int          `json:"mqlToDealVelocityMonths"`
	AllowedGoalStages       *[]string     `json:"allowedGoalStages"`
	Version                 *int          `json:"version"`
}

type ActivityTypeView struct {
	ID                 string       `json:"id"`
	Name               string       `json:"name"`
	DefaultPlannedCost *money.Money `json:"defaultPlannedCost"` // USD; null when none
	Models             []SettingRef `json:"models"`
	Category           *SettingRef  `json:"category"`
	Active             bool         `json:"active"`
	Usage              Usage        `json:"usage"`
	record.Meta
}

type ActivityTypePage struct {
	Items []ActivityTypeView `json:"items"`
	Total int                `json:"total"`
}

type ActivityTypeInput struct {
	Name               string       `json:"name"`
	DefaultPlannedCost *money.Input `json:"defaultPlannedCost"`
	ModelIDs           []string     `json:"modelIds"` // the models that allow the new type
}

// ActivityTypeUpdate: DefaultPlannedCost sent as null removes it; ModelIDs, when sent, is the complete new list.
type ActivityTypeUpdate struct {
	Name               *string       `json:"name"`
	DefaultPlannedCost OptionalMoney `json:"defaultPlannedCost"`
	ModelIDs           *[]string     `json:"modelIds"`
	Version            *int          `json:"version"`
}
