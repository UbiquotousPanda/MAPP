package access

import "mapp/internal/platform/authz"

// postInvestmentRoutes leave the plan check to the service, so a review out of scope answers 404 like a missing one.
func postInvestmentRoutes() map[string]Rule {
	return map[string]Rule{
		"GET /api/v1/post-investment-reviews":                    view(),
		"POST /api/v1/post-investment-reviews":                   inPlan(authz.ActivitiesEdit),
		"GET /api/v1/post-investment-reviews/export":             need(authz.DataExport),
		"GET /api/v1/post-investment-reviews/{reviewId}":         view(),
		"PATCH /api/v1/post-investment-reviews/{reviewId}":       inPlan(authz.ActivitiesEdit),
		"DELETE /api/v1/post-investment-reviews/{reviewId}":      inPlan(authz.ActivitiesDelete),
		"POST /api/v1/post-investment-reviews/{reviewId}/submit": inPlan(authz.ActivitiesEdit),
		"GET /api/v1/post-investment-reviews/{reviewId}/export":  need(authz.DataExport),
	}
}
