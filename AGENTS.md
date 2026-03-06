# Repository Guidelines

## Project Structure & Module Organization

This repository is a small monorepo for OpenClaw Console.

- `admin-api/`: Go console API built with Chi. Entry point is `cmd/server`, core logic lives under `internal/openclaw`, HTTP handlers under `internal/api`, and embedded UI assets under `internal/ui/dist/`.
- `web-ui/`: Vite + React frontend. Main source files live under `src/`.
- `scripts/`: helper scripts, including single-binary packaging.
- `dist/`: build outputs such as `openclaw-console` and Linux release binaries.

Keep backend and frontend changes scoped to their module unless the API contract changes.

## Build, Test, and Development Commands

- `cd admin-api && go run ./cmd/server`: run the backend on `:18080`.
- `cd web-ui && VITE_ADMIN_API_BASE=http://127.0.0.1:18080/api npm run dev`: run the UI locally on `:3000`.
- `cd admin-api && go test ./...`: run backend tests.
- `cd web-ui && npm run lint`: run frontend lint checks.
- `cd web-ui && npm run build`: verify the production frontend build.
- `./scripts/build-single-binary.sh` or `make build`: build one executable with embedded UI.
- `make build-linux-amd64`: produce the Linux `x86_64` binary in `dist/`.

## Coding Style & Naming Conventions

Use standard Go formatting with `gofmt`; keep packages small and internal APIs explicit. Prefer resource-oriented handler names such as `ListProviders` and `GetProvider`.

For the frontend, use TypeScript, 2-space indentation, and existing React/Next.js patterns in `web-ui/app/`. Prefer descriptive names like `providerStatus`, `modelOptions`, and `codexSession`. Follow the current ESLint setup rather than introducing a parallel style system.

## Testing Guidelines

Backend coverage is validated with `go test ./...`; add table-driven tests when logic is non-trivial. Frontend changes are currently validated with `npm run lint` and `npm run build`. If you add tests, place them next to the code they exercise and use conventional names such as `service_test.go`.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects and occasional conventional prefixes, for example `feat: support API key configuration...` or `style(ui): adopt minimal...`. Keep commit titles concise and specific.

PRs should include:

- a short summary of behavior changes
- validation steps you ran
- screenshots or UI notes for frontend changes
- linked issue/context when the change is user-facing or operational

Prefer small PRs that keep backend API changes and UI follow-ups easy to review.

## Configuration & Security Tips

Useful env vars include `OPENCLAW_HOME`, `OPENCLAW_CONFIG_PATH`, `OPENCLAW_CONSOLE_ADDR`, and `OPENCLAW_ADMIN_SKIP_RESTART=1`. Do not commit API keys, auth profiles, `dist/` contents, or release binaries unless the task explicitly requires built artifacts.
