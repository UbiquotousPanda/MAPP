package wavebqa_test

import (
	"fmt"
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
)

func patch(path string, body any) call {
	return call{method: http.MethodPatch, path: path, body: body}
}

func put(path string, body any) call {
	return call{method: http.MethodPut, path: path, body: body}
}

func del(path string) call {
	return call{method: http.MethodDelete, path: path}
}

func sourceInput(name, route string) map[string]any {
	return map[string]any{"name": name, "ownerId": "U-1001", "category": "crm", "deliveryRoute": route,
		"cadence": "monthly"}
}

// records are what Alex prepares for every change to have a target: sources, a mapping, a load, a row, a code.
type records struct {
	activity, source, feed, spare, mapping, load, row, code string
	config                                                  map[string]any
}

func prepare(t *testing.T, alexSees person) records {
	t.Helper()
	facts := loadFacts(t, alexSees)
	r := records{activity: facts.ids[helixFirstHalf], source: facts.source}
	created := func(c call) string {
		return decode[struct{ ID string }](t, alexSees.expect(t, c, http.StatusCreated)).ID
	}
	r.feed = created(post("/performance/sources", sourceInput("Simulated CRM", "simulated")))
	for _, m := range []map[string]any{{"columnName": "Ref", "meaning": "reference"},
		{"columnName": "Date", "meaning": "factDate"}, {"columnName": "Id", "meaning": "key", "keyType": "integrationId"}} {
		alexSees.expect(t, post("/performance/sources/"+r.feed+"/mappings", m), http.StatusCreated)
	}
	r.spare = created(post("/performance/sources", sourceInput("Spare", "upload")))
	r.mapping = created(post("/performance/sources/"+r.source+"/mappings", map[string]any{
		"columnName": "Sessions", "meaning": "webMetric", "webMetric": "sessions"}))
	r.load = upload(t, alexSees, r.source, csvOf("u1,2026-03-02,A-9999,,5,,,")).ID
	rows := decode[struct{ Items []struct{ ID string } }](t,
		alexSees.expect(t, get("/performance/review-rows?importId="+r.load), http.StatusOK))
	if len(rows.Items) != 1 {
		t.Fatalf("rows to review of %s = %+v, want the one unknown key", r.load, rows.Items)
	}
	r.row = rows.Items[0].ID
	kind := decode[struct{ ActivityType struct{ ID string } }](t, alexSees.expect(t, get("/activities/"+r.activity), http.StatusOK))
	r.config = map[string]any{"activityTypeIds": []string{kind.ActivityType.ID}, "codeAttributes": []any{},
		"mediaCodeNext": 9000001, "version": 0}
	alexSees.expect(t, patch("/performance/configuration", r.config), http.StatusOK)
	r.code = created(post("/activities/"+r.activity+"/media-codes", map[string]any{}))
	saved := decode[struct {
		MediaCodeNext int64 `json:"mediaCodeNext"`
		Version       int   `json:"version"`
	}](t, alexSees.expect(t, get("/performance/configuration"), http.StatusOK))
	r.config["mediaCodeNext"], r.config["version"] = saved.MediaCodeNext, saved.Version
	return r
}

type change struct {
	call
	alexGets int
}

