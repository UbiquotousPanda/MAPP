package settings

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/web"
)

func (h *Handler) listActivityTypes(c *gin.Context) {
	types, err := h.service.ListActivityTypes(c.Request.Context(), actorOf(c))
	respond(c, http.StatusOK, ActivityTypePage{Items: types, Total: len(types)}, err)
}

// getActivityType answers GET /api/v1/activity-types/{activityTypeId}.
func (h *Handler) getActivityType(c *gin.Context) {
	activityType, err := h.service.GetActivityType(c.Request.Context(), actorOf(c), c.Param("activityTypeId"))
	respond(c, http.StatusOK, activityType, err)
}

// createActivityType answers POST /api/v1/activity-types with 201 and the new activity type.
func (h *Handler) createActivityType(c *gin.Context) {
	var input ActivityTypeInput
	if !readBody(c, &input) {
		return
	}
	activityType, err := h.service.CreateActivityType(c.Request.Context(), actorOf(c), input)
	respond(c, http.StatusCreated, activityType, err)
}

func (h *Handler) updateActivityType(c *gin.Context) {
	var update ActivityTypeUpdate
	if !readBody(c, &update) {
		return
	}
	activityType, err := h.service.UpdateActivityType(c.Request.Context(), actorOf(c), c.Param("activityTypeId"), update)
	respond(c, http.StatusOK, activityType, err)
}

// deleteActivityType answers DELETE /api/v1/activity-types/{activityTypeId} with the recycle-bin entry.
func (h *Handler) deleteActivityType(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("activityTypeId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	entry, err := h.service.DeleteActivityType(ctx, actorOf(c), c.Param("activityTypeId"))
	respondDeleted(c, entry, err)
}

func (h *Handler) activityTypeImpact(c *gin.Context) {
	var update ActivityTypeUpdate
	if !readBody(c, &update) {
		return
	}
	impact, err := h.service.ActivityTypeImpact(c.Request.Context(), actorOf(c), c.Param("activityTypeId"), update)
	respond(c, http.StatusOK, impact, err)
}

func (h *Handler) setActivityTypeStatus(c *gin.Context) {
	var update StatusUpdate
	if !readBody(c, &update) {
		return
	}
	activityType, err := h.service.SetActivityTypeActive(c.Request.Context(), actorOf(c), c.Param("activityTypeId"), update)
	respond(c, http.StatusOK, activityType, err)
}
