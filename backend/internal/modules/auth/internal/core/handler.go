package core

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"mapp/internal/modules/people"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/web"
)

// Directory is what sign-in needs of the people module: who can sign in, and who is signed in.
type Directory interface {
	ActivePeople(ctx context.Context) ([]people.DemoPerson, error)
	CurrentUser(ctx context.Context, a actor.Actor) (people.CurrentUser, error)
}

type Handler struct {
	service *Service
	people  Directory
}

func NewHandler(s *Service, directory Directory) *Handler {
	return &Handler{service: s, people: directory}
}

// RegisterRoutes leaves out demo-people and sign-in when demo sign-in is off, so they answer 404.
func (h *Handler) RegisterRoutes(r gin.IRoutes) {
	if h.service.DemoMode() {
		r.GET("/auth/demo-people", h.demoPeople)
		r.POST("/auth/sign-in", h.signIn)
	}
	r.POST("/auth/sign-out", h.signOut)
}

func (h *Handler) demoPeople(c *gin.Context) {
	active, err := h.people.ActivePeople(c.Request.Context())
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, DemoPeople{Password: h.service.DemoPassword(), People: active})
}

type signInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) signIn(c *gin.Context) {
	var request signInRequest
	if err := web.BindJSON(c, &request); err != nil {
		web.RespondError(c, err)
		return
	}
	token, person, err := h.service.SignIn(c.Request.Context(), SignInAttempt{
		Email: request.Email, Password: request.Password, Client: c.ClientIP(), OldToken: sessionToken(c.Request),
	})
	if err != nil {
		web.RespondError(c, err)
		return
	}
	http.SetCookie(c.Writer, sessionCookie(c.Request, token))
	user, err := h.people.CurrentUser(c.Request.Context(), person.Actor())
	if err != nil {
		web.RespondError(c, err)
		return
	}
	web.Respond(c, http.StatusOK, user)
}

func (h *Handler) signOut(c *gin.Context) {
	// The cookie is cleared first, so this browser is signed out even if the session cannot be deleted.
	http.SetCookie(c.Writer, clearedCookie(c.Request))
	if err := h.service.SignOut(c.Request.Context(), sessionToken(c.Request)); err != nil {
		web.RespondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// sessionCookie has no expiry, so it lasts until the browser closes; Strict keeps other sites from sending it.
func sessionCookie(r *http.Request, token string) *http.Cookie {
	return &http.Cookie{
		Name:     CookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   r.TLS != nil,
	}
}

func clearedCookie(r *http.Request) *http.Cookie {
	cookie := sessionCookie(r, "")
	cookie.MaxAge = -1 // sent as Max-Age=0: delete it now
	return cookie
}
