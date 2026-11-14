package architecture

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
)

// What only the composition root may name: a module takes another's behaviour as an interface it declares.
var builtByTheWiring = []string{"Service", "Handler", "PostgresStore", "NewService", "NewHandler", "NewPostgresStore"}

func TestOnlyTheWiringBuildsModules(t *testing.T) {
	t.Parallel()
	err := filepath.WalkDir(filepath.Join(root, modulesFolder), func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !isProductionFile(path) || strings.Contains(path, "sqlcdb") {
			return err
		}
		return checkWiringNames(t, path)
	})
	if err != nil {
		t.Fatalf("read the modules: %v", err)
	}
}

func checkWiringNames(t *testing.T, path string) error {
	t.Helper()
	file, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
	if err != nil {
		return err
	}
	others := otherModulesImported(file, moduleOf(root, path))
	ast.Inspect(file, func(n ast.Node) bool {
		selector, ok := n.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		if pkg, ok := selector.X.(*ast.Ident); ok && others[pkg.Name] &&
			slices.Contains(builtByTheWiring, selector.Sel.Name) {
			t.Errorf("%s names %s.%s: declare the interface this module needs, and let internal/app fill it",
				path, pkg.Name, selector.Sel.Name)
		}
		return true
	})
	return nil
}

func otherModulesImported(file *ast.File, self string) map[string]bool {
	others := map[string]bool{}
	for _, spec := range file.Imports {
		path, _ := strconv.Unquote(spec.Path.Value)
		name, ok := strings.CutPrefix(path, modulePrefix+modulesFolder+"/")
		if !ok || strings.Contains(name, "/") || name == self {
			continue
		}
		if spec.Name != nil {
			name = spec.Name.Name
		}
		others[name] = true
	}
	return others
}
