package seed_test

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"testing"
	"time"

	"mapp/internal/history"
	"mapp/internal/history/historytest"
	"mapp/internal/measure/attribution"
	"mapp/internal/performance"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/fake"
	"mapp/internal/settings"
	"mapp/internal/stores/storestest"
)

type performanceData struct {
	sources  []performance.SourceView
	mappings []performance.Mapping
	imports  []performance.Import
	facts    []performance.Fact
}

func performanceIn(t *testing.T, db *fake.DB) performanceData {
	t.Helper()
	var p performanceData
	read(t, db, func(ctx context.Context) error {
		repo := storestest.New(db).Performance
		var listed, mapped, imported error
		p.sources, listed = repo.ListSources(ctx, "")
		p.mappings, mapped = repo.ListMappings(ctx, nil)
		p.imports, imported = repo.ListImports(ctx, performance.ImportFilter{})
		for _, run := range p.imports {
			facts, err := repo.ListFactsOfImport(ctx, run.ID)
			imported = errors.Join(imported, err)
			p.facts = append(p.facts, facts...)
		}
		return errors.Join(listed, mapped, imported)
	})
	return p
}

func (p performanceData) journeys() map[string][]performance.Fact {
	byRef := map[string][]performance.Fact{}
	for _, f := range p.facts {
		if f.JourneyRef != "" {
			byRef[f.JourneyRef] = append(byRef[f.JourneyRef], f)
		}
	}
	return byRef
}

func logIn(t *testing.T, db *fake.DB) []history.Entry {
	t.Helper()
	var entries []history.Entry
	read(t, db, func(ctx context.Context) error {
		var err error
		entries, err = historytest.NewStore(db).Entries(ctx)
		return err
	})
	return entries
}

// The Measure plan's facts are one upload through 046's import: every row matched, one load, its one log entry.
func TestLoad_MeasureFactsLoadThroughTheImport_046_T110(t *testing.T) {
	t.Parallel()
	plainDB, measuredDB := apitest.DemoDB(t, false), apitest.MeasureDemoDB(t)
	if plain := performanceIn(t, plainDB); len(plain.sources)+len(plain.imports)+len(plain.facts) != 0 {
		t.Errorf("the plain seed has %d sources, %d imports, %d facts, want none", len(plain.sources),
			len(plain.imports), len(plain.facts))
	}
	measured := performanceIn(t, measuredDB)
	if len(measured.imports) != 1 || len(measured.sources) != 1 {
		t.Fatalf("imports %+v of sources %+v, want one load of one source", measured.imports, measured.sources)
	}
	run, source := measured.imports[0], measured.sources[0]
	got := fmt.Sprintf("%s %s %+v of %s %q %s", run.Status, run.Origin, run.Counts, run.SourceID, source.Name, source.Status)
	if want := fmt.Sprintf("completed upload %+v of %s \"Measure demo feed\" active",
		performance.Counts{Read: 14, Matched: 14}, source.ID); got != want {
		t.Errorf("the seeded load = %s, want %s", got, want)
	}
	entries, plainEntries := logIn(t, measuredDB), logIn(t, plainDB)
	if last := entries[len(entries)-1]; last.RecordID != run.ID || !last.At.Equal(run.CreatedAt) ||
		len(entries) != len(plainEntries)+1 {
		t.Errorf("newest log entry %+v, want the import's own and only it added, at the seed time (D-188)", last)
	}
}

// Alex can undo the seeded load like any other: its facts go and the figures with them.
func TestLoad_MeasureFactsCanBeUndone_046_FR017(t *testing.T) {
	t.Parallel()
	alexSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, "alex.morgan@shell.com")
	var loads struct{ Items []struct{ ID, Status string } }
	alexSees.Do(t, http.MethodGet, "/api/v1/performance/imports", nil).Decode(t, &loads)
	if len(loads.Items) != 1 {
		t.Fatalf("imports = %+v, want the seeded load", loads.Items)
	}
	undo := alexSees.Do(t, http.MethodPost, "/api/v1/performance/imports/"+loads.Items[0].ID+"/undo", nil)
	var undone struct{ Status string }
	undo.Decode(t, &undone)
	if undo.Status != http.StatusOK || undone.Status != "undone" {
		t.Errorf("undo = %d %s, want 200 and the load undone", undo.Status, undo.Body)
	}
}

func measureActivityIDs(d demoData) []string {
	var r []string
	for _, p := range d.plans {
		for _, c := range d.campaigns {
			for _, i := range d.initiatives {
				for _, a := range d.activities {
					if p.Name == measurePlan && c.PlanID == p.ID && i.CampaignID == c.ID && a.InitiativeID == i.ID {
						r = append(r, a.ID)
					}
				}
			}
		}
	}
	return r
}

