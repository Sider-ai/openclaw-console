package api

import (
	"log"
	"net/http"
	"time"

	"github.com/Sider-ai/sider-openclaw-console/admin-api/internal/ui"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(h *Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(requestLogger)
	r.Use(cors)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/modelSettings/default", h.GetDefaultModelSetting)
		r.Patch("/modelSettings/default", h.PatchDefaultModelSetting)

		r.Get("/providers/{provider}", h.GetProvider)
		r.Post("/providers/openai:connectApiKey", h.ConnectOpenAIAPIKey)
		r.Post("/providers/{provider}:disconnect", h.DisconnectProvider)

		r.Get("/providers/{provider}/authProfiles", h.ListAuthProfiles)
		r.Get("/providers/{provider}/authProfiles/{auth_profile}", h.GetAuthProfile)

		r.Get("/modelCatalogEntries", h.ListModelCatalogEntries)

		r.Post("/codexAuthSessions", h.CreateCodexAuthSession)
		r.Post("/codexAuthSessions/{codex_auth_session}:submitRedirect", h.SubmitCodexRedirect)
		r.Post("/codexAuthSessions/{codex_auth_session}:cancel", h.CancelCodexSession)
		r.Get("/codexAuthSessions/{codex_auth_session}", h.GetCodexAuthSession)
	})

	uiHandler := ui.NewHandler()
	r.NotFound(uiHandler.ServeHTTP)

	return r
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
