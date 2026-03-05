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
	APIKey string `json:"apiKey"`
}

type resetAuthRequest struct {
	Provider string `json:"provider,omitempty"`
	Restart  *bool  `json:"restart,omitempty"`
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

type providerListResponse struct {
	Providers any `json:"providers"`
}

type authProfileListResponse struct {
	AuthProfiles any `json:"authProfiles"`
}
