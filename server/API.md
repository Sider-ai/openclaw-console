# Console API (AIP Resource-Oriented)

Version prefix: `/api/v1`

Canonical machine-readable spec: `openapi.yaml`

## Resources

- `modelSettings/default`
- `providers/{provider}` where `provider` is discovered from local `openclaw models list --all`
- `providers/{provider}/authProfiles/{auth_profile}`
- `channels/telegram`
- `modelCatalogEntries/{model_catalog_entry}`
- `codexAuthSessions/{codex_auth_session}`

## Methods

### ModelSettings

- `GET /api/v1/modelSettings/default`
- `PATCH /api/v1/modelSettings/default?update_mask=default_model`

### Providers

- `GET /api/v1/providers`
- `GET /api/v1/providers/{provider}`
- `POST /api/v1/providers/{provider}:connectApiKey`
- `POST /api/v1/providers/{provider}:disconnect`
- `POST /api/v1/auth:reset`

### AuthProfiles

- `GET /api/v1/providers/{provider}/authProfiles`
- `GET /api/v1/providers/{provider}/authProfiles/{auth_profile}`

### Channels

- `GET /api/v1/channels/telegram`
- `PATCH /api/v1/channels/telegram`
- `POST /api/v1/channels/telegram:test`
- `POST /api/v1/channels/telegram:disconnect`

### ModelCatalogEntries

- `GET /api/v1/modelCatalogEntries`
  - Snapshot mode (all available models): no query params needed.
  - Provider mode (paged): `?provider={provider}&page_size=&page_token=`

## Notes

- `GET /api/v1/providers/{provider}` and `GET /api/v1/modelCatalogEntries` support providers discovered by local OpenClaw CLI.
- Mutating provider operations are managed for providers flagged by the API as `supportsApiKey=true`, plus `openai-codex`:
  - `POST /api/v1/providers/{provider}:connectApiKey`
  - `POST /api/v1/providers/{provider}:disconnect`
  - `GET /api/v1/providers/{provider}/authProfiles`
  - `GET /api/v1/providers/{provider}/authProfiles/{auth_profile}`

### CodexAuthSessions

- `POST /api/v1/codexAuthSessions`
- `GET /api/v1/codexAuthSessions/{codex_auth_session}`
- `POST /api/v1/codexAuthSessions/{codex_auth_session}:submitRedirect`
- `POST /api/v1/codexAuthSessions/{codex_auth_session}:cancel`

## Error shape

```json
{
  "error": {
    "code": 400,
    "status": "INVALID_ARGUMENT",
    "message": "provider is required"
  }
}
```
