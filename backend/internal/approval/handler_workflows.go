package approval

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/web"
)

func (h *Handler) listWorkflows(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	workflows, err := h.service.ListWorkflows(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, WorkflowPage{Items: workflows, Total: len(workflows)})
}

func (h *Handler) createWorkflow(c *gin.Context) {
	var input WorkflowInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	workflow, err := h.service.CreateWorkflow(c.Request.Context(), a, input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, workflow)
}

// getWorkflow answers the workflow and the activities using it.
func (h *Handler) getWorkflow(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	details, err := h.service.GetWorkflow(c.Request.Context(), a, c.Param("workflowId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, details)
}

func (h *Handler) updateWorkflow(c *gin.Context) {
	var update WorkflowUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	workflow, err := h.service.UpdateWorkflow(c.Request.Context(), a, c.Param("workflowId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, workflow)
}

func (h *Handler) deleteWorkflow(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("workflowId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	entry, err := h.service.DeleteWorkflow(ctx, a, c.Param("workflowId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}

func (h *Handler) setWorkflowActive(active bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var change StatusChange
		if err := web.BindJSON(c, &change); err != nil {
			web.RespondError(c, err)
			return
		}
		a, _ := actor.From(c.Request.Context())
		workflow, err := h.service.SetWorkflowActive(c.Request.Context(), a, c.Param("workflowId"), active, change.Version)
		if err != nil {
			web.RespondError(c, err)
			return
		}
		web.Respond(c, http.StatusOK, workflow)
	}
}

// ruleOptions answers what a level's rule may name.
func (h *Handler) ruleOptions(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	options, err := h.service.RuleOptions(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, options)
}
