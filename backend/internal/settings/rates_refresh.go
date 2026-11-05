package settings

import (
	"context"
	"fmt"
	"hash/fnv"
	"strconv"
	"strings"
	"sync"
	"time"

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

// rateClock is when the simulated GSAP rates were last refreshed, and the rate each refresh moves from: the
// last one that didn't come from a refresh, so the rates stay near it all day instead of wandering.
type rateClock struct {
	mu    sync.Mutex
	at    time.Time
	bases map[string]money.Rate
}

func (c *rateClock) set(at time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.at = at
}

func (c *rateClock) withBases(infos []RateInfo) []RateInfo {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.bases == nil {
		c.bases = map[string]money.Rate{}
	}
	based := make([]RateInfo, len(infos))
	for i, info := range infos {
		base, known := c.bases[info.Currency]
		if !refreshed(info) || !known {
			base = info.Rate
			c.bases[info.Currency] = base
		}
		info.Rate = base
		based[i] = info
	}
	return based
}

func refreshed(info RateInfo) bool {
	return info.ImportFileName != nil && strings.HasPrefix(*info.ImportFileName, strings.TrimSuffix(refreshSourceFormat, "%s"))
}

func (c *rateClock) get() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.at
}

// RefreshRates fetches fresh rates from the simulated GSAP feed and saves them as today's rates with the same
// rules as a rate file import. It answers the current rates with the new "as of" time.
func (s *Service) RefreshRates(ctx context.Context, a actor.Actor) (CurrentRatePage, error) {
	infos, err := s.CurrentRates(ctx)
	if err != nil {
		return CurrentRatePage{}, err
	}
	at := s.now()
	if rows := simulatedRows(s.asOf.withBases(infos), date.Today(at), at); len(rows) > 0 {
		source := fmt.Sprintf(refreshSourceFormat, at.UTC().Format("15:04"))
		if _, err := s.ApplyRateRows(ctx, a, simulatedFeedName, source, rows); err != nil {
			return CurrentRatePage{}, err
		}
	}
	s.asOf.set(at)
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
