package settings

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/history"
	"mapp/internal/platform/web"
)

// createOption answers POST /api/v1/shell-attributes/{attributeId}/options with 201 and the new option.
func (h *Handler) createOption(c *gin.Context) {
	var input OptionInput
	if !readBody(c, &input) {
		return
	}
	option, err := h.service.CreateOption(c.Request.Context(), actorOf(c), c.Param("attributeId"), input)
	respond(c, http.StatusCreated, option, err)
}

func (h *Handler) checkImport(c *gin.Context) {
	var file ImportFile
	if !readBody(c, &file) {
		return
	}
	check, err := h.service.CheckImport(c.Request.Context(), actorOf(c), c.Param("attributeId"), file)
	respond(c, http.StatusOK, check, err)
}

func (h *Handler) importOptions(c *gin.Context) {
	var file ImportFile
	if !readBody(c, &file) {
		return
	}
	result, err := h.service.Import(c.Request.Context(), actorOf(c), c.Param("attributeId"), file)
	respond(c, http.StatusOK, result, err)
}

// getOption answers GET /api/v1/shell-attribute-options/{optionId} with the option as it is stored now.
func (h *Handler) getOption(c *gin.Context) {
	option, err := h.service.GetOption(c.Request.Context(), actorOf(c), c.Param("optionId"))
	respond(c, http.StatusOK, option, err)
}

// updateOption answers PATCH /api/v1/shell-attribute-options/{optionId} with the option after the change.
func (h *Handler) updateOption(c *gin.Context) {
	var update OptionUpdate
	if !readBody(c, &update) {
		return
	}
	option, err := h.service.UpdateOption(c.Request.Context(), actorOf(c), c.Param("optionId"), update)
	respond(c, http.StatusOK, option, err)
}

// deleteOption answers DELETE /api/v1/shell-attribute-options/{optionId} with the recycle-bin entry.
func (h *Handler) deleteOption(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("optionId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	entry, err := h.service.DeleteOption(ctx, actorOf(c), c.Param("optionId"))
	respondDeleted(c, entry, err)
}

func (h *Handler) setOptionStatus(c *gin.Context) {
	var update StatusUpdate
	if !readBody(c, &update) {
		return
	}
	option, err := h.service.SetOptionActive(c.Request.Context(), actorOf(c), c.Param("optionId"), update)
	respond(c, http.StatusOK, option, err)
}

// moveOption answers POST /api/v1/shell-attribute-options/{optionId}/move with the option in its new place.
func (h *Handler) moveOption(c *gin.Context) {
	var in OptionMoveInput
	if !readBody(c, &in) {
		return
	}
	option, err := h.service.MoveOption(c.Request.Context(), actorOf(c), c.Param("optionId"), in)
	respond(c, http.StatusOK, option, err)
}

func (h *Handler) listOptions(c *gin.Context) {
	query := c.Request.URL.Query()
	filter := OptionFilter{Q: query.Get("q"), Status: query.Get("status"), Limit: defaultOptionLimit}
	if query.Has("limit") {
		filter.Limit = wholeNumber(query.Get("limit"))
	}
	if query.Has("offset") {
		filter.Offset = wholeNumber(query.Get("offset"))
	}
	options, err := h.service.ListOptions(c.Request.Context(), actorOf(c), c.Param("attributeId"), filter)
	respond(c, http.StatusOK, options, err)
}
