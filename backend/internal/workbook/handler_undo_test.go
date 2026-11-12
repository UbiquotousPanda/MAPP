package workbook_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/workbook"
)

func TestUndo_ARecordRestoredAfterTheUndoIsNotListedAsKept_SMM8(t *testing.T) {
	t.Parallel()
	priya := apitest.New(t).SignIn(t, priyasEmail)
	detail := decoded[workbook.Detail](t, priya.Do(t, http.MethodPost, planPath+"/imports", checked(t, priya, skeleton(t))), http.StatusCreated)
	decoded[workbook.Detail](t, priya.Do(t, http.MethodPost, "/api/v1/imports/"+detail.Import.ID+"/undo", nil), http.StatusOK)

	campaignID := detail.Records[0].ID
	bin := decoded[struct {
		Items []struct{ ID, RecordID string }
	}](t, priya.Do(t, http.MethodGet, "/api/v1/recycle-bin", nil, apitest.SkipValidation()), http.StatusOK)
	for _, entry := range bin.Items {
		if entry.RecordID == campaignID {
			priya.Do(t, http.MethodPost, "/api/v1/recycle-bin/"+entry.ID+"/restore", nil, apitest.SkipValidation())
		}
	}
	after := decoded[workbook.Detail](t, priya.Do(t, http.MethodGet, "/api/v1/imports/"+detail.Import.ID, nil), http.StatusOK)

	if !after.Records[0].Exists || len(after.Kept) != 0 {
		t.Errorf("campaign %s exists %t, kept %+v; want restored and nothing kept", campaignID, after.Records[0].Exists, after.Kept)
	}
}
