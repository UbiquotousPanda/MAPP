package settings_test

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"mapp/internal/platform/apitest"
)

type rateRecord struct {
	ID, Currency, Date, Rate, Source string
	ImportFileName                   *string
	Current, Future                  bool
	Version                          int
}

// A currency's rate history comes newest first with the current rate marked; the current rates come USD
// first with their date and source (FR-001, FR-003, FR-009).
func TestRatesAPI_HistoryAndCurrent_FR003_FR009(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	var history struct {
		Items   []rateRecord
		Total   int
		Current struct{ Currency, Rate, RateDate, Source, ImportFileName string }
	}
	alex.Do(t, http.MethodGet, "/api/v1/currencies/EUR/rates", nil).Decode(t, &history)
	var current struct {
		Today string
		Items []struct {
			Currency, Rate string
			RateDate       *string
			Source         *string
		}
		Total int
	}
	alex.Do(t, http.MethodGet, "/api/v1/exchange-rates/current", nil).Decode(t, &current)
	gone := alex.Do(t, http.MethodGet, "/api/v1/currencies/XXX/rates", nil)

	if history.Total != 31 || len(history.Items) != 31 {
		t.Fatalf("EUR history = %d rates, want 31", history.Total)
	}
	if current.Today != "2026-03-12" || current.Total != 5 || current.Items[0].Currency != "USD" || current.Items[0].RateDate != nil ||
		current.Items[2].Currency != "EUR" || current.Items[2].Rate != "0.9" || *current.Items[2].Source != "gsapImport" {
		t.Errorf("current rates = %+v", current)
	}
	assertAnswer(t, gone, http.StatusNotFound, currencyGoneBody)
}

func TestRatesAPI_AddUpdateDelete_FR003_FR005(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	impact := alex.Do(t, http.MethodPost, "/api/v1/currencies/EUR/rates/impact", map[string]any{"date": "2027-01-01", "rate": "0.95"})
	invalid := alex.Do(t, http.MethodPost, "/api/v1/currencies/EUR/rates", map[string]any{"date": "2026-03-12", "rate": "0"})
	var added rateRecord
	mustCreate(t, alex, "/api/v1/currencies/EUR/rates", map[string]any{"date": "2027-01-01", "rate": "0.95"}).Decode(t, &added)
	var edited rateRecord
	alex.Do(t, http.MethodPatch, "/api/v1/exchange-rates/"+added.ID, map[string]any{"rate": "0.96", "version": 1}).Decode(t, &edited)
	stale := alex.Do(t, http.MethodPatch, "/api/v1/exchange-rates/"+added.ID, map[string]any{"rate": "0.97", "version": 1})
	var deleted struct {
		RecycleBinEntry struct{ ID, RecordType, RecordName string }
	}
	alex.Do(t, http.MethodDelete, fmt.Sprintf("/api/v1/exchange-rates/%s?version=%d", added.ID, edited.Version), nil).Decode(t, &deleted)

	assertAnswer(t, impact, http.StatusOK, `{"warnings":[]}`)
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(`{"field":"date","message":"EUR already has a rate on 12 Mar 2026."},`+
		`{"field":"rate","message":"Enter a rate above 0, with at most six decimals."}`))
	if added.Currency != "EUR" || added.Date != "2027-01-01" || added.Rate != "0.95" || added.Source != "manual" || !added.Future || added.Current {
		t.Errorf("added = %+v", added)
	}
	if edited.Rate != "0.96" || edited.Version != 2 {
		t.Errorf("edited = %+v", edited)
	}
	if stale.Status != http.StatusConflict {
		t.Errorf("stale edit = %d %s", stale.Status, stale.Body)
	}
	if deleted.RecycleBinEntry.RecordType != "exchangeRate" || deleted.RecycleBinEntry.RecordName != "EUR on 01 Jan 2027" {
		t.Errorf("deleted = %+v", deleted)
	}
}

