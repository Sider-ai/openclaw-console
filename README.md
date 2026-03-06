# sider-openclaw-console

OpenClaw Console monorepo:

- `admin-api/`: Go + Chi admin API (AIP-style resource-oriented design)
- `web-ui/`: React + Vite web console for models/providers/session auth flows
- `scripts/`: operational helper scripts

## Quick Start

1. Start admin API:

```bash
cd admin-api
go run ./cmd/server
```

2. Start web UI:

```bash
cd web-ui
npm install
VITE_ADMIN_API_BASE=http://127.0.0.1:18080/api npm run dev
```

3. Open:

- Web UI: `http://127.0.0.1:3000`
- Admin API health: `http://127.0.0.1:18080/healthz`

## Build

```bash
make build
make build-linux-amd64 # for linux amd64
```

## Run

```bash
./dist/openclaw-console
```

Server defaults:

- Web UI: `http://127.0.0.1:18080`
- Health: `http://127.0.0.1:18080/healthz`

Configurable environment variables:

| Environment Variable | Default | Description |
| --- | --- | --- |
| `OPENCLAW_HOME` | OpenClaw default home directory | Overrides the OpenClaw home directory used by the console. |
| `OPENCLAW_CONFIG_PATH` | OpenClaw default config path | Overrides the OpenClaw config file path used by the console. |
| `OPENCLAW_CONSOLE_ADDR` | `:18080` | Sets the console listen address. |
| `OPENCLAW_CONSOLE_AUTH_USER` | empty | Enables HTTP Basic Auth only when set together with `OPENCLAW_CONSOLE_AUTH_PASSWORD`. |
| `OPENCLAW_CONSOLE_AUTH_PASSWORD` | empty | Enables HTTP Basic Auth only when set together with `OPENCLAW_CONSOLE_AUTH_USER`. |
| `OPENCLAW_ADMIN_SKIP_RESTART` | empty | Set to `1` to skip `systemctl restart openclaw` after config changes. |

## Validation

Backend:

```bash
cd admin-api
go test ./...
go fix ./...
golangci-lint run
```

Frontend:

```bash
cd web-ui
npm run lint
npm run build
```
