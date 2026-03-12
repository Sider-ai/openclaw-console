package main

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/Sider-ai/sider-openclaw-console/server/internal/updater"
	"github.com/Sider-ai/sider-openclaw-console/server/pkg/console"
)

func main() {
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339}).
		With().Timestamp().Logger()

	var extensions []console.Extension
	if os.Getenv("OPENCLAW_UPDATER_ENABLED") == "1" {
		extensions = append(extensions, updater.New(updater.Config{
			GitHubToken: os.Getenv("GITHUB_TOKEN"),
			StateFile:   os.Getenv("OPENCLAW_UPDATER_STATE_FILE"),
			Components: []updater.ComponentConfig{
				{
					ID:          "openclaw-console",
					DisplayName: "OpenClaw Console",
					GitHubOwner: "Sider-ai",
					GitHubRepo:  "sider-openclaw-console",
					AssetName:   "openclaw-console-linux-amd64",
					BinaryPath:  "/usr/local/bin/openclaw-console",
					ServiceName: "openclaw-console",
				},
				{
					ID:          "siderclaw-gateway",
					DisplayName: "SiderClaw Gateway",
					GitHubOwner: "Sider-ai",
					GitHubRepo:  "siderclaw-gateway",
					AssetName:   "siderclaw-gateway-linux-amd64",
					BinaryPath:  "/usr/local/bin/siderclaw-gateway",
					ServiceName: "siderclaw-gateway",
				},
				{
					ID:          "browser-mcp",
					DisplayName: "Browser MCP",
					GitHubOwner: "Sider-ai",
					GitHubRepo:  "sider-extension-mcp",
					AssetName:   "extension-mcp-linux-amd64",
					BinaryPath:  "/usr/local/bin/browser-mcp",
					ServiceName: "browser-mcp",
				},
			},
		}))
	}

	if err := console.Bootstrap(console.Config{
		Addr:      os.Getenv("OPENCLAW_CONSOLE_ADDR"),
		AuthToken: os.Getenv("OPENCLAW_CONSOLE_AUTH_TOKEN"),
	}, extensions...); err != nil {
		log.Fatal().Err(err).Msg("server error")
	}
}
