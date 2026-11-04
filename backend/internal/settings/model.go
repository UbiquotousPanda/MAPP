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
	TypeYesNo               AttributeType = "yesNo"
	TypeText                AttributeType = "text"
	TypeLongText            AttributeType = "longText"
	TypeNumber              AttributeType = "number"
)

type Marking string

const (
	MarkingOptional        Marking = "optional"
	MarkingNeededToPublish Marking = "neededToPublish"
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
	MqlToDealVelocityMonths int           `json:"mqlToDealVelocityMonths"`
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
	DefaultPlannedCost *money.Money `json:"defaultPlannedCost"`
	Active             bool         `json:"active"`
	record.Meta
}

type ActivityCategory struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	IsDefault       bool     `json:"isDefault"`
	Active          bool     `json:"active"`
	ActivityTypeIDs []string `json:"activityTypeIds"`
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
	ParentAttributeID string        `json:"parentAttributeId"`
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
	ParentOptionIDs []string `json:"parentOptionIds"`
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
	RateChangedAt time.Time   `json:"rateChangedAt,omitzero"`
	RateChangedBy actor.Actor `json:"rateChangedBy,omitzero"`
	Active        bool        `json:"active"`
	record.Meta
}

type RateSource string

const (
	RateManual     RateSource = "manual"
	RateGSAPImport RateSource = "gsapImport"
)

// ExchangeRate is units of the currency per 1 USD from its date on; USD has none (always 1).
type ExchangeRate struct {
	ID       string     `json:"id"`
	Currency string     `json:"currency"`
	Date     date.Date  `json:"date"`
	Rate     money.Rate `json:"rate"`
	Source   RateSource `json:"source"`
	ImportID string     `json:"importId"`
	record.Meta
}

type RateImport struct {
	ID        string     `json:"id"`
	FileName  string     `json:"fileName"`
	Feed      string     `json:"feed"`
	FirstDate *date.Date `json:"firstDate"`
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
	Text string `json:"text"`
	record.Meta
}

// FinanceBudget is created with its first item and never deleted on its own.
type FinanceBudget struct {
	ID   string `json:"id"`
	Year int    `json:"year"`
	Name string `json:"name"`
	record.Meta
}

type FinanceBudgetItem struct {
	ID       string `json:"id"`
	BudgetID string `json:"budgetId"`
	Name     string `json:"name"`
	Code     string `json:"code"`
	Active   bool   `json:"active"`
	record.Meta
}
