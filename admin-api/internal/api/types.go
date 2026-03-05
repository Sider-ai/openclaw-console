package api

type APIError struct {
	Error APIErrorBody `json:"error"`
}

type APIErrorBody struct {
	Code    int    `json:"code"`
	Status  string `json:"status"`
	Message string `json:"message"`
	Details []any  `json:"details,omitempty"`
}

type patchModelSettingRequest struct {
	DefaultModel string `json:"defaultModel"`
}

type connectAPIKeyRequest struct {
	APIKey       string `json:"apiKey"`
	DefaultModel string `json:"defaultModel,omitempty"`
}

type createCodexSessionRequest struct {
	DefaultModelHint string `json:"defaultModelHint,omitempty"`
}

type submitRedirectRequest struct {
	RedirectURL string `json:"redirectUrl"`
}

type modelCatalogListResponse struct {
	ModelCatalogEntries any    `json:"modelCatalogEntries"`
	NextPageToken       string `json:"nextPageToken,omitempty"`
}

type authProfileListResponse struct {
	AuthProfiles any `json:"authProfiles"`
}

type connectAPIKeyResponse struct {
	Provider     any `json:"provider"`
	ModelSetting any `json:"modelSetting"`
}
