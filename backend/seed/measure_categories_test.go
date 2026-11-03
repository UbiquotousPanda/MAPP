package seed_test

import (
	"context"
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/platform/fake"
	"mapp/internal/settings"
	"mapp/internal/settings/settingstest"
)

const uncategorisedType = "MOBILITY – Long-term contract"

type namedRef struct{ ID, Name string }

type categoryAnswer struct {
	Items []struct {
		Name          string
		IsDefault     bool
		ActivityTypes []namedRef
	}
}

// The Measure demo puts the demo's types in three categories, Digital the default, and one in none (047 T062).
func TestLoad_MeasureCategoriesGroupTheDemoTypes_047C7(t *testing.T) {
	t.Parallel()
	var plain, measured categoryAnswer
	apitest.New(t).SignIn(t, "priya.raman@shell.com").Do(t, http.MethodGet, "/api/v1/settings/activity-categories", nil).
		Decode(t, &plain)
	priya := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, "priya.raman@shell.com")
	priya.Do(t, http.MethodGet, "/api/v1/settings/activity-categories", nil).Decode(t, &measured)
	var types struct{ Items []namedRef }
	priya.Do(t, http.MethodGet, "/api/v1/activity-types", nil).Decode(t, &types)

	if len(plain.Items) != 0 {
		t.Errorf("the plain seed has %d activity categories, want none", len(plain.Items))
	}
	names, defaults, grouped := measured.summary()
	if want := []string{"Content and creative", "Digital", "Events and sponsorship"}; !slices.Equal(names, want) {
		t.Errorf("categories = %v, want %v", names, want)
	}
	if !slices.Equal(defaults, []string{"Digital"}) {
		t.Errorf("default categories = %v, want only Digital", defaults)
	}
	checkGrouping(t, grouped, types.Items)
}

func (a categoryAnswer) summary() (names, defaults, grouped []string) {
	for _, c := range a.Items {
		names = append(names, c.Name)
		if c.IsDefault {
			defaults = append(defaults, c.Name)
		}
		for _, at := range c.ActivityTypes {
			grouped = append(grouped, at.ID)
		}
	}
	slices.Sort(names)
	return names, defaults, grouped
}

func checkGrouping(t *testing.T, grouped []string, types []namedRef) {
	t.Helper()
	for _, at := range types {
		if in := slices.Contains(grouped, at.ID); in == (at.Name == uncategorisedType) {
			t.Errorf("activity type %q in a category = %v, want every demo type but %s in one", at.Name, in,
				uncategorisedType)
		}
	}
	if len(grouped) != len(types)-1 || len(slices.Compact(slices.Sorted(slices.Values(grouped)))) != len(grouped) {
		t.Errorf("categories hold %v for %d types, want each type at most once", grouped, len(types))
	}
}

func categoriesIn(t *testing.T, db *fake.DB) []settings.ActivityCategory {
	t.Helper()
	var list []settings.ActivityCategory
	read(t, db, func(ctx context.Context) error {
		var err error
		list, err = settingstest.NewStore(db).ListActivityCategories(ctx)
		return err
	})
	return list
}
