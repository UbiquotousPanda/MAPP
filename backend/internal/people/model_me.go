package people

import (
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
)

type CurrentUser struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	FirstName   string          `json:"firstName"`
	Email       string          `json:"email"`
	JobTitle    string          `json:"jobTitle"`
	Initials    string          `json:"initials"`
	Preferences PreferencesView `json:"preferences"`
	Version     int             `json:"version"`
	Teams       []TeamRef       `json:"teams"`
	// Access is nil only while access control is not wired (package tests).
	Access *authz.MyAccess `json:"access,omitempty"`
	Today  date.Date       `json:"today"`
}

type DemoPerson struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	JobTitle string `json:"jobTitle"`
	Initials string `json:"initials"`
}

type PreferencesView struct {
	Theme                string   `json:"theme"`
	SidebarCollapsed     bool     `json:"sidebarCollapsed"`
	DisplayCurrency      string   `json:"displayCurrency"`
	DateFormat           string   `json:"dateFormat"`
	HomeScope            string   `json:"homeScope"`
	HistoryIncludeInside bool     `json:"historyIncludeInside"`
	PinnedPlanIDs        []string `json:"pinnedPlanIds"`
}

type PreferencesUpdate struct {
	Theme            *string `json:"theme"`
	SidebarCollapsed *bool   `json:"sidebarCollapsed"`
	DisplayCurrency  *string `json:"displayCurrency"`
	DateFormat       *string `json:"dateFormat"`
	HomeScope        *string `json:"homeScope"`
	// HistoryIncludeInside is saved only when it changes, and not logged.
	HistoryIncludeInside *bool `json:"historyIncludeInside"`
	// PinnedPlanIDs drops duplicates keeping the order pinned; each id matches ^P-\d+$, at most 100.
	PinnedPlanIDs *[]string `json:"pinnedPlanIds"`
}

func (p Person) currentUser(prefs Preferences, teams []TeamRef) CurrentUser {
	return CurrentUser{
		ID:          p.ID,
		Name:        p.Name,
		FirstName:   p.FirstName(),
		Email:       p.Email,
		JobTitle:    p.JobTitle,
		Initials:    p.Initials(),
		Preferences: prefs.view(),
		Version:     p.Version,
		Teams:       teams,
	}
}

func (p Person) demoPerson() DemoPerson {
	return DemoPerson{ID: p.ID, Name: p.Name, Email: p.Email, JobTitle: p.JobTitle, Initials: p.Initials()}
}

func (p Preferences) view() PreferencesView {
	homeScope := p.HomeScope
	if homeScope == "" {
		homeScope = HomeScopeMyTeams
	}
	pinned := p.PinnedPlanIDs
	if pinned == nil {
		pinned = []string{}
	}
	return PreferencesView{Theme: p.Theme, SidebarCollapsed: p.SidebarCollapsed,
		DisplayCurrency: p.DisplayCurrency, DateFormat: p.DateFormat, HomeScope: homeScope,
		HistoryIncludeInside: p.HistoryIncludeInside, PinnedPlanIDs: pinned}
}

type ProfileUpdate struct {
	Name     string `json:"name"`
	JobTitle string `json:"jobTitle"`
	Version  *int   `json:"version"`
}

type DisplayCurrencyOption struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Active bool   `json:"active"` // false only for the person's current one after it was set inactive
}

type DisplayCurrencyPage struct {
	Items []DisplayCurrencyOption `json:"items"`
	Total int                     `json:"total"`
}

// DisplayRate is in units per 1 USD as decimal text ("0.92"; "1" for USD), for other areas to convert USD amounts.
type DisplayRate struct {
	Code string
	Rate string
}
