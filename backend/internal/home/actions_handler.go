package home

import (
	"github.com/gin-gonic/gin"

	"mapp/internal/platform/actor"
)

type ActionsHandler struct {
	service *ActionsService
}

func NewActionsHandler(s *ActionsService) *ActionsHandler {
	return &ActionsHandler{service: s}
}

func (h *ActionsHandler) RegisterRoutes(r gin.IRoutes) {
	r.GET("/home/action-items", h.actionItems)
	r.POST("/home/action-items/remind-later", h.remindLater)
}

func (h *ActionsHandler) actionItems(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	page, err := h.service.ActionItems(c.Request.Context(), a)
	answer(c, page, err)
}

func (h *ActionsHandler) remindLater(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.RemindLater(c.Request.Context(), a)
	answer(c, view, err)
}
