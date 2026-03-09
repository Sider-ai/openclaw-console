# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenClaw Console is a monorepo containing:

- `server/` — Go + Chi HTTP API, wraps the local `openclaw` CLI binary
- `web/` — React + Vite + TypeScript frontend, served as embedded assets in the single binary
- `scripts/` — build helpers
- `dist/` — build outputs (not committed except for release tasks)

The production artifact is a single self-contained binary (`dist/openclaw-console`) where the Go server embeds the compiled web assets via `//go:embed` from `server/internal/ui/dist/`.

## Commands

### Backend

```bash
cd server
go run ./cmd/server           # dev server on :18080
go test ./...                 # run all tests
golangci-lint run             # lint
```

### Frontend

```bash
cd web
VITE_ADMIN_API_BASE=http://127.0.0.1:18080/api npm run dev   # dev server on :3000
npm run build                 # production build + TypeScript check
npm run lint                  # ESLint
npx shadcn@latest add <name>  # install a new shadcn component
```

### Full single-binary build

```bash
make build                    # current platform → dist/openclaw-console
make build-linux-amd64        # Linux x86_64 → dist/openclaw-console-linux-amd64
```

The build script runs `npm ci && npm run build` in `web/`, copies output to `server/internal/ui/dist/`, then `go build` with `-trimpath -ldflags="-s -w"`.

## Architecture

### Backend (`server/`)

Layered as `cmd/server` → `internal/api` → `internal/openclaw`:

- **`internal/openclaw/cli.go`** — shells out to the `openclaw` CLI binary to read providers, model catalog, and manage plugins. All provider data flows through the CLI.
- **`internal/openclaw/cache.go`** — `serviceCache` holds a background-refreshed snapshot of providers + model catalog (expensive CLI calls). Most read handlers hit the cache, not the CLI directly.
- **`internal/openclaw/store.go`** — reads/writes OpenClaw config files on disk (Telegram channel config, QQ Bot config, provider API keys, auth profiles).
- **`internal/openclaw/sessions.go`** — manages Codex OAuth sessions via a PTY process running `openclaw onboard`. Session state machine: `CREATED → LAUNCHING_ONBOARD → AWAITING_REDIRECT_URL → EXCHANGING_TOKEN → MERGING_CREDENTIALS → RESTARTING_SERVICE → SUCCEEDED/FAILED/CANCELLED/EXPIRED`.
- **`internal/api/handlers.go`** — thin HTTP handlers delegating to `Service`. Resource-oriented naming (`ListProviders`, `GetProvider`, etc.).
- **`internal/ui/handler.go`** — serves embedded web assets; falls back to `index.html` for SPA routing.

API is mounted at `/api/v1`. CORS and optional HTTP Basic Auth are applied as middleware in `router.go`.

### Frontend (`web/src/`)

**State architecture** — `App.tsx` is the state hub. It instantiates all data hooks and passes derived state + callbacks down to pages via props. There is no global state library.

Key hooks:
- **`useConsoleData`** — owns provider/model data, fetches on route change, manages Codex session polling
- **`useTelegramChannel`** / **`useQQBotChannel`** — channel-specific CRUD, each enabled only when the relevant route is active
- **`useChannelsData`** — channel summary list for sidebar nav
- **`useConfirmDialog`** — Promise-based AlertDialog replacing `window.confirm`

**Routing** — React Router v6, all pages are `React.lazy()` wrapped in a single `<Suspense>`. Routes live entirely in `App.tsx`.

**UI stack** — Tailwind CSS v3 (not v4), shadcn/ui components in `src/components/ui/`, Lucide icons. Path alias `@/` maps to `src/`. `lib/api.ts` is the single fetch wrapper; errors are surfaced via `error.message` and displayed in AppShell's header section.

**Navigation** — `lib/navigation.ts` is a pure-logic module (no UI imports). `AppShell.tsx` owns all sidebar rendering including icon mapping via `ROOT_NAV_ICONS`.

## Conventions

- Go: `gofmt`, resource-oriented handler names (`ListX`, `GetX`, `PatchX`, `PostX:action`)
- TypeScript: 2-space indent, strict mode, named exports for pages and components
- Tailwind: semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`) over raw colors; `rounded-xl ring-1 ring-border/60 shadow-sm` for section cards
- New shadcn components: install with `npx shadcn@latest add <name>` from `web/`
- Keep `lib/navigation.ts` free of runtime UI dependencies (no Lucide imports)
- Frontend validation: `npm run build` (TypeScript + bundle) is the authoritative check

### Backend layering contract

**Principle: surface errors, don't mask them.**

Each layer trusts its callers. Input validation happens at the entry boundary (`internal/api` handlers) using `validator/v10` struct tags. Lower layers do not re-validate or defensively normalise values they receive.

`strings.TrimSpace` (and similar normalisation) should only be used when trimming **is** the logic — not to silently fix bad input. For example, if a caller passes `"  opus-4.6  "`, pass it through as-is; if the downstream CLI call fails, that error should surface rather than being hidden by silent trimming.

**When TrimSpace is appropriate:**
- A normalisation function whose explicit purpose is to clean input (e.g. `normalizeStringList`)
- Reading raw data from disk or process output where the source is not contract-bound

**When TrimSpace is not appropriate:**
- Defensively trimming a value received from a contract-bound caller
- Trimming before an emptiness check — if the original value is `"  "`, that's a bug in the caller; let it propagate

The same principle applies to all defensive error-masking: don't swallow, coerce, or silently default invalid state. Let errors surface so the real cause is visible.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENCLAW_HOME` | OpenClaw default | Override OpenClaw home directory |
| `OPENCLAW_CONFIG_PATH` | OpenClaw default | Override config file path |
| `OPENCLAW_CONSOLE_ADDR` | `:18080` | Listen address |
| `OPENCLAW_CONSOLE_AUTH_TOKEN` | empty | Enable Bearer token auth for console access |
| `OPENCLAW_ADMIN_SKIP_RESTART` | empty | Set to `1` to skip `systemctl restart openclaw` after config changes |
| `VITE_ADMIN_API_BASE` | `/api` | Frontend API base URL (dev only) |

## Commit & PR Style

Conventional prefixes: `feat`, `fix`, `refactor`, `style`, `chore`. Keep titles concise and specific. PRs should include a summary of behavior changes and the validation steps run.
