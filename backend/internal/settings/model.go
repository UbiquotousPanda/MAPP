// Package settings holds MAPP's Settings. Other packages read them only through its readers, never its tables.
package settings

import (
	"slices"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

type Level string

const (
	LevelPlan       Level = "plan"
	LevelCampaign   Level = "campaign"
	LevelInitiative Level = "initiative"
	LevelActivity   Level = "activity"
	LevelLineItem   Level = "lineItem"
)

var Levels = []Level{LevelPlan, LevelCampaign, LevelInitiative, LevelActivity, LevelLineItem}

type AttributeType string

const (
	TypeSingleChoice        AttributeType = "singleChoice"
	TypeMultipleChoice      AttributeType = "multipleChoice"
	TypeMultipleChoiceSplit AttributeType = "multipleChoiceSplit" // only at activity and line-item level (D-029)
	TypeYesNo               AttributeType = "yesNo"               // always optional; missing reads as No
	TypeText                AttributeType = "text"
	TypeLongText            AttributeType = "longText"
	TypeNumber              AttributeType = "number"
)

type Marking string

const (
	MarkingOptional        Marking = "optional"
	MarkingNeededToPublish Marking = "neededToPublish" // plan, campaign and initiative only
	MarkingNeededToSubmit  Marking = "neededToSubmit"
)

// RoleBusinessUnit marks the one Business unit attribute, whose options other attributes' conditions name.
const RoleBusinessUnit = "businessUnit"

const DefaultSection = "Shell attributes"

type Model struct {
	ID                      string        `json:"id"`
	Name                    string        `json:"name"`
	InqToMqlRate            money.Percent `json:"inqToMqlRate"`
	MqlToDealRate           money.Percent `json:"mqlToDealRate"`
	AverageDealSize         money.Money   `json:"averageDealSize"`
	ActivityTypeIDs         []string      `json:"activityTypeIds"`
	InqToMqlVelocityMonths  int           `json:"inqToMqlVelocityMonths"`
	MqlToDealVelocityMonths int           `json:"mqlToDealVelocityMonths"` // whole months, 0–24
	AllowedGoalStages       []string      `json:"allowedGoalStages"`
	Active                  bool          `json:"active"`
	record.Meta
}

const (
	GoalStageINQ     = "inq"
	GoalStageMQL     = "mql"
	GoalStageRevenue = "revenue"
)

func allGoalStages() []string { return []string{GoalStageINQ, GoalStageMQL, GoalStageRevenue} }

// Normalised fills what a model saved before 047 lacks with the migration's own backfill.
func (m Model) Normalised() Model {
	if len(m.AllowedGoalStages) == 0 {
		m.AllowedGoalStages = allGoalStages()
	}
	return m
}

func (m Model) Allows(activityTypeID string) bool {
	return slices.Contains(m.ActivityTypeIDs, activityTypeID)
}

// Goals rounds MQL and deals half-up to whole numbers; revenue = deals × average deal size, in USD.
type Goals struct {
	INQ, MQL, Deals int64
	Revenue         money.Amount
}

type ActivityType struct {
	ID                 string       `json:"id"`
	Name               string       `json:"name"`
	DefaultPlannedCost *money.Money `json:"defaultPlannedCost"` // USD, 0.00 or more; nil when none
	Active             bool         `json:"active"`
	record.Meta
}

type ActivityCategory struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	IsDefault       bool     `json:"isDefault"` // at most one category is the default
	Active          bool     `json:"active"`
	ActivityTypeIDs []string `json:"activityTypeIds"` // by id; a type is in at most one category
	record.Meta
}

type Attribute struct {
	ID                string        `json:"id"`
	Label             string        `json:"label"`
	HelpText          string        `json:"helpText"`
	Level             Level         `json:"level"`
	Type              AttributeType `json:"type"`
	Marking           Marking       `json:"marking"`
	Section           string        `json:"section"`
	Position          int           `json:"position"`
	ParentAttributeID string        `json:"parentAttributeId"` // the attribute it depends on; "" when none
	Condition         []string      `json:"condition"`
	Role              string        `json:"role"`
	Active            bool          `json:"active"`
	record.Meta
}

func (a Attribute) IsChoice() bool {
	return a.Type.IsChoice()
}

func (t AttributeType) IsChoice() bool {
	return t == TypeSingleChoice || t == TypeMultipleChoice || t == TypeMultipleChoiceSplit
}

type Option struct {
	ID              string   `json:"id"`
	AttributeID     string   `json:"attributeId"`
	Label           string   `json:"label"`
	Position        int      `json:"position"`
	ParentOptionIDs []string `json:"parentOptionIds"` // options of the parent attribute it is linked to; empty when the attribute depends on nothing
	Active          bool     `json:"active"`
	record.Meta
}

// Rate, RateChangedAt and RateChangedBy are legacy when stored (rates are dated ExchangeRates now); the
// readers fill them with the current rate, so every caller keeps reading c.Rate.
type Currency struct {
	Code          string      `json:"code"`
	Name          string      `json:"name"`
	Symbol        string      `json:"symbol"`
	Rate          money.Rate  `json:"rate,omitzero"`
	RateChangedAt time.Time   `json:"rateChangedAt,omitzero"` // legacy when stored; when the current rate was recorded when read
	RateChangedBy actor.Actor `json:"rateChangedBy,omitzero"` // legacy when stored; who recorded it when read
	Active        bool        `json:"active"`
	record.Meta
}

type RateSource string

const (
	RateManual     RateSource = "manual"
	RateGSAPImport RateSource = "gsapImport" // written by a GSAP rate import
)

// ExchangeRate is units of the currency per 1 USD from its date on; USD has none (always 1).
type ExchangeRate struct {
	ID       string     `json:"id"`
	Currency string     `json:"currency"` // an existing currency other than USD; never changes
	Date     date.Date  `json:"date"`
	Rate     money.Rate `json:"rate"`
	Source   RateSource `json:"source"`
	ImportID string     `json:"importId"` // the RI-… import that wrote it; "" for manual
	record.Meta
}

type RateImport struct {
	ID        string     `json:"id"`
	FileName  string     `json:"fileName"`
	Feed      string     `json:"feed"`
	FirstDate *date.Date `json:"firstDate"` // the earliest date among the rates added or replaced; nil when none
	LastDate  *date.Date `json:"lastDate"`
	Added     int        `json:"added"`
	Replaced  int        `json:"replaced"`
	Unchanged int        `json:"unchanged"`
	NotUsed   int        `json:"notUsed"`
	Problems  int        `json:"problems"`
	record.Meta
}

type FieldHelpText struct {
	Key  string `json:"key"`
	Text string `json:"text"` // 0–300 characters, plain text; "" hides the ⓘ
	record.Meta
}

// FinanceBudget is created with its first item and never deleted on its own.
type FinanceBudget struct {
	ID   string `json:"id"`
	Year int    `json:"year"` // never changes
	Name string `json:"name"` // 1–120 characters, unique within its year
	record.Meta
}

type FinanceBudgetItem struct {
	ID       string `json:"id"`
	BudgetID string `json:"budgetId"` // its finance budget; the item's year is the budget's
	Name     string `json:"name"`
	Code     string `json:"code"`
	Active   bool   `json:"active"`
	record.Meta
}
