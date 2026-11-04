package wavebqa_test

import (
	"maps"
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	categoriesPath    = "/settings/activity-categories"
	attributionPath   = "/settings/attribution"
	uncategorisedType = "MOBILITY – Long-term contract"
)

type ref struct{ ID, Name string }

type category struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	IsDefault     bool   `json:"isDefault"`
	ActivityTypes []ref  `json:"activityTypes"`
}

func newCategory(name string, isDefault bool, typeIDs ...string) map[string]any {
	return map[string]any{"name": name, "isDefault": isDefault, "activityTypeIds": append([]string{}, typeIDs...)}
}

// settingsChanges are the 047 and 050 changes in the order Alex can make them all; the last is a stale save.
func settingsChanges(categoryID string) []change {
	target := categoriesPath + "/" + categoryID
	return []change{
		{post(categoriesPath, newCategory("Trade", false)), http.StatusCreated},
		{patch(target, map[string]any{"name": "Promotions", "version": 1}), http.StatusOK},
		{del(target), http.StatusOK},
		{patch("/models/"+lubricantsModel, map[string]any{"inqToMqlVelocityMonths": 1, "version": 1}), http.StatusOK},
		{post("/models/"+lubricantsModel+"/impact", map[string]any{"mqlToDealVelocityMonths": 2, "version": 2}), http.StatusOK},
		{put(attributionPath, map[string]any{"model": "uShaped", "version": 1}), http.StatusOK},
		{put(attributionPath, map[string]any{"model": "lastTouch", "version": 1}), http.StatusConflict},
	}
}

func settingsReadsOf(categoryID string) []string {
	return []string{categoriesPath, categoriesPath + "/" + categoryID, "/models", "/models/" + lubricantsModel,
		attributionPath, "/activity-types"}
}

func readByAll(t *testing.T, server *apitest.Server, paths []string) {
	t.Helper()
	for _, who := range []string{alex, carlos, priya, daniel, mei, sara, lea} {
		p := signIn(t, server, who)
		for _, path := range paths {
			if got := p.send(t, get(path)); got.Status != http.StatusOK {
				t.Errorf("%s GET %s = %d %s, want 200: signed in reads Settings", who, path, got.Status, got.Body)
			}
		}
	}
}

// TestWaveB_SettingsRights_047_050: categories, model edit and attribution change with settings.manage; all read.
func TestWaveB_SettingsRights_047_050(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	created := decode[category](t, alexSees.expect(t, post(categoriesPath, newCategory("Promotion", false)),
		http.StatusCreated))

	for _, who := range []string{carlos, priya, daniel, mei, sara, lea} {
		p := signIn(t, server, who)
		for _, c := range settingsChanges(created.ID) {
			if got := p.send(t, c.call); got.Status != http.StatusForbidden {
				t.Errorf("%s %s %s = %d %s, want 403: no settings.manage", who, c.method, c.path, got.Status, got.Body)
			}
		}
	}
	readByAll(t, server, settingsReadsOf(created.ID))
	for _, c := range settingsChanges(created.ID) {
		if got := alexSees.send(t, c.call); got.Status != c.alexGets {
			t.Errorf("Alex %s %s = %d %s, want %d", c.method, c.path, got.Status, got.Body, c.alexGets)
		}
	}
}

type grouping struct {
	byType   map[string]string
	defaults []string
}

func groupingOf(t *testing.T, who person) grouping {
	t.Helper()
	list := decode[struct{ Items []category }](t, who.expect(t, get(categoriesPath), http.StatusOK))
	g := grouping{byType: map[string]string{}}
	for _, c := range list.Items {
		if c.IsDefault {
			g.defaults = append(g.defaults, c.Name)
		}
		for _, at := range c.ActivityTypes {
			g.byType[at.Name] = c.Name
		}
	}
	return g
}

// typesNamingCategories reads each activity type's own category; "" is Uncategorised.
func typesNamingCategories(t *testing.T, who person) (byType map[string]string, ids map[string]string) {
	t.Helper()
	type activityType struct {
		ID, Name string
		Category *ref
	}
	types := decode[struct{ Items []activityType }](t, who.expect(t, get("/activity-types"), http.StatusOK))
	byType, ids = map[string]string{}, map[string]string{}
	for _, at := range types.Items {
		ids[at.Name] = at.ID
		if at.Category != nil {
			byType[at.Name] = at.Category.Name
		}
	}
	return byType, ids
}

func checkGrouping(t *testing.T, who person, step string, want grouping) {
	t.Helper()
	got := groupingOf(t, who)
	served, _ := typesNamingCategories(t, who)
	if !maps.Equal(got.byType, want.byType) || !maps.Equal(served, want.byType) || !slices.Equal(got.defaults, want.defaults) {
		t.Errorf("%s: categories group %v, types name %v, defaults %v; want %+v", step, got.byType, served, got.defaults,
			want)
	}
}

func seeded() map[string]string {
	return map[string]string{"Digital media": "Digital", "Event": "Events and sponsorship",
		"Sponsorship": "Events and sponsorship", "Content production": "Content and creative",
		"Agency fees – Creative": "Content and creative"}
}

func checkDuplicateRefused(t *testing.T, alexSees person) {
	t.Helper()
	got := decode[refusal](t, alexSees.expect(t, post(categoriesPath, newCategory("dIGITAL", false)), http.StatusBadRequest))
	if got.Error.Code != "validation_failed" || !slices.Equal(got.fields(), []string{"name"}) {
		t.Errorf("a second Digital in other letters = %+v, want the name refused as a duplicate", got)
	}
}

// TestWaveB_CategoryRecords_047_FR018_FR022: duplicate refused, a type moves, one default, bin and Undo, types name theirs.
func TestWaveB_CategoryRecords_047_FR018_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	want := grouping{byType: seeded(), defaults: []string{"Digital"}}
	checkGrouping(t, alexSees, "seeded, "+uncategorisedType+" in none", want)
	checkDuplicateRefused(t, alexSees)

	_, typeIDs := typesNamingCategories(t, alexSees)
	promotion := decode[category](t, alexSees.expect(t, post(categoriesPath, newCategory("Promotion", true,
		typeIDs["Event"])), http.StatusCreated))
	want.byType["Event"], want.defaults = "Promotion", []string{"Promotion"}
	checkGrouping(t, alexSees, "Event moved to Promotion, the default", want)

	deleted := decode[struct{ RecycleBinEntry struct{ ID string } }](t,
		alexSees.expect(t, del(categoriesPath+"/"+promotion.ID), http.StatusOK))
	delete(want.byType, "Event")
	checkGrouping(t, alexSees, "Promotion in the bin, Event uncategorised", grouping{byType: want.byType})

	alexSees.expect(t, post("/recycle-bin/"+deleted.RecycleBinEntry.ID+"/undo", nil), http.StatusOK)
	want.byType["Event"] = "Promotion"
	checkGrouping(t, alexSees, "Undo brings Promotion and Event back", want)
}
