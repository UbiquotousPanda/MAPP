package postinvestment

import (
	"bytes"
	"context"
	"strings"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/deck"
	"mapp/internal/platform/money"
)

const (
	product         = "SP&A One"
	deckTitle       = "Post-investment reviews"
	reviewTitle     = "Post-investment review"
	contentTypePPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	notSet          = "Not filled in"
	pathSeparator   = " › "
	nameSeparator   = " – "
	dayLayout       = "2 Jan 2006"
)

// Export is one review as a one-slide PowerPoint file, its figures read now.
func (s *Service) Export(ctx context.Context, a actor.Actor, id string) (File, error) {
	if err := authz.Require(ctx, authz.DataExport); err != nil {
		return File{}, err
	}
	var file File
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		r, act, err := s.visible(ctx, id)
		if err != nil {
			return err
		}
		v, err := s.view(ctx, a, r, act)
		if err != nil {
			return err
		}
		file, err = s.render([]View{v}, []string{reviewTitle, v.Activity.Name})
		return err
	})
	return file, err
}

// ExportList is the reviews the list shows, one slide each.
func (s *Service) ExportList(ctx context.Context, a actor.Actor, activityID string) (File, error) {
	if err := authz.Require(ctx, authz.DataExport); err != nil {
		return File{}, err
	}
	var file File
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		views, err := s.visibleViews(ctx, a, activityID)
		if err != nil {
			return err
		}
		file, err = s.render(views, []string{deckTitle})
		return err
	})
	return file, err
}

// render names the file "SP&A One – <parts> – <day>".
func (s *Service) render(views []View, parts []string) (File, error) {
	now := s.now()
	d := deck.Deck{Title: deckTitle, Author: product, Created: now, Footer: product + nameSeparator + deckTitle}
	for _, v := range views {
		d.Pages = append(d.Pages, slideOf(v))
	}
	if len(d.Pages) == 0 {
		d.Pages = []deck.Page{{Title: deckTitle, Subtitle: "No post-investment reviews to show"}}
	}
	var buf bytes.Buffer
	if err := deck.WritePPTX(&buf, d); err != nil {
		return File{}, err
	}
	name := append(append([]string{product}, parts...), now.Format(dayLayout))
	fileName := safeName(strings.Join(name, nameSeparator))
	return File{Name: fileName + ".pptx", ContentType: contentTypePPTX, Body: buf.Bytes()}, nil
}

func slideOf(v View) deck.Page {
	roi := notSet
	if v.ROI != nil {
		roi = *v.ROI + " %"
	}
	page := deck.Page{
		Title: v.Activity.Name, Subtitle: pathText(v.Path) + " · " + statusText(v.Status),
		Cards: append(figureCards(v.Figures), deck.Card{Label: "Post-investment ROI", Value: roi,
			Note: "(margin − amount spent) ÷ amount spent", Problem: v.ROI != nil && strings.HasPrefix(*v.ROI, "-")}),
		Table: &deck.Table{
			Columns: []deck.Column{{Title: "Review", Weight: 1}, {Title: "", Weight: 3}},
			Rows: []deck.Row{
				{Cells: []string{"Business case", orNotSet(v.BusinessCase)}},
				{Cells: []string{"Amount spent", moneyText(v.AmountSpent)}},
				{Cells: []string{"Margin", moneyText(v.Margin)}},
			},
		},
		Notes: []string{"Remarks: " + orNotSet(v.Remarks)},
	}
	return page
}

func figureCards(f *Figures) []deck.Card {
	if f == nil {
		return []deck.Card{{Label: "Budget, planned, committed and actual", Value: "Not shown",
			Note: "Financial data of this plan isn't shown to you"}}
	}
	return []deck.Card{
		{Label: "Budget", Value: moneyText(f.Budget), Note: "The initiative's"},
		{Label: "Planned", Value: moneyText(f.Planned)},
		{Label: "Committed", Value: f.Committed.Format()},
		{Label: "Actual", Value: f.Actual.Format()},
	}
}

func pathText(path []history.RecordRef) string {
	names := make([]string, 0, len(path))
	for _, r := range path {
		names = append(names, r.Name)
	}
	return strings.Join(names, pathSeparator)
}

func statusText(s Status) string {
	if s == StatusSubmitted {
		return "Submitted"
	}
	return "Draft"
}

func moneyText(m *money.Money) string {
	if m == nil {
		return notSet
	}
	return m.Format()
}

func orNotSet(text string) string {
	if text == "" {
		return notSet
	}
	return text
}

// safeName leaves out the characters file systems refuse.
func safeName(name string) string {
	return strings.Map(func(r rune) rune {
		if strings.ContainsRune(`/\:*?"<>|`, r) {
			return '-'
		}
		return r
	}, name)
}
