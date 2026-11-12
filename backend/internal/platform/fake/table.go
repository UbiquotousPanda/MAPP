package fake

import (
	"cmp"
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"slices"
	"strings"
	"sync"
)

// Table holds the records of one type by id. Records are kept encoded, so a caller never shares memory with
// what is stored, as with rows read from a database.
type Table[T any] struct {
	db    *DB
	name  string
	idOf  func(T) string
	mu    sync.Mutex
	rows  map[string][]byte
	rules rules[T]
	// probes holds each row decoded once, for Where's filter only; callers always get a fresh copy.
	probes map[string]probe[T]
}

type probe[T any] struct {
	data   []byte
	record T
}

// TableOf returns db's table name, made on first use: fakes built on one DB share it.
func TableOf[T any](db *DB, name string, idOf func(T) string) *Table[T] {
	db.tablesMu.Lock()
	defer db.tablesMu.Unlock()
	if existing, found := db.tables[name]; found {
		t, ok := existing.(*Table[T])
		if !ok {
			panic(fmt.Sprintf("fake: table %s holds %T", name, existing))
		}
		return t
	}
	t := &Table[T]{db: db, name: name, idOf: idOf, rows: map[string][]byte{}}
	db.tables[name] = t
	return t
}

func (t *Table[T]) Get(id string) (T, bool, error) {
	t.mu.Lock()
	data, found := t.rows[id]
	t.mu.Unlock()
	var record T
	if !found {
		return record, false, nil
	}
	if err := decode(data, &record); err != nil {
		return record, false, err
	}
	return record, true, nil
}

// List returns every record ordered by id as PostgreSQL's ORDER BY length(id), id does; never nil.
func (t *Table[T]) List() ([]T, error) {
	return t.Where(func(T) bool { return true })
}

func (t *Table[T]) Where(keep func(T) bool) ([]T, error) {
	rows, err := t.snapshot()
	if err != nil {
		return nil, err
	}
	kept := []T{}
	for _, p := range rows {
		if !keep(p.record) {
			continue
		}
		var record T
		if err := decode(p.data, &record); err != nil {
			return nil, err
		}
		kept = append(kept, record)
	}
	return kept, nil
}

// snapshot returns every row in id order, each decoded once per stored version for Where's filter.
func (t *Table[T]) snapshot() ([]probe[T], error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.probes == nil {
		t.probes = map[string]probe[T]{}
	}
	ids := slices.SortedFunc(maps.Keys(t.rows), byID)
	rows := make([]probe[T], len(ids))
	for i, id := range ids {
		p, ok := t.probes[id]
		if !ok || &p.data[0] != &t.rows[id][0] {
			p = probe[T]{data: t.rows[id]}
			if err := decode(p.data, &p.record); err != nil {
				return nil, err
			}
			t.probes[id] = p
		}
		rows[i] = p
	}
	return rows, nil
}

func (t *Table[T]) Put(ctx context.Context, records ...T) error {
	keep, err := t.db.changing(ctx)
	if err != nil {
		return err
	}
	encoded := make([][]byte, len(records))
	for i, record := range records {
		if encoded[i], err = json.Marshal(record); err != nil {
			return fmt.Errorf("fake: encode %s: %w", t.idOf(record), err)
		}
	}
	t.mu.Lock()
	undo := make([]func(), len(records))
	for i, record := range records {
		undo[i] = t.set(keep, t.idOf(record), encoded[i])
	}
	t.mu.Unlock()
	if err := t.checkPut(ctx, records); err != nil {
		undoAll(undo)
		return err
	}
	return nil
}

// Delete removes the records with ids; an id without a record changes nothing.
func (t *Table[T]) Delete(ctx context.Context, ids ...string) error {
	keep, err := t.db.changing(ctx)
	if err != nil {
		return err
	}
	t.mu.Lock()
	undo := make([]func(), len(ids))
	for i, id := range ids {
		undo[i] = t.set(keep, id, nil)
	}
	t.mu.Unlock()
	if err := t.db.later(ctx, func() error { return t.db.restricted(t.name, ids) }); err != nil {
		undoAll(undo)
		return err
	}
	return nil
}

func undoAll(undo []func()) {
	for i := len(undo) - 1; i >= 0; i-- {
		undo[i]()
	}
}

func (t *Table[T]) set(keep func(undo func()), id string, data []byte) func() {
	old, existed := t.rows[id]
	undo := func() { t.restore(id, old, existed) }
	keep(undo)
	if data == nil {
		delete(t.rows, id)
	} else {
		t.rows[id] = data
	}
	return undo
}

func (t *Table[T]) restore(id string, old []byte, existed bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if existed {
		t.rows[id] = old
		return
	}
	delete(t.rows, id)
}

func (t *Table[T]) copyTo(db *DB) table {
	t.mu.Lock()
	defer t.mu.Unlock()
	return &Table[T]{db: db, name: t.name, idOf: t.idOf, rows: maps.Clone(t.rows), rules: t.rules.clone()}
}

func byID(a, b string) int {
	return cmp.Or(cmp.Compare(len(a), len(b)), strings.Compare(a, b))
}

func decode[T any](data []byte, record *T) error {
	if err := json.Unmarshal(data, record); err != nil {
		return fmt.Errorf("fake: decode %T: %w", *record, err)
	}
	return nil
}
