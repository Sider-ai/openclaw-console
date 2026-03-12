package main

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/Sider-ai/openclaw-console/server/pkg/console"
)

func main() {
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339}).
		With().Timestamp().Logger()

	if err := console.Bootstrap(console.Config{
		Addr:      os.Getenv("OPENCLAW_CONSOLE_ADDR"),
		AuthToken: os.Getenv("OPENCLAW_CONSOLE_AUTH_TOKEN"),
	}); err != nil {
		log.Fatal().Err(err).Msg("server error")
	}
}
