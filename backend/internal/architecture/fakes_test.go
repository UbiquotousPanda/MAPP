package architecture

import (
	"slices"
	"testing"
)

func TestFakesUseOnlyDeclaredModules(t *testing.T) {
	t.Parallel()
	uses, err := scan(root, isFakeFile)
	if err != nil {
		t.Fatalf("read the import graph of the fakes: %v", err)
	}
	if len(uses) == 0 {
		t.Fatal("no imports found in the fakes: the scan is reading the wrong folder")
	}
	actual := map[string][]string{}
	for _, u := range uses {
		if !isModule(u.from) || isKernel(u.to) || slices.Contains(edges[u.from], u.to) {
			continue
		}
		if !slices.Contains(fakeEdges[u.from], u.to) {
			t.Errorf("%s uses internal/%s, which neither edges nor fakeEdges in modulemap.go declare for %q",
				u.file, u.to, u.from)
		}
		actual[u.from] = append(actual[u.from], u.to)
	}
	reportUnused(t, "fakeEdges", fakeEdges, actual)
}
