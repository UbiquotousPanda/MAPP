package app

import (
	"sync"
	"testing"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/stores/storestest"
)

func TestRefreshRates_ATickRefreshesAndMovesAsOf_Issue183(t *testing.T) {
	t.Parallel()
	db, seeded := seededStore(t)
	var mu sync.Mutex
	at := seeded().Add(15 * time.Minute)
	now := func() time.Time {
		mu.Lock()
		defer mu.Unlock()
		return at
	}
	cfg, err := LoadConfig(func(string) string { return "" })
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	built, err := New(cfg, storestest.New(db), now)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	before, err := built.settings.ListCurrentRates(t.Context(), actor.System)
	if err != nil {
		t.Fatalf("ListCurrentRates: %v", err)
	}
	ticks := make(chan time.Time)
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		built.RefreshRates(t.Context(), ticks)
	}()
	mu.Lock()
	at = at.Add(time.Hour)
	mu.Unlock()

	ticks <- now()
	close(ticks)
	<-stopped

	after, err := built.settings.ListCurrentRates(t.Context(), actor.System)
	if err != nil || !after.AsOf.Equal(now()) || after.AsOf.Equal(before.AsOf) {
		t.Errorf("as of = %v (%v), want the tick's refresh at %v (was %v)", after.AsOf, err, now(), before.AsOf)
	}
}