func strayFact(f performance.Fact, own []string, seededAt time.Time) bool {
	return !slices.Contains(own, f.ActivityID) || f.Held || !f.FactDate.Before(seededAt)
}

// Only the Measure plan's activities have facts, over three months before the seed time, revenue in USD and EUR.
func TestLoad_MeasureFactsOnTheMeasurePlanOnly_046_T110(t *testing.T) {
	t.Parallel()
	db := apitest.MeasureDemoDB(t)
	measured, own := performanceIn(t, db), measureActivityIDs(demoIn(t, db))
	months, currencies := map[string]bool{}, map[string]bool{}
	for _, f := range measured.facts {
		if strayFact(f, own, measured.imports[0].CreatedAt) {
			t.Errorf("fact %+v, want it on a Measure activity, counted, dated before the seed time", f)
		}
		months[f.FactDate.Format("2006-01")] = true
		if f.Amount != nil {
			currencies[f.Amount.Currency] = true
		}
	}
	if len(months) < 3 || !maps.Equal(currencies, map[string]bool{"USD": true, "EUR": true}) {
		t.Errorf("facts in the months %v with revenue in %v, want three months or more and USD and EUR", months, currencies)
	}
}

// journeyShaped: INQ and MQL touches on two activities, each on its own date, then one revenue fact on another.
func journeyShaped(facts []performance.Fact) bool {
	touched, dates := map[string]bool{}, map[string]bool{}
	var revenue []performance.Fact
	for _, f := range facts {
		if f.Amount != nil {
			revenue = append(revenue, f)
			continue
		}
		touched[f.ActivityID], dates[f.FactDate.Format(time.DateOnly)] = true, true
	}
	if len(revenue) != 1 || touched[revenue[0].ActivityID] {
		return false
	}
	later := slices.ContainsFunc(facts, func(f performance.Fact) bool { return f.FactDate.After(revenue[0].FactDate) })
	return len(touched) == 2 && len(dates) == len(facts)-1 && !later
}

// Each journey touches two activities on different dates, then converts on a third; one revenue fact has none (050).
func TestLoad_MeasureJourneys_050_FR003_FR004(t *testing.T) {
	t.Parallel()
	measured := performanceIn(t, apitest.MeasureDemoDB(t))
	journeys := measured.journeys()
	if len(journeys) != 2 {
		t.Errorf("journeys %v, want two", journeys)
	}
	for ref, facts := range journeys {
		if !journeyShaped(facts) {
			t.Errorf("journey %s = %+v, want INQ and MQL touches on two activities, then revenue on another", ref, facts)
		}
	}
	alone := slices.DeleteFunc(slices.Clone(measured.facts), func(f performance.Fact) bool {
		return f.Amount == nil || f.JourneyRef != ""
	})
	if len(alone) != 1 {
		t.Errorf("revenue facts without a journey = %+v, want one, credited wholly to its own activity", alone)
	}
}

// 050 credits the seeded journeys across their touches, Equally distributed: the webinar series, with no revenue of
// its own, earns a share; 42,000.00 USD stays with Helix; nothing is unattributed.
func TestLoad_MeasureJourneysAreCredited_050_FR003_FR004(t *testing.T) {
	t.Parallel()
	db := apitest.MeasureDemoDB(t)
	set, own := storestest.New(db), measureActivityIDs(demoIn(t, db))
	names := map[string]string{}
	for _, a := range demoIn(t, db).activities {
		names[a.ID] = a.Name
	}
	seededAt := performanceIn(t, db).imports[0].CreatedAt
	tools := history.Tools{Tx: set.Tx, Now: func() time.Time { return seededAt }}
	model, rates := attribution.NewService(tools, set.Attribution), settings.NewService(tools, set.Settings)
	var credited attribution.Credited
	read(t, db, func(ctx context.Context) error {
		var err error
		credited, err = attribution.NewCrediting(model, set.Attribution, rates).
			Credit(ctx, authz.Scope{Everything: true}, own, 2026)
		return err
	})
	got := map[string]string{"unattributed": credited.Unattributed.String()}
	for id, amount := range credited.ByActivity {
		got[names[id]] = amount.String()
	}
	want := map[string]string{"Helix search and social, first half": "54000.00", "Tellus case studies": "13703.70",
		"Tellus webinar series": "18851.86", "unattributed": "0.00"}
	if !maps.Equal(got, want) || credited.Model != attribution.Equal || credited.WithoutRate != 0 {
		t.Errorf("credited %v under %s, %d without a rate; want %v", got, credited.Model, credited.WithoutRate, want)
	}
}
