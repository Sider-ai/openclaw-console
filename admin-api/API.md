# Admin API (AIP Resource-Oriented)

Version prefix: `/v1`

Canonical machine-readable spec: `openapi.yaml`

## Resources

- `modelSettings/default`
- `providers/{provider}` where `provider` is `openai` or `openai-codex`
- `providers/{provider}/authProfiles/{auth_profile}`
- `modelCatalogEntries/{model_catalog_entry}`
- `codexAuthSessions/{codex_auth_session}`

## Methods

### ModelSettings

- `GET /v1/modelSettings/default`
- `PATCH /v1/modelSettings/default?update_mask=default_model`

### Providers

- `GET /v1/providers/{provider}`
- `POST /v1/providers/openai:connectApiKey`
- `POST /v1/providers/{provider}:disconnect`

### AuthProfiles

- `GET /v1/providers/{provider}/authProfiles`
- `GET /v1/providers/{provider}/authProfiles/{auth_profile}`

### ModelCatalogEntries

- `GET /v1/modelCatalogEntries?provider=openai|openai-codex&page_size=&page_token=`

### CodexAuthSessions

- `POST /v1/codexAuthSessions`
- `GET /v1/codexAuthSessions/{codex_auth_session}`
- `POST /v1/codexAuthSessions/{codex_auth_session}:submitRedirect`
- `POST /v1/codexAuthSessions/{codex_auth_session}:cancel`

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
