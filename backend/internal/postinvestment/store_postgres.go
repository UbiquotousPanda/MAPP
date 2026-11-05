package postinvestment

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/database"
	"mapp/internal/platform/database/sqlcdb"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

type PostgresStore struct {
	db *database.DB
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) List(ctx context.Context, activityID string) ([]Review, error) {
	var filter *string
	if activityID != "" {
		filter = &activityID
	}
	rows, err := s.db.Queries(ctx).ListPostInvestmentReviews(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("select post-investment reviews: %w", err)
	}
	reviews := make([]Review, 0, len(rows))
	for _, row := range rows {
		reviews = append(reviews, reviewOf(row))
	}
	return reviews, nil
}

func (s *PostgresStore) Get(ctx context.Context, id string) (Review, bool, error) {
	row, err := s.db.Queries(ctx).GetPostInvestmentReview(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Review{}, false, nil
	}
	if err != nil {
		return Review{}, false, fmt.Errorf("select post-investment review %s: %w", id, err)
	}
	return reviewOf(row), true, nil
}

func (s *PostgresStore) IDsOfActivity(ctx context.Context, activityID string) ([]string, error) {
	found, err := s.db.Queries(ctx).ListPostInvestmentReviewIDsOfActivity(ctx, activityID)
	if err != nil {
		return nil, fmt.Errorf("select post-investment reviews of activity %s: %w", activityID, err)
	}
	return found, nil
}

func (s *PostgresStore) Insert(ctx context.Context, r Review) error {
	byID, byName := submitter(r.SubmittedBy)
	err := s.db.Queries(ctx).InsertPostInvestmentReview(ctx, sqlcdb.InsertPostInvestmentReviewParams{
		ID: r.ID, ActivityID: r.ActivityID, Status: string(r.Status), BusinessCase: r.BusinessCase, Currency: r.Currency,
		AmountSpentMinor: centsOf(r.AmountSpent), MarginMinor: centsOf(r.Margin), Remarks: r.Remarks,
		SubmittedAt: r.SubmittedAt, SubmittedByID: byID, SubmittedByName: byName, Version: r.Version,
		CreatedAt: r.CreatedAt, CreatedByID: r.CreatedBy.ID, CreatedByName: r.CreatedBy.Name, UpdatedAt: r.UpdatedAt,
		UpdatedByID: r.UpdatedBy.ID, UpdatedByName: r.UpdatedBy.Name,
	})
	if err != nil {
		return fmt.Errorf("insert post-investment review %s: %w", r.ID, err)
	}
	return nil
}

func (s *PostgresStore) Update(ctx context.Context, r Review, previousVersion int) error {
	byID, byName := submitter(r.SubmittedBy)
	updated, err := s.db.Queries(ctx).UpdatePostInvestmentReview(ctx, sqlcdb.UpdatePostInvestmentReviewParams{
		ID: r.ID, Status: string(r.Status), BusinessCase: r.BusinessCase, Currency: r.Currency,
		AmountSpentMinor: centsOf(r.AmountSpent),
		MarginMinor:      centsOf(r.Margin), Remarks: r.Remarks, SubmittedAt: r.SubmittedAt, SubmittedByID: byID,
		SubmittedByName: byName, Version: r.Version, UpdatedAt: r.UpdatedAt, UpdatedByID: r.UpdatedBy.ID,
		UpdatedByName: r.UpdatedBy.Name, PreviousVersion: previousVersion,
	})
	if err != nil {
		return fmt.Errorf("update post-investment review %s: %w", r.ID, err)
	}
	if updated == 0 {
		return fmt.Errorf("update post-investment review %s: version %d is no longer stored", r.ID, previousVersion)
	}
	return nil
}

func (s *PostgresStore) Delete(ctx context.Context, id string) error {
	if err := s.db.Queries(ctx).DeletePostInvestmentReview(ctx, id); err != nil {
		return fmt.Errorf("delete post-investment review %s: %w", id, err)
	}
	return nil
}

func reviewOf(row sqlcdb.PostInvestmentReview) Review {
	r := Review{
		ID: row.ID, ActivityID: row.ActivityID, Status: Status(row.Status), BusinessCase: row.BusinessCase,
		Currency: row.Currency, AmountSpent: amountOf64(row.AmountSpentMinor), Margin: amountOf64(row.MarginMinor),
		Remarks: row.Remarks, SubmittedAt: row.SubmittedAt,
		Meta: record.Meta{
			Version: row.Version, CreatedAt: row.CreatedAt, CreatedBy: actor.Actor{ID: row.CreatedByID, Name: row.CreatedByName},
			UpdatedAt: row.UpdatedAt, UpdatedBy: actor.Actor{ID: row.UpdatedByID, Name: row.UpdatedByName},
		},
	}
	if row.SubmittedByID != nil && row.SubmittedByName != nil {
		r.SubmittedBy = &actor.Actor{ID: *row.SubmittedByID, Name: *row.SubmittedByName}
	}
	return r
}

func submitter(by *actor.Actor) (id, name *string) {
	if by == nil {
		return nil, nil
	}
	return &by.ID, &by.Name
}

func centsOf(a *money.Amount) *int64 {
	if a == nil {
		return nil
	}
	c := a.Cents()
	return &c
}

func amountOf64(cents *int64) *money.Amount {
	if cents == nil {
		return nil
	}
	a := money.FromCents(*cents)
	return &a
}
