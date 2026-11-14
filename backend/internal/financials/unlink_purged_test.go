package financials_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"mapp/internal/financials"
	"mapp/internal/platform/apitest"
)

func TestPurgedLineItem_ItsTransactionsBecomeNotLinked_BEL3(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	deleted := alex.DeleteSeen(t, "/api/v1/line-items/L-1006")
	var answer struct {
		RecycleBinEntry struct {
			ID string `json:"id"`
		} `json:"recycleBinEntry"`
	}
	err := json.Unmarshal(deleted.Body, &answer)
	entry := answer.RecycleBinEntry
	if err != nil || deleted.Status != http.StatusOK || entry.ID == "" {
		t.Fatalf("delete L-1006 = %d %s", deleted.Status, deleted.Body)
	}
	inBin := get[financials.TransactionView](t, alex, "/api/v1/financials/transactions/FT-1003")

	if purged := alex.Do(t, http.MethodDelete, "/api/v1/recycle-bin/"+entry.ID, nil); purged.Status != http.StatusOK {
		t.Fatalf("purge %s = %d %s", entry.ID, purged.Status, purged.Body)
	}
	after := get[financials.TransactionView](t, alex, "/api/v1/financials/transactions/FT-1003")

	if inBin.Link.State != financials.StateLineItemDeleted {
		t.Errorf("while L-1006 is in the bin FT-1003 is %s, want it kept linked to come back on restore", inBin.Link.State)
	}
	if after.Link.State != financials.StateNotLinked || after.Link.Reason == nil ||
		!strings.Contains(*after.Link.Reason, "deleted permanently") {
		t.Errorf("after the purge FT-1003 link = %+v, want not linked because L-1006 was deleted permanently", after.Link)
	}
}
