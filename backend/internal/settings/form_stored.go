package settings

import (
	"context"
	"slices"

	"mapp/internal/platform/errs"
)

// CheckStoredAttributes is CheckAttributes for values a record holds: it also refuses inactive options a save leaves alone (032 D-404).
func (s *Service) CheckStoredAttributes(ctx context.Context, level Level, in AttributeInput) (AttributeResult, error) {
	var result AttributeResult
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		f, err := s.formOf(ctx, level)
		if err != nil {
			return err
		}
		result = f.check(in)
		result.Problems = append(result.Problems, f.inactiveOptions(result)...)
		return nil
	})
	return result, err
}

// inactiveOptions are the inactive options among the values kept; an inactive attribute keeps its value read-only.
func (f formData) inactiveOptions(result AttributeResult) []errs.FieldError {
	var problems []errs.FieldError
	for _, a := range f.attributes {
		field := "attributes." + a.ID
		listed := slices.ContainsFunc(result.Problems, func(p errs.FieldError) bool { return p.Field == field })
		if message := f.newInactiveOption(a, result.Values[a.ID], nil); a.Active && !listed && message != "" {
			problems = append(problems, errs.FieldError{Field: field, Message: message})
		}
	}
	return problems
}
