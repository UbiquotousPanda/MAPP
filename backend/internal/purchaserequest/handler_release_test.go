package purchaserequest_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/purchaserequest"
)

const configurationPath = "/api/v1/purchase-request-configuration"

func TestRelease_OnApproval_Contract_Demo182(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	lea := s.SignIn(t, leasEmail)

	pr := approvedAsConfigured(t, s)
	again := decoded[apiError](t, lea.Do(t, http.MethodPost, gsapRun+pr.ID+"/purchase-order", map[string]any{"version": pr.Version}),
		http.StatusConflict)

	l := pr.Lines[0]
	same(t, "released at once", []any{"SIM-0010001001", false, "SIM-4500001001", "Released", false},
		[]any{pr.GSAPPRNumber, pr.WaitingForGSAP, l.PONumber, l.POLineStatus, pr.Access.GSAPOrder.Available})
	same(t, "nothing left to run", true, again.Error.Message != "")
}

func TestRelease_SwitchedOff_KeepsTodaysBehaviour_Contract_Demo182(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	alex := s.SignIn(t, alexsEmail)
	before := decoded[purchaserequest.ConfigurationView](t, alex.Do(t, http.MethodGet, configurationPath, nil), http.StatusOK)
	saved := setRelease(t, s, false)

	pr := approvedAsConfigured(t, s)

	same(t, "setting", []bool{true, false}, []bool{before.ReleaseInGSAPAfterApproval, saved.ReleaseInGSAPAfterApproval})
	same(t, "waits for GSAP", []any{"", true}, []any{pr.GSAPPRNumber, pr.WaitingForGSAP})
}
