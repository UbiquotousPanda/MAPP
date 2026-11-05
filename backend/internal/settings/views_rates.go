package settings

import (
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

// RateInfo is a currency's current rate and where it came from; RateDate and Source are null for USD.
type RateInfo struct {
	Currency       string      `json:"currency"`
	Rate           money.Rate  `json:"rate"`
	InverseRate    money.Rate  `json:"inverseRate"`
	RateDate       *date.Date  `json:"rateDate"`
	Source         *RateSource `json:"source"`
	ImportFileName *string     `json:"importFileName"`
}

type CurrentRatePage struct {
	Today date.Date  `json:"today"`
	AsOf  time.Time  `json:"asOf"` // the newest rate import or change, deletes included, or the last confirming refresh
	Items []RateInfo `json:"items"`
	Total int        `json:"total"`
}

type ExchangeRateView struct {
	ID             string     `json:"id"`
	Currency       string     `json:"currency"`
	Date           date.Date  `json:"date"`
	Rate           money.Rate `json:"rate"`
	InverseRate    money.Rate `json:"inverseRate"`
	Source         RateSource `json:"source"`
	ImportID       *string    `json:"importId"`
	ImportFileName *string    `json:"importFileName"`
	Current        bool       `json:"current"`
	Future         bool       `json:"future"`
	record.Meta
}

type ExchangeRatePage struct {
	Items   []ExchangeRateView `json:"items"`
	Total   int                `json:"total"`
	Current RateInfo           `json:"current"`
}

type RateInput struct {
	Date string `json:"date"`
	Rate string `json:"rate"`
}

type RateUpdate struct {
	Rate    string `json:"rate"`
	Version *int   `json:"version"`
}

type RateImportUpload struct {
	FileName string `json:"fileName"`
	Content  string `json:"content"`
}

type RateOutcome string

const (
	OutcomeAdd     RateOutcome = "add"
	OutcomeReplace RateOutcome = "replace"
	OutcomePresent RateOutcome = "present" // the same rate is stored already: skipped
	OutcomeNotUsed RateOutcome = "notUsed" // another rate type, not quoted from USD, USD itself, or a currency not set up
	OutcomeProblem RateOutcome = "problem"
)

type RateImportRow struct {
	Row          int         `json:"row"`
	Outcome      RateOutcome `json:"outcome"`
	Currency     *string     `json:"currency"`
	Date         *date.Date  `json:"date"`
	Rate         *money.Rate `json:"rate"`
	PreviousRate *money.Rate `json:"previousRate"`
	Message      *string     `json:"message"` // why a row is not used or has a problem; old → new for replace
}

type RateImportCounts struct {
	Add     int `json:"add"`
	Replace int `json:"replace"`
	Present int `json:"present"`
	NotUsed int `json:"notUsed"`
	Problem int `json:"problem"`
}

type RateImportCheck struct {
	FileName string           `json:"fileName"`
	Feed     string           `json:"feed"`
	Rows     []RateImportRow  `json:"rows"`
	Counts   RateImportCounts `json:"counts"`
}

type RateImportView struct {
	ID         string      `json:"id"`
	FileName   string      `json:"fileName"`
	Feed       string      `json:"feed"`
	FirstDate  *date.Date  `json:"firstDate"`
	LastDate   *date.Date  `json:"lastDate"`
	Added      int         `json:"added"`
	Replaced   int         `json:"replaced"`
	Unchanged  int         `json:"unchanged"`
	NotUsed    int         `json:"notUsed"`
	Problems   int         `json:"problems"`
	ImportedAt time.Time   `json:"importedAt"`
	ImportedBy actor.Actor `json:"importedBy"`
}

type RateImportPage struct {
	Items []RateImportView `json:"items"`
	Total int              `json:"total"`
}
