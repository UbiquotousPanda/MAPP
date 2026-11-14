package attribution

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

const (
	dealsPageSize = 25

	JourneyNone         = "none"
	JourneyShared       = "shared"
	JourneyUnattributed = "unattributed"

	ReasonNoData      = "noData"
	ReasonNotApproved = "notApproved"
)

// ActivityName is what the panel says about an activity in the viewer's scope; Status is the activity's own.
type ActivityName struct {
	ID       string
	Name     string
	Status   string
	PlanID   string
	PlanName string
}

// DealStore adds to the fact reads the names of activities in scope and the held facts around a deal.
type DealStore interface {
	FactStore
	ActivitiesInScope(ctx context.Context, scope authz.Scope, ids []string) ([]ActivityName, error)
	HeldFacts(ctx context.Context, scope authz.Scope, activityID string, journeyRefs []string) (int, error)
}

// Displays resolves the display currency as the report frame does: the code when active, else the person's.
type Displays interface {
	Display(ctx context.Context, a actor.Actor, code string) (money.Display, error)
}

// DealsQuery is one panel read; Year 0 is this year, Currency "" the person's, Compare "" no comparison and
// Page 0 every deal at once (the export).
type DealsQuery struct {
	ActivityID string
	Year       int
	Currency   string
	Compare    Model
	Page       int
}

type DealActivity struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	PlanID   string `json:"planId"`
	PlanName string `json:"planName"`
}

type DealStep struct {
	Activity        DealActivity `json:"activity"`
	Date            date.Date    `json:"date"`
	Kinds           []string     `json:"kinds"`
	Share           money.Money  `json:"share"`
	ComparisonShare *money.Money `json:"comparisonShare"`
	ThisActivity    bool         `json:"thisActivity"`
}

type Deal struct {
	ID              string       `json:"id"`
	Source          string       `json:"source"`
	Reference       string       `json:"reference"`
	Date            date.Date    `json:"date"`
	BookedOn        DealActivity `json:"bookedOn"`
	Amount          money.Money  `json:"amount"`
	USD             money.Money  `json:"usd"`
	Rate            *string      `json:"rate"`
	Journey         string       `json:"journey"`
	Steps           []DealStep   `json:"steps"`
	Share           money.Money  `json:"share"`
	ComparisonShare *money.Money `json:"comparisonShare"`
}

type ActivityDeals struct {
	Activity           DealActivity `json:"activity"`
	Year               int          `json:"year"`
	Model              ModelChoice  `json:"model"`
	Comparison         *ModelChoice `json:"comparison"`
	Credited           money.Money  `json:"credited"`
	ComparisonCredited *money.Money `json:"comparisonCredited"`
	Booked             *money.Money `json:"booked"`
	Reason             string       `json:"reason"`
	HeldFacts          int          `json:"heldFacts"`
	WithoutRate        int          `json:"withoutRate"`
	Total              int          `json:"total"`
	Page               int          `json:"page"`
	Size               int          `json:"size"`
	Deals              []Deal       `json:"deals"`
}
