# Admin API (AIP Resource-Oriented)

Version prefix: `/api/v1`

Canonical machine-readable spec: `openapi.yaml`

## Resources

- `modelSettings/default`
- `providers/{provider}` where `provider` is `openai` or `openai-codex`
- `providers/{provider}/authProfiles/{auth_profile}`
- `modelCatalogEntries/{model_catalog_entry}`
- `codexAuthSessions/{codex_auth_session}`

## Methods

### ModelSettings

- `GET /api/v1/modelSettings/default`
- `PATCH /api/v1/modelSettings/default?update_mask=default_model`

### Providers

- `GET /api/v1/providers/{provider}`
- `POST /api/v1/providers/openai:connectApiKey`
- `POST /api/v1/providers/{provider}:disconnect`

### AuthProfiles

- `GET /api/v1/providers/{provider}/authProfiles`
- `GET /api/v1/providers/{provider}/authProfiles/{auth_profile}`

### ModelCatalogEntries

- `GET /api/v1/modelCatalogEntries?provider=openai|openai-codex&page_size=&page_token=`

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
