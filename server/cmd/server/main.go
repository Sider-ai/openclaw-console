package main

import (
	"cmp"
	"context"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/Sider-ai/sider-openclaw-console/server/internal/api"
	"github.com/Sider-ai/sider-openclaw-console/server/internal/openclaw"
)

func main() {
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339}).
		With().Timestamp().Logger()

	paths, err := openclaw.ResolvePaths()
	if err != nil {
		log.Fatal().Err(err).Msg("resolve paths")
	}

	store := openclaw.NewStore(paths)
	cli := openclaw.NewCLI(paths)
	restarter := openclaw.NewSystemRestarter()
	service := openclaw.NewService(cli, store, restarter)
	warmupCtx, warmupCancel := context.WithTimeout(context.Background(), 45*time.Second)
	if err := service.Warmup(warmupCtx); err != nil {
		log.Warn().Err(err).Msg("openclaw metadata warmup failed")
	}
	warmupCancel()
	service.StartBackground(context.Background())
	sessions := openclaw.NewSessionManager(cli, store, restarter)

	a := api.NewAPI(service, sessions)
	router := api.NewRouter(a, api.RouterConfig{
		AuthToken: os.Getenv("OPENCLAW_CONSOLE_AUTH_TOKEN"),
	})

	addr := cmp.Or(os.Getenv("OPENCLAW_CONSOLE_ADDR"), ":18080")
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
		log.Fatal().Err(err).Msg("listen")
	}
}
