package attribution

import (
	"math"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/web"
)

const (
	msgChooseYear     = "Choose a year from 2000 to 2100."
	msgChoosePage     = "Choose a page from 1."
	msgChooseCurrency = "Choose a currency by its code, such as EUR."
	minYear, maxYear  = 2000, 2100
)

type DealsHandler struct {
	deals *Deals
}

func NewDealsHandler(d *Deals) *DealsHandler {
	return &DealsHandler{deals: d}
}

func (h *DealsHandler) RegisterRoutes(r gin.IRoutes) {
	r.GET("/reports/revenue/activities/:activityId/deals", h.read)
}

func (h *DealsHandler) read(c *gin.Context) {
	q, err := parseDealsQuery(c.Param("activityId"), c.Request.URL.Query())
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	out, err := h.deals.Of(c.Request.Context(), a, q)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, out)
}

type bounds struct {
	low, high int
	message   string
}

// parseDealsQuery reads the panel's parameters and answers every problem at once; 0 means "not given".
func parseDealsQuery(activityID string, values url.Values) (DealsQuery, error) {
	var problems errs.Problems
	q := DealsQuery{ActivityID: activityID, Currency: values.Get("currency"), Compare: Model(values.Get("compare"))}
	q.Year = intParam(values, "year", bounds{low: minYear, high: maxYear, message: msgChooseYear}, &problems)
	q.Page = max(intParam(values, "page", bounds{low: 1, high: math.MaxInt32, message: msgChoosePage}, &problems), 1)
	if q.Compare != "" && !listedModel(q.Compare) {
		problems.Add("compare", msgPickModel)
	}
	if q.Currency != "" && !isCurrencyCode(q.Currency) {
		problems.Add("currency", msgChooseCurrency)
	}
	return q, problems.Err()
}

func intParam(values url.Values, name string, b bounds, problems *errs.Problems) int {
	raw := values.Get(name)
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < b.low || n > b.high {
		problems.Add(name, b.message)
		return 0
	}
	return n
}

func isCurrencyCode(code string) bool {
	if len(code) != 3 {
		return false
	}
	for _, r := range code {
		if r < 'A' || r > 'Z' {
			return false
		}
	}
	return true
}
