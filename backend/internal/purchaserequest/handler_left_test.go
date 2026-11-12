package purchaserequest_test

import (
	"testing"

	"mapp/internal/platform/apitest"
)

// Left excludes this request so the form can warn before saving; Media booking plans 30,000.00 USD.
func TestLines_SayWhatTheLineItemHasLeftWithoutThem_Contract_DemoMVP4(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	mediaBookingWithCode(t, s)
	priya := s.SignIn(t, priyasEmail)

	first := create(t, priya, body(mediaBooking, "USD", "26000.00"))
	second := create(t, priya, body(mediaBooking, "USD", "4100.00"))

	got := []string{get(t, priya, first.ID).Lines[0].Available.Format(), second.Lines[0].Available.Format()}
	same(t, "left without the purchase request", []string{"25,900.00 USD", "4,000.00 USD"}, got)
}
