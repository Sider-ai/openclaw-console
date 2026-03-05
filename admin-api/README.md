# OpenClaw Admin API (Go + Chi)

AIP-style resource-oriented admin API for OpenClaw model management.

## Run

```bash
cd admin-api
go run ./cmd/server
```

Server listens on `:18080` by default.

Set custom address:

```bash
OPENCLAW_ADMIN_ADDR=:19090 go run ./cmd/server
```

## Environment

- `OPENCLAW_HOME` (optional)
- `OPENCLAW_CONFIG_PATH` (optional)
- `OPENCLAW_ADMIN_ADDR` (optional, default `:18080`)
- `OPENCLAW_ADMIN_SKIP_RESTART=1` (optional, skip `systemctl restart openclaw`)

## Resources and Endpoints

- `GET /v1/modelSettings/default`
- `PATCH /v1/modelSettings/default?update_mask=default_model`
- `GET /v1/providers/{provider}`
- `POST /v1/providers/openai:connectApiKey`
- `POST /v1/providers/{provider}:disconnect`
- `GET /v1/providers/{provider}/authProfiles`
- `GET /v1/providers/{provider}/authProfiles/{auth_profile}`
- `GET /v1/modelCatalogEntries?provider=openai|openai-codex&page_size=&page_token=`
- `POST /v1/codexAuthSessions`
- `GET /v1/codexAuthSessions/{codex_auth_session}`
- `POST /v1/codexAuthSessions/{codex_auth_session}:submitRedirect`
- `POST /v1/codexAuthSessions/{codex_auth_session}:cancel`

## Notes

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
