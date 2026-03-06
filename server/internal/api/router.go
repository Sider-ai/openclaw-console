package api

import (
	"crypto/subtle"
	"log"
	"net/http"
	"time"

	"github.com/Sider-ai/sider-openclaw-console/server/internal/ui"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type RouterConfig struct {
	AuthUsername string
	AuthPassword string
}

func NewRouter(h *Handler, cfg RouterConfig) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(requestLogger)
	r.Use(cors)
	r.Use(basicAuth(cfg))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/modelSettings/default", h.GetDefaultModelSetting)
		r.Patch("/modelSettings/default", h.PatchDefaultModelSetting)

		r.Get("/providers", h.ListProviders)
		r.Get("/providers/{provider}", h.GetProvider)
		r.Post("/providers/{provider}:connectApiKey", h.ConnectProviderAPIKey)
		r.Post("/providers/{provider}:disconnect", h.DisconnectProvider)
		r.Post("/auth:reset", h.ResetAuth)

		r.Get("/providers/{provider}/authProfiles", h.ListAuthProfiles)
		r.Get("/providers/{provider}/authProfiles/{auth_profile}", h.GetAuthProfile)

		r.Get("/channels/telegram", h.GetTelegramChannel)
		r.Patch("/channels/telegram", h.PatchTelegramChannel)
		r.Post("/channels/telegram:test", h.TestTelegramChannel)
		r.Post("/channels/telegram:disconnect", h.DisconnectTelegramChannel)
		r.Get("/channels", h.ListChannels)
		r.Get("/channels/qqbot", h.GetQQBotChannel)
		r.Patch("/channels/qqbot", h.PatchQQBotChannel)
		r.Post("/channels/qqbot:disconnect", h.DisconnectQQBotChannel)

		r.Get("/plugins", h.ListPlugins)
		r.Post("/plugins/qqbot:install", h.InstallQQBotPlugin)

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

func basicAuth(cfg RouterConfig) func(http.Handler) http.Handler {
	authEnabled := cfg.AuthUsername != "" && cfg.AuthPassword != ""

	return func(next http.Handler) http.Handler {
		if !authEnabled {
			return next
		}

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions || r.URL.Path == "/healthz" {
				next.ServeHTTP(w, r)
				return
			}

			username, password, ok := r.BasicAuth()
			if !ok ||
				subtle.ConstantTimeCompare([]byte(username), []byte(cfg.AuthUsername)) != 1 ||
				subtle.ConstantTimeCompare([]byte(password), []byte(cfg.AuthPassword)) != 1 {
				w.Header().Set("WWW-Authenticate", `Basic realm="OpenClaw Console"`)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
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
