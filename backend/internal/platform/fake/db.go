// Package fake is the in-memory stand-in of the database for tests: transactions, tables of records and the
// readable-ID counters. Each business area's fake store is built on it; only tests and apitest import it.
package fake

import (
	"context"
	"errors"
	"sync"

	"mapp/internal/platform/memo"
)

var ErrReadOnly = errors.New("fake: data cannot be changed inside a Read")

type txKey struct{}

type tx struct {
	db       *DB
	readOnly bool
	mu       sync.Mutex
	undo     []func()
	deferred []func() error
}

// DB runs Writes one at a time, as database.DB does; a failed Write puts back everything it changed.
type DB struct {
	mu       sync.RWMutex
	tablesMu sync.Mutex
	tables   map[string]table
}

type table interface {
	copyTo(db *DB) table
	has(id string) bool
	referencing(parent, id string) (string, bool, error)
	encoded() [][]byte
}

func NewDB() *DB {
	return &DB{tables: map[string]table{}}
}

// Read keeps a memo as database.DB does; a Write keeps none, so no fake has to forget what a change outdates.
func (db *DB) Read(ctx context.Context, fn func(ctx context.Context) error) error {
	if _, joined := db.current(ctx); joined {
		return fn(ctx)
	}
	db.mu.RLock()
	defer db.mu.RUnlock()
	return fn(context.WithValue(memo.With(ctx), txKey{}, &tx{db: db, readOnly: true}))
}

func (db *DB) Write(ctx context.Context, fn func(ctx context.Context) error) error {
	if current, joined := db.current(ctx); joined {
		if current.readOnly {
			return ErrReadOnly
		}
		return fn(ctx)
	}
	db.mu.Lock()
	defer db.mu.Unlock()
	t := &tx{db: db}
	committed := false
	defer func() {
		if !committed {
			t.rollBack()
		}
	}()
	if err := fn(context.WithValue(ctx, txKey{}, t)); err != nil {
		return err
	}
	for _, check := range t.deferred {
		if err := check(); err != nil {
			return err
		}
	}
	committed = true
	return nil
}

func (db *DB) Copy() *DB {
	db.mu.RLock()
	defer db.mu.RUnlock()
	db.tablesMu.Lock()
	defer db.tablesMu.Unlock()
	copied := NewDB()
	for name, t := range db.tables {
		copied.tables[name] = t.copyTo(copied)
	}
	return copied
}

func (db *DB) current(ctx context.Context) (*tx, bool) {
	current, ok := ctx.Value(txKey{}).(*tx)
	return current, ok && current.db == db
}

// changing keeps nothing outside a transaction: such a change stands at once, as on a database connection.
func (db *DB) changing(ctx context.Context) (func(undo func()), error) {
	current, joined := db.current(ctx)
	switch {
	case !joined:
		return func(func()) {}, nil
	case current.readOnly:
		return nil, ErrReadOnly
	}
	return current.keep, nil
}

func (t *tx) keep(undo func()) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.undo = append(t.undo, undo)
}

func (t *tx) rollBack() {
	for i := len(t.undo) - 1; i >= 0; i-- {
		t.undo[i]()
	}
}

// later runs check when the Write commits, as PostgreSQL checks a deferred foreign key; outside a Write, at once.
func (db *DB) later(ctx context.Context, check func() error) error {
	current, joined := db.current(ctx)
	if !joined {
		return check()
	}
	current.mu.Lock()
	defer current.mu.Unlock()
	current.deferred = append(current.deferred, check)
	return nil
}

// Encoded is every row of the table name as JSON, for a fake reading another area's table; nil when none made it.
func (db *DB) Encoded(name string) [][]byte {
	db.tablesMu.Lock()
	t, found := db.tables[name]
	db.tablesMu.Unlock()
	if !found {
		return nil
	}
	return t.encoded()
}
