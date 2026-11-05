package postinvestment

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
)

type Transactor interface {
	Read(ctx context.Context, fn func(ctx context.Context) error) error
	Write(ctx context.Context, fn func(ctx context.Context) error) error
}

// Store keeps the reviews; it does not filter by scope: the service keeps the reviews of activities in scope.
type Store interface {
	List(ctx context.Context, activityID string) ([]Review, error)
	Get(ctx context.Context, id string) (Review, bool, error)
	IDsOfActivity(ctx context.Context, activityID string) ([]string, error)
	Insert(ctx context.Context, r Review) error
	Update(ctx context.Context, r Review, previousVersion int) error
	Delete(ctx context.Context, id string) error
}

type Activities interface {
	// InScope answers the activities among ids that scope sees (activity_in_scope), by id.
	InScope(ctx context.Context, scope authz.Scope, ids []string) (map[string]Activity, error)
	Live(ctx context.Context, a actor.Actor, activityID string) (Live, error)
	KnownCurrency(ctx context.Context, code string) (bool, error)
}
