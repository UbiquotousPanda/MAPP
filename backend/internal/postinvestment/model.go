// Package postinvestment holds the post-investment review of an activity and its Post-investment ROI.
package postinvestment

import (
	"encoding/json"
	"time"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusSubmitted Status = "submitted"
)

// Review is the stored record. AmountSpent and Margin are in Currency; nil when not filled in.
type Review struct {
	ID           string        `json:"id"`
	ActivityID   string        `json:"activityId"`
	Status       Status        `json:"status"`
	BusinessCase string        `json:"businessCase"`
	Currency     string        `json:"currency"`
	AmountSpent  *money.Amount `json:"amountSpent"`
	Margin       *money.Amount `json:"margin"`
	Remarks      string        `json:"remarks"`
	SubmittedAt  *time.Time    `json:"submittedAt"`
	SubmittedBy  *actor.Actor  `json:"submittedBy"`
	record.Meta
}

type Activity struct {
	ID    string
	Name  string
	Path  []history.RecordRef
	Facts authz.ActivityFacts
}

// Live is the activity's money as the person reads it now: Figures is nil when they don't see its finance.
type Live struct {
	Currency string
	Figures  *Figures
}

type Figures struct {
	Budget    *money.Money `json:"budget"`
	Planned   *money.Money `json:"planned"`
	Committed money.Money  `json:"committed"`
	Actual    money.Money  `json:"actual"`
}

type ActivityRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// View is a review as the API answers it (contract PostInvestmentReview).
type View struct {
	ID           string              `json:"id"`
	Activity     ActivityRef         `json:"activity"`
	Path         []history.RecordRef `json:"path"`
	Status       Status              `json:"status"`
	BusinessCase string              `json:"businessCase"`
	AmountSpent  *money.Money        `json:"amountSpent"`
	Margin       *money.Money        `json:"margin"`
	ROI          *string             `json:"roi"`
	Remarks      string              `json:"remarks"`
	Figures      *Figures            `json:"figures"`
	SubmittedAt  *time.Time          `json:"submittedAt"`
	SubmittedBy  *actor.Actor        `json:"submittedBy"`
	Access       Access              `json:"access"`
	record.Meta
}

type Access struct {
	Edit   authz.Availability `json:"edit"`
	Submit authz.Availability `json:"submit"`
	Delete authz.Availability `json:"delete"`
	Export authz.Availability `json:"export"`
}

type List struct {
	Items  []View             `json:"items"`
	Export authz.Availability `json:"export"`
}

type CreateInput struct {
	ActivityID string `json:"activityId"`
}

// UpdateInput changes only the fields sent; AmountSpent and Margin are raw so that null clears them.
type UpdateInput struct {
	Version      *int            `json:"version"`
	BusinessCase *string         `json:"businessCase"`
	AmountSpent  json.RawMessage `json:"amountSpent"`
	Margin       json.RawMessage `json:"margin"`
	Remarks      *string         `json:"remarks"`
}

type SubmitInput struct {
	Version *int `json:"version"`
}

type File struct {
	Name        string
	ContentType string
	Body        []byte
}
