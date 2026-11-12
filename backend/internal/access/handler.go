package access

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
	r.GET("/access/permissions", h.permissions)
	r.GET("/access/people", h.people)
	r.GET("/access/changes", h.changes)
	r.GET("/roles", h.listRoles)
	r.POST("/roles", h.createRole)
	r.GET("/roles/:roleId", h.getRole)
	r.PATCH("/roles/:roleId", h.updateRole)
	r.DELETE("/roles/:roleId", h.deleteRole)
	r.GET("/people/:personId/roles", h.personRoles)
	r.PUT("/people/:personId/roles", h.setPersonRoles)
	r.POST("/people/:personId/roles/impact", h.rolesImpact)
	r.GET("/access-rules", h.rules)
	r.PATCH("/access-rules", h.updateRules)
}

func (h *Handler) permissions(c *gin.Context) {
	web.Respond(c, http.StatusOK, h.service.Permissions())
}

func (h *Handler) people(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	list, err := h.service.ListPeopleAccess(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, PeopleAccessPage{Items: list, Total: len(list)})
}

func (h *Handler) changes(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	entries, total, err := h.service.RecentChanges(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.LogPage{Items: entries, Total: total})
}

func (h *Handler) listRoles(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	roles, err := h.service.ListRoles(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, RolePage{Items: roles, Total: len(roles)})
}

// createRole answers POST /api/v1/roles with 201 and the new role.
func (h *Handler) createRole(c *gin.Context) {
	var input RoleInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	role, err := h.service.CreateRole(c.Request.Context(), a, input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, role)
}

// getRole answers GET /api/v1/roles/{roleId}.
func (h *Handler) getRole(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	role, err := h.service.GetRole(c.Request.Context(), a, c.Param("roleId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, role)
}

// updateRole answers PATCH /api/v1/roles/{roleId} with the role after the change.
func (h *Handler) updateRole(c *gin.Context) {
	var update RoleUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	role, err := h.service.UpdateRole(c.Request.Context(), a, c.Param("roleId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, role)
}

// deleteRole answers DELETE /api/v1/roles/{roleId} with the recycle-bin entry, so the web app can offer Undo.
func (h *Handler) deleteRole(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("roleId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	entry, err := h.service.DeleteRole(ctx, a, c.Param("roleId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}

// personRoles answers GET /api/v1/people/{personId}/roles.
func (h *Handler) personRoles(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	roles, err := h.service.PersonRoles(c.Request.Context(), a, c.Param("personId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, roles)
}

// setPersonRoles answers PUT /api/v1/people/{personId}/roles with the person's roles after the change.
func (h *Handler) setPersonRoles(c *gin.Context) {
	var update PersonRolesUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	roles, err := h.service.SetPersonRoles(c.Request.Context(), a, c.Param("personId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, roles)
}

// rolesImpact answers POST /api/v1/people/{personId}/roles/impact with the warnings before saving.
func (h *Handler) rolesImpact(c *gin.Context) {
	var update PersonRolesUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	impact, err := h.service.CheckRolesImpact(c.Request.Context(), a, c.Param("personId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, impact)
}

// rules answers GET /api/v1/access-rules.
func (h *Handler) rules(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	rules, err := h.service.GetRules(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, rules)
}

// updateRules answers PATCH /api/v1/access-rules with the rules after the change.
func (h *Handler) updateRules(c *gin.Context) {
	var update RulesUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	rules, err := h.service.UpdateRules(c.Request.Context(), a, update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, rules)
}
