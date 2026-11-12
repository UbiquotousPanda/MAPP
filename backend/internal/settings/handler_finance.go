package settings

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/web"
)

func (h *Handler) listFinanceBudgets(c *gin.Context) {
	var year *int
	if text := c.Request.URL.Query().Get("year"); text != "" {
		y, err := strconv.Atoi(text)
		if err != nil {
			web.RespondError(c, errs.BadRequest(unreadableMessage))
			return
		}
		year = &y
	}
	page, err := h.service.ListFinanceBudgets(c.Request.Context(), actorOf(c), year)
	respond(c, http.StatusOK, page, err)
}

func (h *Handler) renameFinanceBudget(c *gin.Context) {
	var input RenameInput
	if !readBody(c, &input) {
		return
	}
	budget, err := h.service.RenameFinanceBudget(c.Request.Context(), actorOf(c), c.Param("budgetId"), input)
	respond(c, http.StatusOK, budget, err)
}

// createFinanceBudgetItem answers POST /api/v1/finance-budget-items with 201 and the new item.
func (h *Handler) createFinanceBudgetItem(c *gin.Context) {
	var input ItemInput
	if !readBody(c, &input) {
		return
	}
	item, err := h.service.CreateFinanceBudgetItem(c.Request.Context(), actorOf(c), input)
	respond(c, http.StatusCreated, item, err)
}

// getFinanceBudgetItem answers GET /api/v1/finance-budget-items/{itemId}.
func (h *Handler) getFinanceBudgetItem(c *gin.Context) {
	item, err := h.service.GetFinanceBudgetItem(c.Request.Context(), actorOf(c), c.Param("itemId"))
	respond(c, http.StatusOK, item, err)
}

// updateFinanceBudgetItem answers PATCH /api/v1/finance-budget-items/{itemId} with the item after the change.
func (h *Handler) updateFinanceBudgetItem(c *gin.Context) {
	var update ItemUpdate
	if !readBody(c, &update) {
		return
	}
	item, err := h.service.UpdateFinanceBudgetItem(c.Request.Context(), actorOf(c), c.Param("itemId"), update)
	respond(c, http.StatusOK, item, err)
}

// deleteFinanceBudgetItem answers DELETE /api/v1/finance-budget-items/{itemId} with the recycle-bin entry.
func (h *Handler) deleteFinanceBudgetItem(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("itemId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	entry, err := h.service.DeleteFinanceBudgetItem(ctx, actorOf(c), c.Param("itemId"))
	respondDeleted(c, entry, err)
}

func (h *Handler) setFinanceBudgetItemStatus(c *gin.Context) {
	var update StatusUpdate
	if !readBody(c, &update) {
		return
	}
	item, err := h.service.SetFinanceBudgetItemActive(c.Request.Context(), actorOf(c), c.Param("itemId"), update)
	respond(c, http.StatusOK, item, err)
}
