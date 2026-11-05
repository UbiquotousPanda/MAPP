package settings

import (
	"reflect"
	"testing"

	"mapp/internal/platform/errs"
)

func TestCheckStoredAttributes_RefusesAnInactiveOptionAlreadyThere_032_FR021_D404(t *testing.T) {
	t.Parallel()
	f, tf := newFormFixture(t)
	costCentre := tf.attribute(LevelActivity, "Cost centre").ID
	oldField, a := tf.attribute(LevelActivity, "Old field").ID, tf.option(LevelActivity, "Old field", "A")
	held := values(costCentre, `"`+tf.option(LevelActivity, "Cost centre", "GB01000105")+`"`, oldField, `"`+a+`"`)
	in := AttributeInput{Previous: held, Values: held}

	kept := f.check(t, LevelActivity, in)
	stored, err := f.service.CheckStoredAttributes(t.Context(), LevelActivity, in)
	if err != nil {
		t.Fatalf("CheckStoredAttributes: %v", err)
	}

	want := []errs.FieldError{{Field: "attributes." + costCentre, Message: "'GB01000105' is inactive — choose another option."}}
	if len(kept.Problems) != 0 || !reflect.DeepEqual(stored.Problems, want) {
		t.Errorf("a save found %+v; the stored check found %+v, want %+v (an inactive attribute keeps its value)",
			kept.Problems, stored.Problems, want)
	}
}
