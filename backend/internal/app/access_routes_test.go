package app_test

import (
	"slices"
	"testing"

	"mapp/internal/access"
)

// Operations not served yet have their rule too, so they are protected the moment they are (D-301).
func TestEveryOperationHasAnAccessRule_SC001(t *testing.T) {
	t.Parallel()
	rules := access.RulePatterns()
	var inContract []string
	for _, op := range contractOperations(t) {
		inContract = append(inContract, op.route)
		if !slices.Contains(rules, op.route) {
			t.Errorf("the contract's operation %s has no access rule in access/routes.go", op.route)
		}
	}
	for _, route := range newApp(t, "local").Routes {
		if _, known := access.RuleFor(route); !known {
			t.Errorf("the API serves %s without an access rule", route)
		}
	}
	for _, pattern := range rules {
		if !slices.Contains(inContract, pattern) {
			t.Errorf("access/routes.go has a rule for %s, which is not an operation of the contract", pattern)
		}
	}
}

func TestPublicRules_OnlyTheSixWithoutSession_FR010(t *testing.T) {
	t.Parallel()
	var public []string
	for _, op := range contractOperations(t) {
		rule, _ := access.RuleFor(op.route)
		if (rule.Kind == access.Public) != !op.needsSession {
			t.Errorf("%s: rule %s, needs a session %v", op.route, rule.Kind, op.needsSession)
		}
		if rule.Kind == access.Public {
			public = append(public, op.route)
		}
		if (rule.Kind == access.Need || rule.Kind == access.InPlan) && rule.Permission == "" {
			t.Errorf("%s: a %s rule without a permission", op.route, rule.Kind)
		}
	}
	want := []string{"GET /healthz", "GET /readyz", "GET /api/v1/environment", "GET /api/v1/auth/demo-people",
		"POST /api/v1/auth/sign-in", "POST /api/v1/auth/sign-out"}
	if !slices.Equal(public, want) {
		t.Errorf("public operations = %q, want %q", public, want)
	}
}
