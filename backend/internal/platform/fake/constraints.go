package fake

import (
	"context"
	"fmt"
	"maps"
	"slices"
)

// ConstraintError is what a fake answers where PostgreSQL refuses a row; Name is the constraint's name.
type ConstraintError struct {
	Name string
}

func (e *ConstraintError) Error() string {
	return fmt.Sprintf("fake: the change violates constraint %s", e.Name)
}

type rules[T any] struct {
	checks   map[string]func(T) bool
	excludes map[string]func(a, b T) bool
	refs     map[string]reference[T]
}

type reference[T any] struct {
	parent string
	ref    func(T) string
}

func (r rules[T]) clone() rules[T] {
	return rules[T]{checks: maps.Clone(r.checks), excludes: maps.Clone(r.excludes), refs: maps.Clone(r.refs)}
}

// Check refuses a row for which ok is false, as a CHECK constraint does.
func (t *Table[T]) Check(name string, ok func(T) bool) *Table[T] {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.rules.checks == nil {
		t.rules.checks = map[string]func(T) bool{}
	}
	t.rules.checks[name] = ok
	return t
}

// Exclude refuses two different rows that clash, as a unique index or an EXCLUDE constraint does.
func (t *Table[T]) Exclude(name string, clash func(a, b T) bool) *Table[T] {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.rules.excludes == nil {
		t.rules.excludes = map[string]func(a, b T) bool{}
	}
	t.rules.excludes[name] = clash
	return t
}

// Unique refuses two rows with the same key; a row whose key is "" is not in the index, as in a partial one.
func (t *Table[T]) Unique(name string, key func(T) string) *Table[T] {
	return t.Exclude(name, func(a, b T) bool {
		k := key(a)
		return k != "" && k == key(b)
	})
}

// References refuses, when the change commits, a row whose ref names no row of the table parent, and deleting
// a parent row that a row still names: a foreign key ON DELETE RESTRICT. A ref of "" is NULL.
func (t *Table[T]) References(name, parent string, ref func(T) string) *Table[T] {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.rules.refs == nil {
		t.rules.refs = map[string]reference[T]{}
	}
	t.rules.refs[name] = reference[T]{parent: parent, ref: ref}
	return t
}

func (t *Table[T]) checkPut(ctx context.Context, records []T) error {
	t.mu.Lock()
	r := t.rules.clone()
	t.mu.Unlock()
	for _, name := range slices.Sorted(maps.Keys(r.checks)) {
		for _, record := range records {
			if !r.checks[name](record) {
				return &ConstraintError{Name: name}
			}
		}
	}
	if err := t.checkExcludes(r.excludes, records); err != nil {
		return err
	}
	for _, name := range slices.Sorted(maps.Keys(r.refs)) {
		fk := r.refs[name]
		ids := make([]string, 0, len(records))
		for _, record := range records {
			ids = append(ids, fk.ref(record))
		}
		if err := t.db.later(ctx, func() error { return t.db.parentsExist(name, fk.parent, ids) }); err != nil {
			return err
		}
	}
	return nil
}

func (t *Table[T]) checkExcludes(excludes map[string]func(a, b T) bool, records []T) error {
	if len(excludes) == 0 {
		return nil
	}
	rows, err := t.snapshot()
	if err != nil {
		return err
	}
	for _, name := range slices.Sorted(maps.Keys(excludes)) {
		for _, record := range records {
			id := t.idOf(record)
			for _, p := range rows {
				if t.idOf(p.record) != id && excludes[name](record, p.record) {
					return &ConstraintError{Name: name}
				}
			}
		}
	}
	return nil
}

func (t *Table[T]) has(id string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	_, found := t.rows[id]
	return found
}

// referencing answers the name of a foreign key of t from a row to parent's row id.
func (t *Table[T]) referencing(parent, id string) (string, bool, error) {
	t.mu.Lock()
	r := t.rules.clone()
	t.mu.Unlock()
	if len(r.refs) == 0 {
		return "", false, nil
	}
	rows, err := t.snapshot()
	if err != nil {
		return "", false, err
	}
	for _, name := range slices.Sorted(maps.Keys(r.refs)) {
		fk := r.refs[name]
		if fk.parent != parent {
			continue
		}
		for _, p := range rows {
			if fk.ref(p.record) == id {
				return name, true, nil
			}
		}
	}
	return "", false, nil
}

func (db *DB) parentsExist(name, parent string, ids []string) error {
	db.tablesMu.Lock()
	p, found := db.tables[parent]
	db.tablesMu.Unlock()
	if !found { // a DB whose fakes leave the parent table out checks nothing against it
		return nil
	}
	for _, id := range ids {
		if id != "" && !p.has(id) {
			return &ConstraintError{Name: name}
		}
	}
	return nil
}

// restricted refuses deleting the rows ids of the table parent while a row of any table still names one.
func (db *DB) restricted(parent string, ids []string) error {
	db.tablesMu.Lock()
	tables := slices.Collect(maps.Values(db.tables))
	db.tablesMu.Unlock()
	for _, id := range ids {
		for _, t := range tables {
			name, found, err := t.referencing(parent, id)
			if err != nil {
				return err
			}
			if found {
				return &ConstraintError{Name: name}
			}
		}
	}
	return nil
}

// LowerC lowers ASCII letters only, as PostgreSQL's lower(x COLLATE "C") does in the unique name indexes.
func LowerC(s string) string {
	b := []byte(s)
	for i, c := range b {
		if 'A' <= c && c <= 'Z' {
			b[i] = c + 'a' - 'A'
		}
	}
	return string(b)
}

func (t *Table[T]) encoded() [][]byte {
	t.mu.Lock()
	defer t.mu.Unlock()
	rows := make([][]byte, 0, len(t.rows))
	for _, id := range slices.SortedFunc(maps.Keys(t.rows), byID) {
		rows = append(rows, t.rows[id])
	}
	return rows
}
