// Package postinvestmenttest is the in-memory fake of the post-investment reviews store, refusing what
// PostgreSQL refuses: a second review of one activity and a save from an out-of-date version.
package postinvestmenttest

import (
	"cmp"
	"context"
	"fmt"
	"slices"

	"mapp/internal/platform/fake"
	"mapp/internal/postinvestment"
)

type Store struct {
	reviews *fake.Table[postinvestment.Review]
}

func NewStore(db *fake.DB) Store {
	return Store{reviews: fake.TableOf(db, "post_investment_reviews", func(r postinvestment.Review) string { return r.ID })}
}

func (s Store) List(_ context.Context, activityID string) ([]postinvestment.Review, error) {
	found, err := s.reviews.Where(func(r postinvestment.Review) bool { return activityID == "" || r.ActivityID == activityID })
	slices.SortStableFunc(found, func(a, b postinvestment.Review) int { return b.UpdatedAt.Compare(a.UpdatedAt) })
	return found, err
}

func (s Store) Get(_ context.Context, id string) (postinvestment.Review, bool, error) {
	return s.reviews.Get(id)
}

func (s Store) IDsOfActivity(_ context.Context, activityID string) ([]string, error) {
	found, err := s.reviews.Where(func(r postinvestment.Review) bool { return r.ActivityID == activityID })
	ids := make([]string, 0, len(found))
	for _, r := range found {
		ids = append(ids, r.ID)
	}
	slices.SortFunc(ids, func(a, b string) int { return cmp.Or(cmp.Compare(len(a), len(b)), cmp.Compare(a, b)) })
	return ids, err
}

func (s Store) Insert(ctx context.Context, r postinvestment.Review) error {
	taken, err := s.IDsOfActivity(ctx, r.ActivityID)
	if err != nil {
		return err
	}
	if len(taken) > 0 {
		return fmt.Errorf("postinvestmenttest: activity %s already has review %s", r.ActivityID, taken[0])
	}
	return s.reviews.Put(ctx, r)
}

func (s Store) Update(ctx context.Context, r postinvestment.Review, previousVersion int) error {
	stored, found, err := s.reviews.Get(r.ID)
	if err != nil {
		return err
	}
	if !found || stored.Version != previousVersion {
		return fmt.Errorf("postinvestmenttest: version %d of %s is no longer stored", previousVersion, r.ID)
	}
	return s.reviews.Put(ctx, r)
}

func (s Store) Delete(ctx context.Context, id string) error {
	return s.reviews.Delete(ctx, id)
}
