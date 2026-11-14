package architecture

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

const (
	migrationsFolder = "../platform/database/migrations"
	kernelQueries    = "../platform/database/queries"
)

var (
	createdTable  = regexp.MustCompile(`\bcreate table (?:if not exists )?([a-z_][a-z0-9_]*)`)
	droppedTable  = regexp.MustCompile(`\bdrop table (?:if exists )?([a-z_][a-z0-9_]*)`)
	createdObject = regexp.MustCompile(`\bcreate (?:or replace )?(?:view|function) ([a-z_][a-z0-9_]*)`)
	sqlComment    = regexp.MustCompile(`--[^\n]*`)
	// An identifier after a dot is a column of an alias, never a table.
	identifier = regexp.MustCompile(`(?:^|[^.\w])([a-z_][a-z0-9_]*)\b`)
)

type schema struct {
	tables, objects []string
}

func TestEveryTableHasOneOwner(t *testing.T) {
	t.Parallel()
	s := readSchema(t)
	for _, table := range s.tables {
		if owner, ok := tableOwners[table]; !ok || !isOwner(owner) {
			t.Errorf("table %s has no owning module: add it to tableOwners in tables.go", table)
		}
	}
	for table := range tableOwners {
		if !slices.Contains(s.tables, table) {
			t.Errorf("tableOwners in tables.go names %s, which no migration creates: remove it", table)
		}
	}
}

func TestEveryViewAndFunctionIsPublished(t *testing.T) {
	t.Parallel()
	s := readSchema(t)
	for _, object := range s.objects {
		if owner, ok := published[object]; !ok || !isOwner(owner) {
			t.Errorf("view or function %s has no publishing module: add it to published in tables.go", object)
		}
	}
	for object := range published {
		if !slices.Contains(s.objects, object) {
			t.Errorf("published in tables.go names %s, which no migration creates: remove it", object)
		}
	}
}

func TestQueriesReadOnlyTheirModulesTables(t *testing.T) {
	t.Parallel()
	used := map[string][]string{}
	for module, sql := range queriesByModule(t) {
		for _, table := range referencedTables(sql) {
			owner := tableOwners[table]
			switch {
			case owner == module:
			case slices.Contains(sqlExceptions[module], table):
				used[module] = append(used[module], table)
			default:
				t.Errorf("the queries of %s read %s, which %s owns: read a view or function %s publishes instead",
					module, table, owner, owner)
			}
		}
	}
	reportUnused(t, "sqlExceptions", sqlExceptions, used)
}

func isOwner(name string) bool {
	return isModule(name) || isKernel(name)
}

func readSchema(t *testing.T) schema {
	t.Helper()
	sql := readSQL(t, filepath.Join(migrationsFolder, "*.sql"))
	dropped := matches(droppedTable, sql)
	var s schema
	for _, table := range matches(createdTable, sql) {
		if !slices.Contains(dropped, table) {
			s.tables = append(s.tables, table)
		}
	}
	s.objects = matches(createdObject, sql)
	if len(s.tables) == 0 {
		t.Fatal("no tables found: the test is reading the wrong migrations folder")
	}
	return s
}

func queriesByModule(t *testing.T) map[string]string {
	t.Helper()
	byModule := map[string]string{kernel[0]: readSQL(t, filepath.Join(kernelQueries, "*.sql"))}
	folders, err := filepath.Glob(filepath.Join(root, modulesFolder, "*", "internal", "queries"))
	if err != nil || len(folders) == 0 {
		t.Fatalf("no module query folders found: %v", err)
	}
	for _, folder := range folders {
		module := filepath.Base(filepath.Dir(filepath.Dir(folder)))
		byModule[module] = readSQL(t, filepath.Join(folder, "*.sql"))
	}
	return byModule
}

func referencedTables(sql string) []string {
	var tables []string
	for _, name := range matches(identifier, sql) {
		if _, ok := tableOwners[name]; ok && !slices.Contains(tables, name) {
			tables = append(tables, name)
		}
	}
	return tables
}

// readSQL joins the files the pattern matches, lower-cased and without comments.
func readSQL(t *testing.T, pattern string) string {
	t.Helper()
	files, err := filepath.Glob(pattern)
	if err != nil {
		t.Fatalf("list %s: %v", pattern, err)
	}
	var sql strings.Builder
	for _, file := range files {
		content, err := os.ReadFile(file) //nolint:gosec // G304: the repository's own migrations and queries
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		sql.WriteString(sqlComment.ReplaceAllString(strings.ToLower(string(content)), ""))
		sql.WriteString("\n")
	}
	return sql.String()
}

func matches(pattern *regexp.Regexp, sql string) []string {
	var names []string
	for _, m := range pattern.FindAllStringSubmatch(sql, -1) {
		if !slices.Contains(names, m[1]) {
			names = append(names, m[1])
		}
	}
	return names
}
