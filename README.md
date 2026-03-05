# sider-openclaw-console

OpenClaw Console monorepo:

- `admin-api/`: Go + Chi admin API (AIP-style resource-oriented design)
- `web-ui/`: Next.js web console for models/providers/session auth flows
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
NEXT_PUBLIC_ADMIN_API_BASE=http://127.0.0.1:18080 npm run dev
```

3. Open:

- Web UI: `http://127.0.0.1:3000`
- Admin API health: `http://127.0.0.1:18080/healthz`

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
