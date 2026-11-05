package settings

import (
	"context"
	"fmt"
	"hash/fnv"
	"slices"
	"strconv"
	"sync"
	"time"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

const (
	simulatedFeedName   = "gsapSimulatedRefresh"
	refreshSourceFormat = "Simulated GSAP refresh %s"
	maxDriftBasisPoints = 50
	basisPointsPerUnit  = 10_000
)

// rateClock is when a refresh last found the stored rates current, and the newest rate change seen, deletes
// included, so "as of" never moves backwards.
type rateClock struct {
	mu      sync.Mutex
	at      time.Time
	changed time.Time
	seeded  bool
}

func (c *rateClock) confirm(at time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.at = at
}

func (c *rateClock) note(changed time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if changed.After(c.changed) {
		c.changed = changed
	}
}

func (c *rateClock) isSeeded() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.seeded
}

func (c *rateClock) seed(deleted time.Time) {
	c.note(deleted)
	c.mu.Lock()
	defer c.mu.Unlock()
	c.seeded = true
}

// asOf is the latest of changed, the newest change seen and the last confirming refresh; now when none.
func (c *rateClock) asOf(changed, now time.Time) time.Time {
	c.note(changed)
	c.mu.Lock()
	defer c.mu.Unlock()
	at := c.changed
	if c.at.After(at) {
		at = c.at
	}
	if at.IsZero() {
		return now
	}
	return at
}

func ratesChangedAt(book rateBook, imports []RateImport) time.Time {
	var at time.Time
	for _, i := range imports {
		if i.UpdatedAt.After(at) {
			at = i.UpdatedAt
		}
	}
	for _, rates := range book {
		for _, r := range rates {
			if r.UpdatedAt.After(at) {
				at = r.UpdatedAt
			}
		}
	}
	return at
}

func (s *Service) seedRateClock(ctx context.Context) error {
	if s.asOf.isSeeded() {
		return nil
	}
	entries, err := s.history.Entries(ctx)
	if err != nil {
		return err
	}
	var deleted time.Time
	for _, e := range entries {
		rates := e.RecordType == exchangeRateKind || e.RecordType == currencyKind
		if rates && e.Action == history.ActionDeleted && e.At.After(deleted) {
			deleted = e.At
		}
	}
	s.asOf.seed(deleted)
	return nil
}

func fileNames(imports []RateImport) map[string]string {
	names := make(map[string]string, len(imports))
	for _, i := range imports {
		names[i.ID] = i.FileName
	}
	return names
}

// refreshBases returns the rates a refresh moves from, the newest that didn't come from a refresh, and
// whether the current rates already came from a refresh in the minute of at.
func (s *Service) refreshBases(ctx context.Context, at time.Time) ([]RateInfo, bool, error) {
	var infos []RateInfo
	var repeat bool
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		currencies, err := s.repo.ListCurrencies(ctx)
		if err != nil {
			return err
		}
		slices.SortStableFunc(currencies, compareCurrencies)
		book, err := s.rateBook(ctx)
		if err != nil {
			return err
		}
		imports, err := s.repo.ListRateImports(ctx)
		if err != nil {
			return err
		}
		day, files := date.Today(at), fileNames(imports)
		var bases rateBook
		bases, repeat = withoutRefreshes(book, imports, day, at)
		infos = make([]RateInfo, 0, len(currencies))
		for _, c := range currencies {
			infos = append(infos, rateInfoOf(c, bases, day, files))
		}
		return nil
	})
	return infos, repeat, err
}

func withoutRefreshes(book rateBook, imports []RateImport, day date.Date, at time.Time) (rateBook, bool) {
	refreshes := map[string]time.Time{}
	for _, i := range imports {
		if i.Feed == simulatedFeedName {
			refreshes[i.ID] = i.CreatedAt
		}
	}
	bases, repeat := rateBook{}, false
	for code, rates := range book {
		current, _ := book.on(code, day)
		for _, r := range rates {
			if made, refreshed := refreshes[r.ImportID]; !refreshed {
				bases[code] = append(bases[code], r)
			} else if current.ID == r.ID && made.Unix()/60 == at.Unix()/60 {
				repeat = true
			}
		}
	}
	return bases, repeat
}

// RefreshRates saves the simulated GSAP rates as today's rates with the rules of a rate file import. They are
// fixed per minute, so a repeat within the minute saves nothing and only moves "as of".
func (s *Service) RefreshRates(ctx context.Context, a actor.Actor) (CurrentRatePage, error) {
	at := s.now()
	infos, repeat, err := s.refreshBases(ctx, at)
	if err != nil {
		return CurrentRatePage{}, err
	}
	if !repeat {
		rows := simulatedRows(infos, date.Today(at), at)
		source := fmt.Sprintf(refreshSourceFormat, at.UTC().Format("15:04"))
		saved, err := s.saveRateRows(ctx, a, feedRows{feed: simulatedFeedName, source: source, rows: rows})
		if err != nil {
			return CurrentRatePage{}, err
		}
		repeat = saved.ID == ""
	}
	if repeat {
		s.asOf.confirm(at)
	}
	return s.ListCurrentRates(ctx, a)
}

// simulatedRows moves every rate by up to half a percent, the same way for the same minute, so a refresh
// always changes the rates the demo shows and a repeated call in one minute changes nothing more.
func simulatedRows(infos []RateInfo, day date.Date, at time.Time) []FeedRow {
	minute := strconv.FormatInt(at.Unix()/60, 10)
	var rows []FeedRow
	for _, info := range infos {
		if info.RateDate == nil {
			continue
		}
		micros := info.Rate.Micros()
		moved := micros + micros*driftBasisPoints(info.Currency+minute)/basisPointsPerUnit
		if moved < 1 || moved == micros {
			continue
		}
		rows = append(rows, FeedRow{
			Row: len(rows) + 1, RateType: sampleRateType, From: money.BaseCurrency, To: info.Currency,
			ValidFrom: day.String(), Rate: money.RateFromMicros(moved).String(),
		})
	}
	return rows
}

func driftBasisPoints(seed string) int64 {
	hash := fnv.New32a()
	_, _ = hash.Write([]byte(seed))
	drift := int64(hash.Sum32()%(2*maxDriftBasisPoints+1)) - maxDriftBasisPoints
	if drift == 0 {
		return 1
	}
	return drift
}
