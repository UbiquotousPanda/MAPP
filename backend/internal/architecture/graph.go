package architecture

import (
	"fmt"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
)

const modulePrefix = `mapp/internal/`

// A module sits directly under internal/ until its own stage moves it, so both places are read.
const modulesFolder = "modules"

type use struct {
	from, to, file string
}

func moduleName(parts []string) string {
	if len(parts) > 0 && parts[0] != modulesFolder {
		return parts[0]
	}
	if len(parts) > 1 {
		return parts[1]
	}
	return ""
}

func scan(root string, keep func(path string) bool) ([]use, error) {
	var uses []use
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !keep(path) {
			return err
		}
		from := moduleOf(root, path)
		if from == "" {
			return nil
		}
		imports, err := importsOf(path)
		if err != nil {
			return err
		}
		uses = append(uses, crossings(from, path, imports)...)
		return nil
	})
	return uses, err
}

// Test files, fakes and test support are left out: they stand in for other modules on purpose.
func isProductionFile(path string) bool {
	folders := foldersOf(path)
	return isSource(path) && !slices.ContainsFunc(folders, isFake) &&
		!slices.ContainsFunc(folders, isTestSupport)
}

func isFakeFile(path string) bool {
	folders := foldersOf(path)
	return isSource(path) && slices.ContainsFunc(folders, isFake) &&
		!slices.ContainsFunc(folders, isTestSupport)
}

func isSource(path string) bool {
	return strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, "_test.go")
}

func foldersOf(path string) []string {
	return strings.Split(filepath.ToSlash(filepath.Dir(path)), "/")
}

func isTestSupport(folder string) bool {
	return slices.Contains(testSupport, folder)
}

func isFake(folder string) bool {
	return folder != fakeSuffix && strings.HasSuffix(folder, fakeSuffix)
}

func moduleOf(root, path string) string {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return ""
	}
	return moduleName(strings.Split(filepath.ToSlash(rel), "/"))
}

func crossings(from, file string, imports []string) []use {
	var uses []use
	for _, path := range imports {
		rest, ok := strings.CutPrefix(path, modulePrefix)
		if !ok {
			continue
		}
		if to := moduleName(strings.Split(rest, "/")); to != "" && to != from {
			uses = append(uses, use{from: from, to: to, file: file})
		}
	}
	return uses
}

func importsOf(path string) ([]string, error) {
	file, err := parser.ParseFile(token.NewFileSet(), path, nil, parser.ImportsOnly)
	if err != nil {
		return nil, fmt.Errorf("read imports of %s: %w", path, err)
	}
	paths := make([]string, 0, len(file.Imports))
	for _, spec := range file.Imports {
		quoted, err := strconv.Unquote(spec.Path.Value)
		if err != nil {
			return nil, fmt.Errorf("read import of %s: %w", path, err)
		}
		paths = append(paths, quoted)
	}
	return paths, nil
}

func isKernel(name string) bool {
	return slices.Contains(kernel, name)
}

func isWiring(name string) bool {
	return slices.Contains(wiringOnly, name)
}

func isModule(name string) bool {
	_, found := tiers[name]
	return found
}
