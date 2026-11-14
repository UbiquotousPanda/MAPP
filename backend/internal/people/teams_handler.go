package people

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/web"
)

func (h *Handler) listTeams(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	teams, err := h.service.ListTeams(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, TeamPage{Items: teams, Total: len(teams)})
}

func (h *Handler) createTeam(c *gin.Context) {
	var input TeamInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	team, err := h.service.CreateTeam(c.Request.Context(), a, input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, team)
}

func (h *Handler) getTeam(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	team, err := h.service.GetTeam(c.Request.Context(), a, c.Param("teamId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, team)
}

func (h *Handler) updateTeam(c *gin.Context) {
	var update TeamUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	team, err := h.service.UpdateTeam(c.Request.Context(), a, c.Param("teamId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, team)
}

func (h *Handler) deleteTeam(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("teamId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	entry, err := h.service.DeleteTeam(ctx, a, c.Param("teamId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}

func (h *Handler) checkTeamImpact(c *gin.Context) {
	var update TeamUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	impact, err := h.service.TeamImpact(c.Request.Context(), a, c.Param("teamId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, impact)
}

func (h *Handler) setTeamStatus(c *gin.Context) {
	var update StatusUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	team, err := h.service.SetTeamStatus(c.Request.Context(), a, c.Param("teamId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, team)
}
