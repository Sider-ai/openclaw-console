package console

import (
	"cmp"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/Sider-ai/sider-openclaw-console/server/internal/api"
	"github.com/Sider-ai/sider-openclaw-console/server/internal/openclaw"
)

// Bootstrap initialises all core services, starts extensions, and runs the
// HTTP server. It blocks until the server exits and returns any error.
//
// The caller is responsible for configuring the global logger before calling
// Bootstrap (e.g. setting zerolog's [log.Logger]).
func Bootstrap(cfg Config, extensions ...Extension) error {
	paths, err := openclaw.ResolvePaths()
	if err != nil {
		return fmt.Errorf("resolve paths: %w", err)
	}

	store := openclaw.NewStore(paths)
	cli := openclaw.NewCLI()
	restarter := openclaw.NewSystemRestarter()
	service := openclaw.NewService(cli, store, restarter)

	warmupCtx, warmupCancel := context.WithTimeout(context.Background(), 45*time.Second)
	if err := service.Warmup(warmupCtx); err != nil {
		log.Warn().Err(err).Msg("openclaw metadata warmup failed")
	}
	warmupCancel()

	service.StartBackground(context.Background())
	sessions := openclaw.NewSessionManager(cli, store, restarter)

	bgCtx := context.Background()
	for _, ext := range extensions {
		if err := ext.Start(bgCtx); err != nil {
			return fmt.Errorf("start extension %s: %w", ext.ID(), err)
		}
	}

	var extRoutes []api.ExtensionRoute
	var extInfos []api.ExtensionInfo
	for _, ext := range extensions {
		extRoutes = append(extRoutes, api.ExtensionRoute{
			ID:      ext.ID(),
			Handler: ext.Handler(),
		})
		extInfos = append(extInfos, api.ExtensionInfo{
			ID:          ext.ID(),
			DisplayName: ext.DisplayName(),
			Icon:        ext.Icon(),
			BasePath:    ext.BasePath(),
		})
	}

	a := api.NewAPI(service, sessions)
	router := api.NewRouter(a, api.RouterConfig{AuthToken: cfg.AuthToken}, extRoutes, extInfos)

	addr := cmp.Or(cfg.Addr, ":18080")
	// submitRedirect can block up to ~95s while waiting for onboard completion,
	// so WriteTimeout must be higher than that request window.
	srv := &http.Server{
		Addr:              addr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      2 * time.Minute,
		IdleTimeout:       60 * time.Second,
	}

	log.Info().Str("addr", addr).Msg("openclaw console api listening")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("listen: %w", err)
	}
	return nil
}
