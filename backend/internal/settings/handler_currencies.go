package settings

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/web"
)

func (h *Handler) listCurrencies(c *gin.Context) {
	currencies, err := h.service.ListCurrencies(c.Request.Context(), actorOf(c))
	respond(c, http.StatusOK, CurrencyPage{Items: currencies, Total: len(currencies)}, err)
}

func (h *Handler) getCurrency(c *gin.Context) {
	currency, err := h.service.GetCurrency(c.Request.Context(), actorOf(c), c.Param("code"))
	respond(c, http.StatusOK, currency, err)
}

func (h *Handler) createCurrency(c *gin.Context) {
	var input CurrencyInput
	if !readBody(c, &input) {
		return
	}
	currency, err := h.service.CreateCurrency(c.Request.Context(), actorOf(c), input)
	respond(c, http.StatusCreated, currency, err)
}

func (h *Handler) updateCurrency(c *gin.Context) {
	var update CurrencyUpdate
	if !readBody(c, &update) {
		return
	}
	currency, err := h.service.UpdateCurrency(c.Request.Context(), actorOf(c), c.Param("code"), update)
	respond(c, http.StatusOK, currency, err)
}

// deleteCurrency answers DELETE /api/v1/currencies/{code} with the recycle-bin entry.
func (h *Handler) deleteCurrency(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("code"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	entry, err := h.service.DeleteCurrency(ctx, actorOf(c), c.Param("code"))
	respondDeleted(c, entry, err)
}

// currencyImpact answers POST /api/v1/currencies/{code}/impact with the warnings to confirm before saving.
func (h *Handler) currencyImpact(c *gin.Context) {
	var update CurrencyUpdate
	if !readBody(c, &update) {
		return
	}
	impact, err := h.service.CurrencyImpact(c.Request.Context(), actorOf(c), c.Param("code"), update)
	respond(c, http.StatusOK, impact, err)
}

// setCurrencyStatus answers POST /api/v1/currencies/{code}/status with the currency in its new status.
func (h *Handler) setCurrencyStatus(c *gin.Context) {
	var update StatusUpdate
	if !readBody(c, &update) {
		return
	}
	currency, err := h.service.SetCurrencyActive(c.Request.Context(), actorOf(c), c.Param("code"), update)
	respond(c, http.StatusOK, currency, err)
}
