package purchaserequest

import (
	"context"
	"slices"
	"strconv"
	"strings"

	"mapp/internal/platform/errs"
	"mapp/internal/settings"
)

// checking is how strictly a check runs: strict refuses an inactive person, currency or option the purchase
// request already has, which a save accepts; stored ignores the asker's own view of a line item (D-404).
type checking struct {
	strict, stored bool
}

// moment is when the checks run; a decision leaves out the overspend gate, whose setting decides (037), and the workflow gate.
type moment struct {
	kind     RoundKind
	deciding bool
}

// verdict is what every check found, the two kinds of problem together: the save checks' and the gates'.
type verdict struct {
	pr     PurchaseRequest
	fields errs.Problems
	gates  []Problem
	facts  map[string]LineItemFacts
}

func (c *checker) mayKeep(value, stored string) bool {
	return !c.how.strict && value == stored
}

func (c *checker) checkValues(ctx context.Context, level settings.Level, in settings.AttributeInput) (settings.AttributeResult, error) {
	if c.how.strict {
		return c.s.deps.Attributes.CheckStored(ctx, level, in)
	}
	return c.s.deps.Attributes.Check(ctx, level, in)
}

func (s *Service) verify(ctx context.Context, pr PurchaseRequest, m moment) (verdict, error) {
	ck, err := s.check(ctx, inputOf(pr), pr, checking{strict: true, stored: true})
	if err != nil {
		return verdict{}, err
	}
	return s.verdictOf(ctx, ck, m)
}

// verdictOf adds the gates of m to the problems of ck, leaving out a gate that says what a field problem says.
func (s *Service) verdictOf(ctx context.Context, ck checked, m moment) (verdict, error) {
	gates, err := s.gates(ctx, ck.pr, ck.facts, m)
	if err != nil {
		return verdict{}, err
	}
	gates = slices.DeleteFunc(gates, func(g Problem) bool {
		return slices.ContainsFunc(ck.problems, func(f errs.FieldError) bool { return f.Message == g.Message })
	})
	return verdict{pr: ck.pr, fields: ck.problems, gates: gates, facts: ck.facts}, nil
}

func (s *Service) ensureReady(ctx context.Context, pr PurchaseRequest, m moment) error {
	v, err := s.verify(ctx, pr, m)
	if err != nil {
		return err
	}
	return v.refusal(m)
}

func (v verdict) passed() bool {
	return len(v.fields) == 0 && len(v.gates) == 0
}

// refusal is the 409 not_ready answer: field problems in fields, the gates grouped by record in missing; nil when all pass.
func (v verdict) refusal(m moment) error {
	if v.passed() {
		return nil
	}
	message := msgNotReady
	if m.deciding {
		message = msgNotReadyToApprove
	}
	return errs.NotReadyWithFields(message, v.fields, groupsOf(v.pr, v.gates, v.facts))
}

func (v verdict) problems() []Problem {
	list := make([]Problem, 0, len(v.fields)+len(v.gates))
	for _, f := range v.fields {
		list = append(list, fieldProblem(v.pr, f))
	}
	return append(list, v.gates...)
}

func fieldProblem(pr PurchaseRequest, f errs.FieldError) Problem {
	p := Problem{Field: f.Field, Group: groupPurchaseRequest, RecordID: pr.ID, Message: f.Message}
	n := lineNumberOf(f.Field)
	if n == 0 {
		return p
	}
	p.Group, p.RecordID = groupLine, ""
	if n <= len(pr.Lines) {
		p.RecordID = pr.Lines[n-1].ID
	}
	return p
}

func lineNumberOf(field string) int {
	rest, found := strings.CutPrefix(field, "lines[")
	if !found {
		return 0
	}
	index, _, _ := strings.Cut(rest, "]")
	n, err := strconv.Atoi(index)
	if err != nil {
		return 0
	}
	return n + 1
}
