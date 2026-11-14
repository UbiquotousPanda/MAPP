package sample

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

// RegisterRoutes: internal/app registers these only in demo mode.
func (h *Handler) RegisterRoutes(r gin.IRoutes) {
	r.GET("/sample-folders", h.listFolders)
	r.POST("/sample-folders", h.createFolder)
	r.PATCH("/sample-folders/:folderId", h.updateFolder)
	r.DELETE("/sample-folders/:folderId", h.deleteFolder)
	r.POST("/sample-folders/:folderId/notes", h.createNote)
	r.DELETE("/sample-notes/:noteId", h.deleteNote)
}

func (h *Handler) listFolders(c *gin.Context) {
	a, _ := actor.From(c.Request.Context())
	folders, err := h.service.ListFolders(c.Request.Context(), a)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, FolderPage{Items: folders, Total: len(folders)})
}

func (h *Handler) createFolder(c *gin.Context) {
	var input FolderInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	folder, err := h.service.CreateFolder(c.Request.Context(), a, input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, folder)
}

func (h *Handler) updateFolder(c *gin.Context) {
	var update FolderUpdate
	if err := web.BindJSON(c, &update); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	folder, err := h.service.UpdateFolder(c.Request.Context(), a, c.Param("folderId"), update)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, folder)
}

func (h *Handler) deleteFolder(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("folderId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	entry, err := h.service.DeleteFolder(ctx, a, c.Param("folderId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}

func (h *Handler) createNote(c *gin.Context) {
	var input NoteInput
	if err := web.BindJSON(c, &input); err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	note, err := h.service.CreateNote(c.Request.Context(), a, c.Param("folderId"), input)
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusCreated, note)
}

func (h *Handler) deleteNote(c *gin.Context) {
	ctx, err := history.SeenVersion(c, c.Param("noteId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	a, _ := actor.From(c.Request.Context())
	entry, err := h.service.DeleteNote(ctx, a, c.Param("noteId"))
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, history.DeleteResult{RecycleBinEntry: entry.View()})
}
