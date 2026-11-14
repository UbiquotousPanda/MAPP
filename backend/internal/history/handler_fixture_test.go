package history_test

import (
	"net/http"
	"testing"

	"mapp/internal/history"
	"mapp/internal/platform/apitest"
)

// These change the developer sample records so that the log and the recycle bin have entries.

func createFolder(t *testing.T, c *apitest.Client, name string) {
	t.Helper()
	response := c.Do(t, http.MethodPost, "/api/v1/sample-folders", map[string]string{"name": name})
	if response.Status != http.StatusCreated {
		t.Fatalf("creating the sample folder %q: %d %s", name, response.Status, response.Body)
	}
}

func renameFolder(t *testing.T, c *apitest.Client, id, name string) {
	t.Helper()
	response := c.Do(t, http.MethodPatch, "/api/v1/sample-folders/"+id, map[string]any{"name": name, "version": 1})
	if response.Status != http.StatusOK {
		t.Fatalf("renaming the sample folder %s: %d %s", id, response.Status, response.Body)
	}
}

func addNote(t *testing.T, c *apitest.Client, title string) {
	t.Helper()
	response := c.Do(t, http.MethodPost, "/api/v1/sample-folders/SF-1001/notes", map[string]string{"title": title})
	if response.Status != http.StatusCreated {
		t.Fatalf("adding the note %q: %d %s", title, response.Status, response.Body)
	}
}

func deleteNote(t *testing.T, c *apitest.Client, id string) {
	t.Helper()
	if response := c.DeleteSeen(t, "/api/v1/sample-notes/"+id); response.Status != http.StatusOK {
		t.Fatalf("deleting the note %s: %d %s", id, response.Status, response.Body)
	}
}

func deleteFolder(t *testing.T, c *apitest.Client, id string) {
	t.Helper()
	if response := c.DeleteSeen(t, "/api/v1/sample-folders/"+id); response.Status != http.StatusOK {
		t.Fatalf("deleting the folder %s: %d %s", id, response.Status, response.Body)
	}
}

func getLog(t *testing.T, c *apitest.Client, query string) history.LogPage {
	t.Helper()
	response := c.Do(t, http.MethodGet, "/api/v1/activity-log"+query, nil)
	if response.Status != http.StatusOK {
		t.Fatalf("GET /api/v1/activity-log%s = %d %s", query, response.Status, response.Body)
	}
	var page history.LogPage
	response.Decode(t, &page)
	return page
}

func entryIDs(entries []history.EntryView) []string {
	list := make([]string, 0, len(entries))
	for _, e := range entries {
		list = append(list, e.ID)
	}
	return list
}

// firstID answers "nothing" when there is no entry, for failure messages.
func firstID(entries []history.EntryView) string {
	if len(entries) == 0 {
		return "nothing"
	}
	return entries[0].ID
}

func assertAnswer(t *testing.T, response *apitest.Response, status int, body string) {
	t.Helper()
	if response.Status != status || string(response.Body) != body {
		t.Errorf("answer = %d %s\nwant %d %s", response.Status, response.Body, status, body)
	}
}
