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

## Single Binary Build

Build web assets, embed them into `admin-api`, and produce one executable:

```bash
./scripts/build-single-binary.sh
# or:
make build
```

Run:

```bash
./dist/openclaw-console
```

Then open `http://127.0.0.1:18080` (Web UI) and `http://127.0.0.1:18080/healthz`.

Build Linux `x86_64` binary:

```bash
GOOS=linux GOARCH=amd64 ./scripts/build-single-binary.sh
# or:
make build-linux-amd64
```

Output:

```bash
./dist/openclaw-console-linux-amd64
```

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
