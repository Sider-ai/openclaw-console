# openclaw-console

A self-hosted web console for managing [OpenClaw](https://github.com/openclaw/openclaw) instances. Configure AI providers, models, chat channels, and extensions through a clean browser UI.

**Key features:**

- Manage AI providers and model routing
- Configure Telegram, QQ Bot, and WeCom channels
- OAuth session management for Codex
- Extension system for adding custom functionality
- Single binary deployment with embedded web assets

## Quick Start

**Prerequisites:** Go 1.22+, Node.js 18+, npm

1. Start the API server:

```bash
cd server
go run ./cmd/server
```

2. Start the web UI (dev mode):

```bash
cd web
npm install
VITE_ADMIN_API_BASE=http://127.0.0.1:18080/api npm run dev
```

3. Open `http://127.0.0.1:3000` in your browser.

## Build

Build a single self-contained binary with embedded web assets:

```bash
make build                    # current platform → dist/openclaw-console
make build-linux-amd64        # Linux x86_64
```

Run the binary:

```bash
./dist/openclaw-console
# Web UI: http://127.0.0.1:18080
# Health: http://127.0.0.1:18080/healthz
```

## Architecture

```
openclaw-console/
├── server/                   Go backend (Chi router)
│   ├── cmd/server/           Entry point
│   ├── pkg/console/          Exported Extension interface + Bootstrap
│   ├── internal/api/         HTTP handlers + router
│   ├── internal/openclaw/    CLI wrapper, cache, store, sessions
│   └── internal/ui/          Embedded web assets (go:embed)
├── web/                      React + Vite + TypeScript frontend
│   └── src/
│       ├── components/       UI components (shadcn/ui)
│       ├── hooks/            Data fetching hooks
│       ├── pages/            Route pages
│       └── lib/              API client, types, navigation
└── scripts/                  Build helpers
```

### Extension System

The console supports runtime extensions via the `Extension` interface in `pkg/console`:

```go
type Extension interface {
    ID() string
    DisplayName() string
    Icon() string
    BasePath() string
    Handler() http.Handler
    Start(ctx context.Context) error
}
```

Extensions are registered at startup via `console.Bootstrap()` and automatically discovered by the frontend through `GET /api/v1/extensions`.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `OPENCLAW_HOME` | OpenClaw default | Override OpenClaw home directory |
| `OPENCLAW_CONFIG_PATH` | OpenClaw default | Override config file path |
| `OPENCLAW_CONSOLE_ADDR` | `:18080` | Listen address |
| `OPENCLAW_CONSOLE_AUTH_TOKEN` | empty | Enable Bearer token auth |

## Development

Backend:

```bash
cd server
go test ./...         # tests
golangci-lint run     # lint
```

Frontend:

```bash
cd web
npm run lint          # ESLint
npm run build         # TypeScript check + production build
```

## Versioning

Release tags use the `server/vX.Y.Z` format (Go sub-module convention):

```bash
git tag server/v0.2.0
git push origin server/v0.2.0
```

## License

[MIT](LICENSE)
