package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/Sider-ai/sider-openclaw-console/admin-api/internal/api"
	"github.com/Sider-ai/sider-openclaw-console/admin-api/internal/openclaw"
)

func main() {
	paths, err := openclaw.ResolvePaths()
	if err != nil {
		log.Fatalf("resolve paths: %v", err)
	}

	store := openclaw.NewStore(paths)
	cli := openclaw.NewCLI(paths)
	service := openclaw.NewService(cli, store)
	warmupCtx, warmupCancel := context.WithTimeout(context.Background(), 45*time.Second)
	if err := service.Warmup(warmupCtx); err != nil {
		log.Printf("openclaw metadata warmup failed: %v", err)
	}
	warmupCancel()
	service.StartBackground(context.Background())
	sessions := openclaw.NewSessionManager(cli, store)

	handler := api.NewHandler(service, sessions)
	router := api.NewRouter(handler)

	addr := envOrDefault("OPENCLAW_ADMIN_ADDR", ":18080")
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

	log.Printf("openclaw admin api listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("listen: %v", err)
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