// changes are every performance change in the order Alex can make them all.
func changes(r records) []change {
	src, act, row, code := "/performance/sources/"+r.source, "/activities/"+r.activity, "/performance/review-rows/"+r.row,
		"/media-codes/"+r.code
	edited := sourceInput("Eloqua EU", "upload")
	edited["version"] = 1
	return []change{
		{post("/performance/sources", sourceInput("Google Analytics", "upload")), http.StatusCreated},
		{patch(src, edited), http.StatusOK},
		{post(src+"/mappings", map[string]any{"columnName": "Visits", "meaning": "webMetric", "webMetric": "visits"}), http.StatusCreated},
		{patch("/performance/mappings/"+r.mapping, map[string]any{"columnName": "Web sessions", "meaning": "webMetric",
			"webMetric": "sessions", "version": 1}), http.StatusOK},
		{post(src+"/uploads", map[string]string{"fileName": "u2.csv", "content": encoded(csvOf("u2,2026-03-03,,,4,,,"))}), http.StatusCreated},
		{post("/performance/sources/"+r.feed+"/pull", nil), http.StatusCreated},
		{get("/performance/imports"), http.StatusOK},
		{get("/performance/imports/" + r.load), http.StatusOK},
		{get("/performance/review-rows"), http.StatusOK},
		{get(row), http.StatusOK},
		{post(row+"/dismiss", map[string]string{"comment": "Checking the queue"}), http.StatusOK},
		{post(row+"/reopen", nil), http.StatusOK},
		{post(row+"/correct", map[string]any{"keys": map[string]string{"activityId": r.activity}}), http.StatusOK},
		{post(src+"/recheck", nil), http.StatusOK},
		{patch("/performance/configuration", r.config), http.StatusOK},
		{put(act+"/integration-ids/"+r.source, map[string]string{"value": "helix-1h"}), http.StatusCreated},
		{del(act + "/integration-ids/" + r.source), http.StatusNoContent},
		{post(act+"/media-codes", map[string]any{}), http.StatusCreated},
		{patch(code, map[string]any{"attributes": map[string]string{}, "landingPage": "https://example.com/helix", "version": 1}), http.StatusOK},
		{post(code+"/deactivate", nil), http.StatusOK},
		{del(code), http.StatusNoContent},
		{del(act + "/external-name-aliases/ENA-9999"), http.StatusNotFound},
		{del(src), http.StatusConflict},
		{post(src+"/deactivate", nil), http.StatusOK},
		{post(src+"/uploads", map[string]string{"fileName": "u3.csv", "content": encoded(csvOf("u3,2026-03-03,,,4,,,"))}), http.StatusConflict},
		{post(src+"/reactivate", nil), http.StatusOK},
		{post("/performance/imports/"+r.load+"/undo", nil), http.StatusOK},
		{del("/performance/mappings/" + r.mapping), http.StatusNoContent},
		{del("/performance/sources/" + r.spare), http.StatusNoContent},
	}
}

func settingsReads(r records) []string {
	src := "/performance/sources/" + r.source
	return []string{"/performance/sources", src, src + "/mappings", src + "/template", "/performance/configuration"}
}

// TestWaveB_PerformanceRights_046_FR043: only performance.import and performance.link change anything; all read.
func TestWaveB_PerformanceRights_046_FR043(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	r := prepare(t, alexSees)

	for _, who := range []string{carlos, priya, daniel, mei, sara, lea} {
		p := signIn(t, server, who)
		for _, c := range changes(r) {
			if got := p.send(t, c.call); got.Status != http.StatusForbidden {
				t.Errorf("%s %s %s = %d %s, want 403", who, c.method, c.path, got.Status, got.Body)
			}
		}
	}
	for _, who := range []string{alex, carlos, priya, daniel, mei, sara, lea} {
		p := signIn(t, server, who)
		for _, path := range settingsReads(r) {
			if got := p.send(t, get(path)); got.Status != http.StatusOK {
				t.Errorf("%s GET %s = %d %s, want 200: Settings › Performance data is open to everyone", who, path, got.Status, got.Body)
			}
		}
	}
	for _, c := range changes(r) {
		if got := alexSees.send(t, c.call); got.Status != c.alexGets {
			t.Errorf("Alex %s %s = %d %s, want %d", c.method, c.path, got.Status, got.Body, c.alexGets)
		}
	}
}

// TestWaveB_UndoNeedsSettingsManage_046_FR043: loading does not let a person undo a load (046-C16).
func TestWaveB_UndoNeedsSettingsManage_046_FR043(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	facts := loadFacts(t, alexSees)
	giveMei(t, alexSees, "plans.view", "performance.import")
	loader := signIn(t, server, mei)

	own := upload(t, loader, facts.source, csvOf("l1,2026-03-02,,,4,,,"))
	loader.expect(t, get("/performance/imports/"+own.ID), http.StatusOK)
	for _, c := range []call{post("/performance/imports/"+own.ID+"/undo", nil), post("/performance/imports/"+facts.first.ID+"/undo", nil),
		put(fmt.Sprintf("/activities/%s/integration-ids/%s", facts.ids[grandOpening], facts.source), map[string]string{"value": "x"})} {
		if got := loader.send(t, c); got.Status != http.StatusForbidden {
			t.Errorf("Mei, with performance.import only, %s %s = %d %s, want 403", c.method, c.path, got.Status, got.Body)
		}
	}
}

// giveMei replaces Mei's (U-1004) roles with one holding only these permissions, through the access API.
func giveMei(t *testing.T, alexSees person, permissions ...string) {
	t.Helper()
	role := decode[struct{ ID string }](t, alexSees.expect(t, post("/roles", map[string]any{"name": "Loader",
		"defaultScope": "myTeams", "permissions": permissions}), http.StatusCreated))
	alexSees.expect(t, put("/people/U-1004/roles", map[string]any{"version": 1,
		"roles": []map[string]any{{"roleId": role.ID, "scope": map[string]any{"type": "myTeams"}}}}), http.StatusOK)
}
