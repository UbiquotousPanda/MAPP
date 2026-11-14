package architecture

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
)

const root = ".."

func scanned(t *testing.T) []use {
	t.Helper()
	uses, err := scan(root, isProductionFile)
	if err != nil {
		t.Fatalf("read the import graph: %v", err)
	}
	if len(uses) == 0 {
		t.Fatal("no cross-module imports found: the scan is reading the wrong folder")
	}
	return uses
}

func TestEveryModuleIsDeclared(t *testing.T) {
	t.Parallel()
	seen := moduleFolders(t)
	for _, name := range seen {
		if !isModule(name) {
			t.Errorf("internal/%s is not in the module map: add it to modulemap.go with its tier", name)
		}
	}
	for name := range tiers {
		if !slices.Contains(seen, name) {
			t.Errorf("the module map declares %q, which has no folder of its own", name)
		}
	}
}

func moduleFolders(t *testing.T) []string {
	t.Helper()
	var seen []string
	for _, pattern := range []string{"*", filepath.Join(modulesFolder, "*")} {
		found, err := filepath.Glob(filepath.Join(root, pattern))
		if err != nil {
			t.Fatalf("list the packages under internal/: %v", err)
		}
		for _, path := range found {
			if isModuleFolder(path) {
				seen = append(seen, filepath.Base(path))
			}
		}
	}
	return seen
}

func isModuleFolder(path string) bool {
	name := filepath.Base(path)
	if name == "architecture" || name == modulesFolder || isKernel(name) || isWiring(name) {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func TestEveryCrossModuleImportIsDeclared(t *testing.T) {
	t.Parallel()
	actual := map[string][]string{}
	for _, u := range scanned(t) {
		if !isModule(u.from) || isKernel(u.to) || isWiring(u.to) {
			continue
		}
		if !isModule(u.to) {
			t.Errorf("%s uses internal/%s, which is not a module", u.file, u.to)
			continue
		}
		if !slices.Contains(edges[u.from], u.to) {
			t.Errorf("%s uses module %q, which %q does not declare: add it to edges in modulemap.go",
				u.file, u.to, u.from)
		}
		if !slices.Contains(actual[u.from], u.to) {
			actual[u.from] = append(actual[u.from], u.to)
		}
	}
	reportUnused(t, "edges", edges, actual)
}

func reportUnused(t *testing.T, name string, declared, actual map[string][]string) {
	t.Helper()
	for from, targets := range declared {
		for _, to := range targets {
			if !slices.Contains(actual[from], to) {
				t.Errorf("%s in internal/architecture says %q uses %q, but nothing does: remove it", name, from, to)
			}
		}
	}
}

func TestTheKernelKnowsNoModule(t *testing.T) {
	t.Parallel()
	for _, u := range scanned(t) {
		if isKernel(u.from) && (isModule(u.to) || isWiring(u.to)) {
			t.Errorf("%s uses internal/%s: the kernel is shared by every module, so it holds no business"+
				" rules and knows none of them", u.file, u.to)
		}
	}
}

func TestNoModuleUsesTheWiring(t *testing.T) {
	t.Parallel()
	for _, u := range scanned(t) {
		if isWiring(u.to) && isModule(u.from) {
			t.Errorf("%s uses internal/%s: a module takes what it needs as an interface it declares itself,"+
				" and internal/app wires it", u.file, u.to)
		}
	}
}

// A module using only lower tiers is what proves the graph can hold no cycle.
func TestModulesRespectTheirTiers(t *testing.T) {
	t.Parallel()
	for from, declared := range edges {
		for _, to := range declared {
			if tiers[from] <= tiers[to] {
				t.Errorf("%q (tier %d) uses %q (tier %d): a module uses lower tiers only, so recheck the"+
					" tiers in modulemap.go or turn the call around", from, tiers[from], to, tiers[to])
			}
		}
	}
}

func TestTiersAreTheLongestPath(t *testing.T) {
	t.Parallel()
	for name := range tiers {
		want := 0
		for _, to := range edges[name] {
			if tiers[to]+1 > want {
				want = tiers[to] + 1
			}
		}
		if tiers[name] != want {
			t.Errorf("%q is declared tier %d but its deepest dependency makes it tier %d", name, tiers[name], want)
		}
	}
}
