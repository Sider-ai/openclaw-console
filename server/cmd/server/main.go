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
	service := openclaw.NewService(cli, store)
	warmupCtx, warmupCancel := context.WithTimeout(context.Background(), 45*time.Second)
	if err := service.Warmup(warmupCtx); err != nil {
		log.Warn().Err(err).Msg("openclaw metadata warmup failed")
	}
	warmupCancel()
	service.StartBackground(context.Background())
	sessions := openclaw.NewSessionManager(cli, store)

	handler := api.NewHandler(service, sessions)
	authUsername := os.Getenv("OPENCLAW_CONSOLE_AUTH_USER")
	authPassword := os.Getenv("OPENCLAW_CONSOLE_AUTH_PASSWORD")
	if (authUsername == "") != (authPassword == "") {
		log.Warn().
			Msg("openclaw console auth disabled: both OPENCLAW_CONSOLE_AUTH_USER and OPENCLAW_CONSOLE_AUTH_PASSWORD must be set")
		authUsername = ""
		authPassword = ""
	}
	router := api.NewRouter(handler, api.RouterConfig{
		AuthUsername: authUsername,
		AuthPassword: authPassword,
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
