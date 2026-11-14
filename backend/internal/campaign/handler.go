package campaign

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/web"
	"mapp/internal/rollup"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

func (h *Handler) RegisterRoutes(r gin.IRoutes) {
	r.GET("/plans/:planId/campaigns", h.listPlanCampaigns)
	r.POST("/plans/:planId/campaigns", h.createCampaign)
	r.GET("/campaigns/:campaignId", h.getCampaign)
	r.PATCH("/campaigns/:campaignId", h.updateCampaign)
	r.DELETE("/campaigns/:campaignId", h.deleteCampaign)
	r.POST("/campaigns/:campaignId/initiatives", h.createInitiative)
	r.GET("/initiatives/:initiativeId", h.getInitiative)
	r.PATCH("/initiatives/:initiativeId", h.updateInitiative)
	r.DELETE("/initiatives/:initiativeId", h.deleteInitiative)
	r.GET("/campaigns/:campaignId/destinations", h.campaignDestinations)
	r.POST("/campaigns/:campaignId/move", h.moveCampaign)
	r.POST("/campaigns/:campaignId/copy", h.copyCampaign)
	r.GET("/initiatives/:initiativeId/destinations", h.initiativeDestinations)
	r.POST("/initiatives/:initiativeId/move", h.moveInitiative)
	r.POST("/initiatives/:initiativeId/copy", h.copyInitiative)
	r.PUT("/campaigns/:campaignId/budget-phasing", h.setCampaignBudgetPhasing)
	r.PUT("/initiatives/:initiativeId/budget-phasing", h.setInitiativeBudgetPhasing)
}

func (h *Handler) listPlanCampaigns(c *gin.Context) {
	a, _ := actor.From(c.Request.Context()) // put there by the sign-in middleware
	list, err := h.service.ListPlanCampaigns(c.Request.Context(), a, c.Param("planId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, list)
}

func (h *Handler) createCampaign(c *gin.Context) {
	var input CampaignInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	campaign, err := h.service.CreateCampaign(c.Request.Context(), a, c.Param("planId"), input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, campaign)
}

func (h *Handler) getCampaign(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	campaign, err := h.service.GetCampaign(c.Request.Context(), a, c.Param("campaignId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, campaign)
}

func (h *Handler) updateCampaign(c *gin.Context) {
	var update CampaignUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	campaign, err := h.service.UpdateCampaign(c.Request.Context(), a, c.Param("campaignId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, campaign)
}

// The delete answers the recycle-bin entry of the record and everything below it, so the web app can offer Undo.
func (h *Handler) deleteCampaign(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("campaignId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(ctx)
	entry, err := h.service.DeleteCampaign(ctx, a, c.Param("campaignId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}

func (h *Handler) createInitiative(c *gin.Context) {
	var input InitiativeInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	initiative, err := h.service.CreateInitiative(c.Request.Context(), a, c.Param("campaignId"), input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, initiative)
}

func (h *Handler) getInitiative(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	initiative, err := h.service.GetInitiative(c.Request.Context(), a, c.Param("initiativeId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, initiative)
}

func (h *Handler) updateInitiative(c *gin.Context) {
	var update InitiativeUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	initiative, err := h.service.UpdateInitiative(c.Request.Context(), a, c.Param("initiativeId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, initiative)
}

func (h *Handler) deleteInitiative(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("initiativeId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(ctx)
	entry, err := h.service.DeleteInitiative(ctx, a, c.Param("initiativeId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}

func (h *Handler) campaignDestinations(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	list, err := h.service.CampaignDestinations(c.Request.Context(), a, c.Param("campaignId"), c.Request.URL.Query().Get("purpose"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, list)
}

func (h *Handler) moveCampaign(c *gin.Context) {
	var move CampaignMove
	if err := web.BindJSON(c, &move); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	campaign, err := h.service.MoveCampaign(c.Request.Context(), a, c.Param("campaignId"), move)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, campaign)
}

func (h *Handler) copyCampaign(c *gin.Context) {
	var request CampaignCopy
	if err := web.BindJSON(c, &request); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	campaign, err := h.service.CopyCampaign(c.Request.Context(), a, c.Param("campaignId"), request)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, campaign)
}

func (h *Handler) initiativeDestinations(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	list, err := h.service.InitiativeDestinations(c.Request.Context(), a, c.Param("initiativeId"), c.Request.URL.Query().Get("purpose"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, list)
}

func (h *Handler) moveInitiative(c *gin.Context) {
	var move InitiativeMove
	if err := web.BindJSON(c, &move); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	initiative, err := h.service.MoveInitiative(c.Request.Context(), a, c.Param("initiativeId"), move)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, initiative)
}

func (h *Handler) copyInitiative(c *gin.Context) {
	var request InitiativeCopy
	if err := web.BindJSON(c, &request); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	initiative, err := h.service.CopyInitiative(c.Request.Context(), a, c.Param("initiativeId"), request)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, initiative)
}

func (h *Handler) setCampaignBudgetPhasing(c *gin.Context) {
	var input rollup.PhasingInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	campaign, err := h.service.SetCampaignBudgetPhasing(c.Request.Context(), a, c.Param("campaignId"), input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, campaign)
}

func (h *Handler) setInitiativeBudgetPhasing(c *gin.Context) {
	var input rollup.PhasingInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	initiative, err := h.service.SetInitiativeBudgetPhasing(c.Request.Context(), a, c.Param("initiativeId"), input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, initiative)
}
