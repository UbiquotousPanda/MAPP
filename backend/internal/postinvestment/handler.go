package postinvestment

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/allwork"
	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/web"
)

const (
	reviewIDParam    = "reviewId"
	activityIDFilter = "activityId"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

func (h *Handler) RegisterRoutes(r gin.IRoutes) {
	r.GET("/post-investment-reviews", h.list)
	r.POST("/post-investment-reviews", h.create)
	r.GET("/post-investment-reviews/export", h.exportList)
	r.GET("/post-investment-reviews/:reviewId", h.get)
	r.PATCH("/post-investment-reviews/:reviewId", h.update)
	r.DELETE("/post-investment-reviews/:reviewId", h.delete)
	r.POST("/post-investment-reviews/:reviewId/submit", h.submit)
	r.GET("/post-investment-reviews/:reviewId/export", h.export)
}

func (h *Handler) list(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	list, err := h.service.List(c.Request.Context(), a, c.Query(activityIDFilter))
	respond(c, http.StatusOK, list, err)
}

func (h *Handler) create(c *gin.Context) {
	var in CreateInput
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Create(c.Request.Context(), a, in)
	respond(c, http.StatusCreated, view, err)
}

func (h *Handler) get(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Get(c.Request.Context(), a, c.Param(reviewIDParam))
	respond(c, http.StatusOK, view, err)
}

func (h *Handler) update(c *gin.Context) {
	var in UpdateInput
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Update(c.Request.Context(), a, c.Param(reviewIDParam), in)
	respond(c, http.StatusOK, view, err)
}

func (h *Handler) submit(c *gin.Context) {
	var in SubmitInput
	if err := web.BindJSON(c, &in); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	view, err := h.service.Submit(c.Request.Context(), a, c.Param(reviewIDParam), in)
	respond(c, http.StatusOK, view, err)
}

func (h *Handler) delete(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	entry, err := h.service.Delete(c.Request.Context(), a, c.Param(reviewIDParam))
	respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()}, err)
}

func (h *Handler) export(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	file, err := h.service.Export(c.Request.Context(), a, c.Param(reviewIDParam))
	respondFile(c, file, err)
}

func (h *Handler) exportList(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	file, err := h.service.ExportList(c.Request.Context(), a, c.Query(activityIDFilter))
	respondFile(c, file, err)
}

func respond(c *gin.Context, status int, body any, err error) {
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, status, body)
}

func respondFile(c *gin.Context, file File, err error) {
	if err != nil {
		web.RespondError(c, err)
		return
	}
	c.Header("Content-Disposition", allwork.ContentDisposition(file.Name))
	c.Data(http.StatusOK, file.ContentType, file.Body)
}