func TestRatesAPI_ImportCheckAndImport_FR006_FR007(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	server.Advance(24 * time.Hour) // 13 Mar 2026: a day without a rate yet
	alex := server.SignIn(t, alexsEmail)

	sample := alex.Do(t, http.MethodGet, "/api/v1/exchange-rates/import-sample", nil)
	body := map[string]any{"fileName": "gsap_rates_2026-03-13.csv", "content": base64.StdEncoding.EncodeToString(sample.Body)}
	var check struct {
		Feed string
		Rows []struct {
			Row                     int
			Outcome, Currency, Rate string
		}
		Counts struct{ Add, Replace, Present, NotUsed, Problem int }
	}
	alex.Do(t, http.MethodPost, "/api/v1/exchange-rates/import-check", body).Decode(t, &check)
	var imported struct {
		ID, FileName, Feed, FirstDate, LastDate string
		Added                                   int
		ImportedBy                              struct{ Name string }
	}
	mustCreate(t, alex, "/api/v1/exchange-rates/import", body).Decode(t, &imported)
	unreadable := alex.Do(t, http.MethodPost, "/api/v1/exchange-rates/import-check",
		map[string]any{"fileName": "x.csv", "content": base64.StdEncoding.EncodeToString([]byte("rate_type,rate\nM,1\n"))})
	var recent struct {
		Items []struct{ ID string }
		Total int
	}
	alex.Do(t, http.MethodGet, "/api/v1/exchange-rates/imports?limit=5", nil).Decode(t, &recent)
	badLimit := alex.Do(t, http.MethodGet, "/api/v1/exchange-rates/imports?limit=0", nil, apitest.SkipRequestValidation())

	wantSample := "rate_type,from_currency,to_currency,valid_from,rate\nM,USD,CNY,2026-03-13,6.70335\nM,USD,EUR,2026-03-13,0.9045\n" +
		"M,USD,GBP,2026-03-13,0.75375\nM,USD,INR,2026-03-13,94.1685\n"
	if sample.Status != http.StatusOK || string(sample.Body) != wantSample || !strings.HasPrefix(sample.Header.Get("Content-Type"), "text/csv") ||
		sample.Header.Get("Content-Disposition") != `attachment; filename="gsap_rates_2026-03-13.csv"` {
		t.Errorf("sample = %d %q %v", sample.Status, sample.Body, sample.Header)
	}
	if imported.ID != "RI-1002" || imported.Added != 4 || imported.FirstDate != "2026-03-13" || imported.ImportedBy.Name != "Alex Morgan" {
		t.Errorf("imported = %+v", imported)
	}
	assertAnswer(t, unreadable, http.StatusBadRequest, validationBody(
		`{"field":"content","message":"The file needs the columns 'from_currency', 'to_currency' and 'valid_from'."}`))
	if badLimit.Status != http.StatusBadRequest {
		t.Errorf("limit 0 = %d %s", badLimit.Status, badLimit.Body)
	}
}

func TestFieldHelpAPI_ListAndUpdate_FR045_FR046_FR048(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	var page struct {
		Items []struct {
			Key, Level, Label, Text, DefaultText string
			IsDefault                            bool
			Version                              int
		}
		Total, ShellAttributesWithoutHelp int
	}
	alex.Do(t, http.MethodGet, "/api/v1/field-help", nil).Decode(t, &page)
	edited := alex.Do(t, http.MethodPatch, "/api/v1/field-help/plan.budget", map[string]any{"text": "The plan's money.", "version": 0})
	stale := alex.Do(t, http.MethodPatch, "/api/v1/field-help/plan.budget", map[string]any{"text": "Daniel's.", "version": 0}) // settings.manage: administrators only (014)
	unknown := alex.Do(t, http.MethodPatch, "/api/v1/field-help/plan.colour", map[string]any{"text": "x", "version": 0})

	if page.Total < 90 || page.Items[0].Key != "plan.name" || page.Items[0].Level != "plan" || !page.Items[0].IsDefault ||
		page.Items[0].Version != 0 || page.ShellAttributesWithoutHelp != 0 {
		t.Errorf("page = %d entries, first %+v, %d attributes without help", page.Total, page.Items[0], page.ShellAttributesWithoutHelp)
	}
	assertAnswer(t, edited, http.StatusOK, `{"key":"plan.budget","level":"plan","label":"Plan budget","text":"The plan's money.",`+
		`"defaultText":"The money this plan may spend in its year, in the plan currency. Campaign budgets are allocated from it.",`+
		`"isDefault":false,"version":1,"updatedAt":"2026-03-12T09:00:00Z","updatedBy":{"id":"U-1001","name":"Alex Morgan"}}`)
	assertAnswer(t, stale, http.StatusConflict, `{"error":{"code":"version_conflict","message":"Not saved — Alex Morgan changed this field help",`+
		`"fields":[],"conflict":{"changedBy":"Alex Morgan","changedAt":"2026-03-12T09:00:00Z"}}}`)
	assertAnswer(t, unknown, http.StatusNotFound, `{"error":{"code":"not_found","message":"This help entry doesn't exist.","fields":[]}}`)
}
