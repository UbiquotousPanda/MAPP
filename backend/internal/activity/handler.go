package activity

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/web"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

func (h *Handler) RegisterRoutes(r gin.IRoutes) {
	r.GET("/initiatives/:initiativeId/activity-form", h.newForm)
	r.POST("/initiatives/:initiativeId/activities", h.create)
	r.GET("/plans/:planId/activities", h.listForPlan)
	r.GET("/activities/:activityId", h.get)
	r.PATCH("/activities/:activityId", h.update)
	r.DELETE("/activities/:activityId", h.delete)
	r.GET("/activities/:activityId/form", h.editForm)
	r.GET("/activities/:activityId/destinations", h.destinations)
	r.POST("/activities/:activityId/move", h.move)
	r.POST("/activities/:activityId/copy", h.copy)
	r.GET("/activities/:activityId/split-options", h.splitOptions)
	r.POST("/activities/:activityId/split-preview", h.splitPreview)
	r.POST("/activities/:activityId/split", h.split)
}

func (h *Handler) splitOptions(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	options, err := h.service.SplitOptions(c.Request.Context(), a, c.Param("activityId"))
	answer(c, http.StatusOK, options, err)
}

// splitPreview answers a split's problems in the body with 200, beside both activities as it would leave them.
func (h *Handler) splitPreview(c *gin.Context) {
	var in SplitRequest
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	preview, err := h.service.PreviewSplit(c.Request.Context(), a, c.Param("activityId"), in)
	answer(c, http.StatusOK, preview, err)
}

func (h *Handler) split(c *gin.Context) {
	var in SplitRequest
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	result, err := h.service.Split(c.Request.Context(), a, c.Param("activityId"), in)
	answer(c, http.StatusCreated, result, err)
}

func (h *Handler) newForm(c *gin.Context) {
	a, _ := actor.From(c.Request.Context()) // put there by the sign-in middleware
	form, err := h.service.NewForm(c.Request.Context(), a, c.Param("initiativeId"))
	answer(c, http.StatusOK, form, err)
}

func (h *Handler) create(c *gin.Context) {
	var input Input
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Create(c.Request.Context(), a, c.Param("initiativeId"), input)
	answer(c, http.StatusCreated, view, err)
}

func (h *Handler) listForPlan(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	summaries, err := h.service.ListForPlan(c.Request.Context(), a, c.Param("planId"))
	page := SummaryPage{Items: summaries, Total: len(summaries)}
	if err == nil {
		page.Access, err = h.service.PlanContentAccess(c.Request.Context(), c.Param("planId"))
	}
	answer(c, http.StatusOK, page, err)
}

func (h *Handler) get(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Get(c.Request.Context(), a, c.Param("activityId"))
	answer(c, http.StatusOK, view, err)
}

func (h *Handler) update(c *gin.Context) {
	var update Update
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Update(c.Request.Context(), a, c.Param("activityId"), update)
	answer(c, http.StatusOK, view, err)
}

// delete answers the recycle-bin entry so the web app can offer Undo.
func (h *Handler) delete(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("activityId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(ctx)
	entry, err := h.service.Delete(ctx, a, c.Param("activityId"))
	answer(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()}, err)
}

func (h *Handler) editForm(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	form, err := h.service.EditForm(c.Request.Context(), a, c.Param("activityId"))
	answer(c, http.StatusOK, form, err)
}

// destinations answers every initiative of the plan, with why the activity can't be moved or copied there.
func (h *Handler) destinations(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	destinations, err := h.service.Destinations(c.Request.Context(), a, c.Param("activityId"))
	answer(c, http.StatusOK, DestinationPage{Items: destinations, Total: len(destinations)}, err)
}

func (h *Handler) move(c *gin.Context) {
	var in MoveInput
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Move(c.Request.Context(), a, c.Param("activityId"), in)
	answer(c, http.StatusOK, view, err)
}

func (h *Handler) copy(c *gin.Context) {
	var in CopyInput
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Copy(c.Request.Context(), a, c.Param("activityId"), in)
	answer(c, http.StatusCreated, view, err)
}

func answer(c *gin.Context, status int, v any, err error) {
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, status, v)
}
