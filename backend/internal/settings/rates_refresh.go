package settings

import (
	"context"
	"log/slog"
	"slices"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

// RateRefreshEvery is how often the simulated GSAP rate feed refreshes on its own (demo feedback #10).
const RateRefreshEvery = 15 * time.Minute

const (
	simulatedFeedName = "gsapSimulatedRefresh"
	refreshSource     = "Simulated GSAP rate refresh"
	driftSteps        = 11
	driftBasePermille = 995
)

// RefreshRates is the simulated GSAP's intraday feed: today's rate of every active currency moves by up to
// half a percent, deterministically for the quarter hour, and is saved through the same rules as a file import.
func (s *Service) RefreshRates(ctx context.Context, a actor.Actor) (RateImportView, error) {
	var rows []FeedRow
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		var err error
		rows, err = s.simulatedRows(ctx)
		return err
	})
	if err != nil {
		return RateImportView{}, err
	}
	return s.ApplyRateRows(ctx, a, simulatedFeedName, refreshSource, rows)
}

func (s *Service) simulatedRows(ctx context.Context) ([]FeedRow, error) {
	currencies, err := s.currenciesWithRates(ctx)
	if err != nil {
		return nil, err
	}
	slices.SortStableFunc(currencies, compareCurrencies)
	slot := int(s.now().Unix() / int64(RateRefreshEvery/time.Second))
	day := s.today().String()
	var rows []FeedRow
	for _, c := range currencies {
		if !c.Active || c.Code == money.BaseCurrency || c.Rate.Micros() <= 0 {
			continue
		}
		permille := int64(driftBasePermille + (slot*7+len(rows)*3)%driftSteps)
		if permille == 1000 {
			permille++
		}
		moved := money.RateFromMicros((c.Rate.Micros()*permille + 500) / 1000)
		rows = append(rows, FeedRow{Row: len(rows) + 1, RateType: sampleRateType, From: money.BaseCurrency, To: c.Code,
			ValidFrom: day, Rate: moved.String()})
	}
	return rows, nil
}

// KeepRatesFresh refreshes the rates every RateRefreshEvery until ctx ends; a failed refresh is logged and the
// next one tries again.
func (s *Service) KeepRatesFresh(ctx context.Context) {
	ticker := time.NewTicker(RateRefreshEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if _, err := s.RefreshRates(ctx, actor.System); err != nil {
				slog.WarnContext(ctx, "rate refresh failed", "error", err)
			}
		}
	}
}

// ratesAsOf is when the rates were last refreshed or imported: the newest import record, nil without one.
func (s *Service) ratesAsOf(ctx context.Context) (*time.Time, error) {
	imports, err := s.repo.ListRateImports(ctx)
	if err != nil || len(imports) == 0 {
		return nil, err
	}
	newest := slices.MaxFunc(imports, func(x, y RateImport) int { return x.CreatedAt.Compare(y.CreatedAt) }).CreatedAt
	return &newest, nil
}
