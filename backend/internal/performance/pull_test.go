package performance_test

import (
	"errors"
	"net/http"
	"testing"

	"mapp/internal/performance"
	"mapp/internal/performance/simulatedfeed"
	"mapp/internal/platform/errs"
)

func TestPullFeed_WithoutMappingsIsRefusedLikeAnUnreadableUpload_FR010_046C17(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.service.UseFeed(simulatedfeed.New(46))
	source, err := f.service.CreateSource(t.Context(), alex, performance.SourceInput{
		Name: "Eloqua feed", OwnerID: alex.ID, Category: performance.CategoryMarketingAutomation,
		DeliveryRoute: performance.RouteSimulated, Cadence: performance.CadenceDaily,
	})
	if err != nil {
		t.Fatalf("CreateSource: %v", err)
	}

	_, err = f.service.PullFeed(t.Context(), alex, source.ID)

	var refusal *errs.Error
	if !errors.As(err, &refusal) || refusal.Status != http.StatusBadRequest || refusal.Code != "validation_failed" {
		t.Fatalf("PullFeed without mappings = %v, want 400 validation_failed", err)
	}
	if len(refusal.Fields) != 1 || refusal.Fields[0].Message == "" {
		t.Errorf("refusal fields = %+v, want one field naming why the feed can't be read", refusal.Fields)
	}
	loads, err := f.service.Imports(t.Context(), alex, performance.ImportFilter{SourceID: source.ID, Limit: 10})
	if err != nil || len(loads) != 0 {
		t.Errorf("loads after the refused pull = %d (%v), want none stored", len(loads), err)
	}
}
