// Package ranking builds the ranked list reports share: a level's records ranked by a figure, grouped, drilled and
// paged, each with its children one level down. Each report supplies its own figures.
package ranking

import "mapp/internal/allwork"

type Entry[F any] struct {
	ID       string         `json:"id"`
	Level    string         `json:"level"`
	Name     string         `json:"name"`
	PlanID   string         `json:"planId"`
	Owner    *allwork.Owner `json:"owner,omitempty"`
	Figures  F              `json:"figures"`
	Children []Entry[F]     `json:"children,omitempty"`
}

type Group[F any] struct {
	Key     string     `json:"key"`
	Label   string     `json:"label"`
	Totals  F          `json:"totals"`
	Entries []Entry[F] `json:"entries"`
}

type TrailStep struct {
	ID    string `json:"id"`
	Level string `json:"level"`
	Name  string `json:"name"`
}

type List[F any] struct {
	Level     string      `json:"level"`
	Sort      string      `json:"sort"`
	Order     string      `json:"order"`
	Group     string      `json:"group"`
	Page      int         `json:"page"`
	Size      int         `json:"size"`
	Total     int         `json:"total"`
	Totals    F           `json:"totals"`
	Trail     []TrailStep `json:"trail"`
	Groups    []Group[F]  `json:"groups"`
	DrillLost bool        `json:"drillLost"`
}
