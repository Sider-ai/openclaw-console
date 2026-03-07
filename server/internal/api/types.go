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

type patchTelegramChannelRequest struct {
	Enabled        bool     `json:"enabled"`
	BotToken       *string  `json:"botToken,omitempty"`
	DMPolicy       string   `json:"dmPolicy"`
	AllowFrom      []string `json:"allowFrom,omitempty"`
	GroupPolicy    string   `json:"groupPolicy"`
	RequireMention bool     `json:"requireMention"`
}

type testTelegramChannelRequest struct {
	BotToken string `json:"botToken,omitempty"`
}

type patchQQBotChannelRequest struct {
	Enabled            bool     `json:"enabled"`
	AppID              string   `json:"appId"`
	ClientSecret       *string  `json:"clientSecret,omitempty"`
	AllowFrom          []string `json:"allowFrom,omitempty"`
	MarkdownSupport    bool     `json:"markdownSupport"`
	ImageServerBaseURL string   `json:"imageServerBaseUrl,omitempty"`
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

type channelListResponse struct {
	Channels any `json:"channels"`
}

type pluginListResponse struct {
	Plugins any `json:"plugins"`
}

type telegramPairingListResponse struct {
	Pairings any `json:"pairings"`
}
