package api

import "github.com/Sider-ai/sider-openclaw-console/server/internal/openclaw"

// Model settings

type GetDefaultModelSettingInput struct{}
type GetDefaultModelSettingOutput struct {
	Body openclaw.ModelSettingResource
}

type PatchDefaultModelSettingInput struct {
	UpdateMask string `query:"update_mask" required:"true" enum:"default_model"`
	Body       struct {
		DefaultModel string `json:"defaultModel" minLength:"1"`
	}
}
type PatchDefaultModelSettingOutput struct {
	Body openclaw.ModelSettingResource
}

// Providers

type ListProvidersInput struct{}
type ListProvidersOutput struct {
	Body struct {
		Providers []openclaw.ProviderSummaryResource `json:"providers"`
	}
}

type GetProviderInput struct {
	Provider string `path:"provider"`
}
type GetProviderOutput struct {
	Body openclaw.ProviderResource
}

type ConnectProviderAPIKeyInput struct {
	Provider string `path:"provider"`
	Body     struct {
		APIKey string `json:"apiKey" minLength:"1"`
	}
}
type ConnectProviderAPIKeyOutput struct {
	Body openclaw.ProviderResource
}

type DisconnectProviderInput struct {
	Provider string `path:"provider"`
}
type DisconnectProviderOutput struct {
	Body openclaw.ProviderResource
}

// Auth

type ResetAuthInput struct {
	Body struct {
		Provider string `json:"provider,omitempty"`
		Restart  *bool  `json:"restart,omitempty" default:"true"`
	}
}
type ResetAuthOutput struct {
	Body openclaw.AuthResetResult
}

type ListAuthProfilesInput struct {
	Provider string `path:"provider"`
}
type ListAuthProfilesOutput struct {
	Body struct {
		AuthProfiles []openclaw.ProfileResource `json:"authProfiles"`
	}
}

type GetAuthProfileInput struct {
	Provider    string `path:"provider"`
	AuthProfile string `path:"auth_profile"`
}
type GetAuthProfileOutput struct {
	Body *openclaw.ProfileResource
}

// Telegram channel

type GetTelegramChannelInput struct{}
type GetTelegramChannelOutput struct {
	Body openclaw.TelegramChannelResource
}

type PatchTelegramChannelInput struct {
	Body struct {
		Enabled        bool     `json:"enabled"`
		BotToken       *string  `json:"botToken,omitempty"`
		DMPolicy       string   `json:"dmPolicy"       enum:"pairing,allowlist,open,disabled" minLength:"1"`
		AllowFrom      []string `json:"allowFrom,omitempty"`
		GroupPolicy    string   `json:"groupPolicy"    enum:"allowlist,open,disabled" minLength:"1"`
		RequireMention bool     `json:"requireMention"`
	}
}
type PatchTelegramChannelOutput struct {
	Body openclaw.TelegramChannelResource
}

type TestTelegramChannelInput struct {
	Body struct {
		BotToken string `json:"botToken,omitempty"`
	}
}
type TestTelegramChannelOutput struct {
	Body openclaw.TelegramChannelTestResult
}

type DisconnectTelegramChannelInput struct{}
type DisconnectTelegramChannelOutput struct {
	Body openclaw.TelegramChannelResource
}

type ListTelegramPairingsInput struct{}
type ListTelegramPairingsOutput struct {
	Body struct {
		Pairings []openclaw.TelegramPairingResource `json:"pairings"`
	}
}

type ApproveTelegramPairingInput struct {
	Code string `path:"code"`
}
type ApproveTelegramPairingOutput struct {
	Body struct {
		Code string `json:"code"`
	}
}

type RejectTelegramPairingInput struct {
	Code string `path:"code"`
}
type RejectTelegramPairingOutput struct {
	Body struct {
		Code string `json:"code"`
	}
}

// Channels

type ListChannelsInput struct{}
type ListChannelsOutput struct {
	Body struct {
		Channels []openclaw.ChannelSummaryResource `json:"channels"`
	}
}

// QQ Bot channel

type GetQQBotChannelInput struct{}
type GetQQBotChannelOutput struct {
	Body openclaw.QQBotChannelResource
}

type PatchQQBotChannelInput struct {
	Body struct {
		Enabled            bool     `json:"enabled"`
		AppID              string   `json:"appId"                        minLength:"1"`
		ClientSecret       *string  `json:"clientSecret,omitempty"`
		AllowFrom          []string `json:"allowFrom,omitempty"`
		MarkdownSupport    bool     `json:"markdownSupport"`
		ImageServerBaseURL string   `json:"imageServerBaseUrl,omitempty"`
	}
}
type PatchQQBotChannelOutput struct {
	Body openclaw.QQBotChannelResource
}

type DisconnectQQBotChannelInput struct{}
type DisconnectQQBotChannelOutput struct {
	Body openclaw.QQBotChannelResource
}

// Plugins

type ListPluginsInput struct{}
type ListPluginsOutput struct {
	Body struct {
		Plugins []openclaw.PluginResource `json:"plugins"`
	}
}

type InstallQQBotPluginInput struct{}
type InstallQQBotPluginOutput struct {
	Body openclaw.PluginInstallResult
}

// Model catalog

type ListModelCatalogEntriesInput struct {
	Provider  string `query:"provider"`
	PageSize  int    `query:"page_size"  minimum:"1" maximum:"200" default:"50"`
	PageToken string `query:"page_token"`
}
type ListModelCatalogEntriesOutput struct {
	Body struct {
		ModelCatalogEntries []openclaw.ModelCatalogEntryResource `json:"modelCatalogEntries"`
		NextPageToken       string                               `json:"nextPageToken,omitempty"`
	}
}

// Codex auth sessions

type CreateCodexAuthSessionInput struct {
	Body struct {
		DefaultModelHint string `json:"defaultModelHint,omitempty"`
	}
}
type CreateCodexAuthSessionOutput struct {
	Body openclaw.CodexAuthSessionResource
}

type GetCodexAuthSessionInput struct {
	CodexAuthSession string `path:"codex_auth_session"`
}
type GetCodexAuthSessionOutput struct {
	Body openclaw.CodexAuthSessionResource
}

type SubmitCodexRedirectInput struct {
	CodexAuthSession string `path:"codex_auth_session"`
	Body             struct {
		RedirectURL string `json:"redirectUrl" minLength:"1" pattern:"^http://localhost:1455/auth/callback"`
	}
}
type SubmitCodexRedirectOutput struct {
	Body openclaw.CodexAuthSessionResource
}

type CancelCodexSessionInput struct {
	CodexAuthSession string `path:"codex_auth_session"`
}
type CancelCodexSessionOutput struct {
	Body openclaw.CodexAuthSessionResource
}
