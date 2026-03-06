# OpenClaw Admin API (Go + Chi)

AIP-style resource-oriented admin API for OpenClaw model management.

## Run

```bash
cd admin-api
go run ./cmd/server
```

Server listens on `:18080` by default.

If `internal/ui/dist/` contains built web assets, the same server also hosts the Web UI at `/`.

Set custom address:

```bash
OPENCLAW_ADMIN_ADDR=:19090 go run ./cmd/server
```

## Build as One Binary (from repo root)

```bash
./scripts/build-single-binary.sh
./dist/openclaw-console
```

## Environment

- `OPENCLAW_HOME` (optional)
- `OPENCLAW_CONFIG_PATH` (optional)
- `OPENCLAW_ADMIN_ADDR` (optional, default `:18080`)
- `OPENCLAW_ADMIN_SKIP_RESTART=1` (optional, skip `systemctl restart openclaw`)

## Resources and Endpoints

- `GET /api/v1/modelSettings/default`
- `PATCH /api/v1/modelSettings/default?update_mask=default_model`
- `GET /api/v1/providers`
- `GET /api/v1/providers/{provider}`
- `POST /api/v1/providers/{provider}:connectApiKey`
- `POST /api/v1/providers/{provider}:disconnect`
- `POST /api/v1/auth:reset`
- `GET /api/v1/providers/{provider}/authProfiles`
- `GET /api/v1/providers/{provider}/authProfiles/{auth_profile}`
- `GET /api/v1/modelCatalogEntries` (snapshot of available models)
- `GET /api/v1/modelCatalogEntries?provider={provider}&page_size=&page_token=` (provider-scoped pagination)
- `POST /api/v1/codexAuthSessions`
- `GET /api/v1/codexAuthSessions/{codex_auth_session}`
- `POST /api/v1/codexAuthSessions/{codex_auth_session}:submitRedirect`
- `POST /api/v1/codexAuthSessions/{codex_auth_session}:cancel`

## Notes

- `GET /api/v1/providers/{provider}` and model catalog reads support providers discovered by local OpenClaw CLI.
- Provider mutating APIs are currently managed for `openai` and `openai-codex` flows.
- Codex auth is implemented as a `Session` resource backed by a managed PTY process running:
  - `openclaw onboard --auth-choice openai-codex ...`
- Session status transitions:
  - `CREATED`
  - `LAUNCHING_ONBOARD`
  - `AWAITING_REDIRECT_URL`
  - `EXCHANGING_TOKEN`
  - `MERGING_CREDENTIALS`
  - `RESTARTING_SERVICE`
  - `SUCCEEDED`
  - `FAILED`
  - `CANCELLED`
  - `EXPIRED`

## OpenAPI

- Machine-readable spec: `openapi.yaml`
- Validate:

```bash
npx -y @apidevtools/swagger-cli validate openapi.yaml
```
