package api

import (
	"crypto/subtle"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog/log"

	"github.com/Sider-ai/openclaw-console/server/internal/ui"
)

type RouterConfig struct {
	AuthToken string
}

func NewRouter(a *API, cfg RouterConfig, extRoutes []ExtensionRoute, extInfos []ExtensionInfo) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(requestLogger)
	r.Use(cors)
	r.Use(bearerAuth(cfg))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	humaConfig := huma.DefaultConfig("OpenClaw Console API", "1.0.0")
	humaAPI := humachi.New(r, humaConfig)
	registerRoutes(a, humaAPI)

	// Extensions
	huma.Get(humaAPI, "/api/v1/extensions", listExtensionsHandler(extInfos))
	for _, ext := range extRoutes {
		r.Mount("/api/v1/extensions/"+ext.ID, ext.Handler)
	}

	uiHandler := ui.NewHandler()
	r.NotFound(uiHandler.ServeHTTP)

	return r
}

func registerRoutes(a *API, api huma.API) {
	huma.Get(api, "/api/v1/version", a.GetVersion)

	// Gateway
	huma.Get(api, "/api/v1/gateway/status", a.GetGatewayStatus)
	huma.Post(api, "/api/v1/gateway:start", a.StartGateway)
	huma.Post(api, "/api/v1/gateway:stop", a.StopGateway)

	// Model settings
	huma.Get(api, "/api/v1/modelSettings/default", a.GetDefaultModelSetting)
	huma.Patch(api, "/api/v1/modelSettings/default", a.PatchDefaultModelSetting)

	// Providers
	huma.Get(api, "/api/v1/providers", a.ListProviders)
	huma.Get(api, "/api/v1/providers/{provider}", a.GetProvider)
	huma.Post(api, "/api/v1/providers/{provider}:connectApiKey", a.ConnectProviderAPIKey)
	huma.Post(api, "/api/v1/providers/{provider}:disconnect", a.DisconnectProvider)

	// Auth
	huma.Post(api, "/api/v1/auth:reset", a.ResetAuth)
	huma.Get(api, "/api/v1/providers/{provider}/authProfiles", a.ListAuthProfiles)
	huma.Get(api, "/api/v1/providers/{provider}/authProfiles/{auth_profile}", a.GetAuthProfile)

	// Telegram channel
	huma.Get(api, "/api/v1/channels/telegram", a.GetTelegramChannel)
	huma.Patch(api, "/api/v1/channels/telegram", a.PatchTelegramChannel)
	huma.Post(api, "/api/v1/channels/telegram:test", a.TestTelegramChannel)
	huma.Post(api, "/api/v1/channels/telegram:disconnect", a.DisconnectTelegramChannel)
	huma.Get(api, "/api/v1/channels/telegram/pairings", a.ListTelegramPairings)
	huma.Post(api, "/api/v1/channels/telegram/pairings/{code}:approve", a.ApproveTelegramPairing)
	huma.Post(api, "/api/v1/channels/telegram/pairings/{code}:reject", a.RejectTelegramPairing)

	// Channels
	huma.Get(api, "/api/v1/channels", a.ListChannels)

	// QQ Bot channel
	huma.Get(api, "/api/v1/channels/qqbot", a.GetQQBotChannel)
	huma.Patch(api, "/api/v1/channels/qqbot", a.PatchQQBotChannel)
	huma.Post(api, "/api/v1/channels/qqbot:disconnect", a.DisconnectQQBotChannel)

	// WeCom App channel
	huma.Get(api, "/api/v1/channels/wecom-app", a.GetWeComAppChannel)
	huma.Patch(api, "/api/v1/channels/wecom-app", a.PatchWeComAppChannel)
	huma.Post(api, "/api/v1/channels/wecom-app:disconnect", a.DisconnectWeComAppChannel)

	// Plugins
	huma.Get(api, "/api/v1/plugins", a.ListPlugins)
	huma.Post(api, "/api/v1/plugins/qqbot:install", a.InstallQQBotPlugin)
	huma.Post(api, "/api/v1/plugins/wecom-app:install", a.InstallWeComAppPlugin)

	// Model catalog
	huma.Get(api, "/api/v1/modelCatalogEntries", a.ListModelCatalogEntries)

	// Codex auth sessions
	huma.Register(api, huma.Operation{
		OperationID:   "create-codex-auth-session",
		Method:        http.MethodPost,
		Path:          "/api/v1/codexAuthSessions",
		DefaultStatus: 201,
	}, a.CreateCodexAuthSession)
	huma.Get(api, "/api/v1/codexAuthSessions/{codex_auth_session}", a.GetCodexAuthSession)
	huma.Post(api, "/api/v1/codexAuthSessions/{codex_auth_session}:submitRedirect", a.SubmitCodexRedirect)
	huma.Post(api, "/api/v1/codexAuthSessions/{codex_auth_session}:cancel", a.CancelCodexSession)
}

func bearerAuth(cfg RouterConfig) func(http.Handler) http.Handler {
	authEnabled := cfg.AuthToken != ""

	return func(next http.Handler) http.Handler {
		if !authEnabled {
			return next
		}

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions || r.URL.Path == "/healthz" || !strings.HasPrefix(r.URL.Path, "/api/") {
				next.ServeHTTP(w, r)
				return
			}

			const prefix = "Bearer "
			auth := r.Header.Get("Authorization")
			if len(auth) <= len(prefix) ||
				auth[:len(prefix)] != prefix ||
				subtle.ConstantTimeCompare([]byte(auth[len(prefix):]), []byte(cfg.AuthToken)) != 1 {
				w.Header().Set("WWW-Authenticate", `Bearer realm="OpenClaw Console"`)
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
		log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Dur("duration", time.Since(start).Round(time.Millisecond)).
			Send()
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
