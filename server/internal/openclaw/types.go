package openclaw

import "time"

const (
	ConnectionConnected = "CONNECTED"
	ProviderOpenAI      = "openai"
	ProviderOpenAICodex = "openai-codex"
	ProviderAll         = "all"
)

type NotFoundError struct{ Message string }

func (e *NotFoundError) Error() string { return e.Message }

type InputError struct{ Message string }

func (e *InputError) Error() string { return e.Message }

type ConflictError struct{ Message string }

func (e *ConflictError) Error() string { return e.Message }

type OpenClawInfoResource struct {
	Name            string `json:"name"`
	Version         string `json:"version"`
	UpdateChannel   string `json:"updateChannel"`
	LatestVersion   string `json:"latestVersion"`
	UpdateAvailable bool   `json:"updateAvailable"`
	InstallKind     string `json:"installKind"`
}

type OpenClawUpdateResult struct {
	Name   string `json:"name"`
	Output string `json:"output"`
}

type GatewayStatusResource struct {
	Name    string `json:"name"`
	Runtime string `json:"runtime"`
	Service string `json:"service"`
	RPCOk   bool   `json:"rpcOk"`
	URL     string `json:"url"`
	Healthy bool   `json:"healthy"`
}

type ModelSettingResource struct {
	Name         string `json:"name"`
	DefaultModel string `json:"defaultModel"`
}

type BuildInfoResource struct {
	Revision string `json:"revision,omitempty"`
	Time     string `json:"time,omitempty"`
	Modified bool   `json:"modified"`
}

type ProviderResource struct {
	Name           string   `json:"name"`
	ProviderID     string   `json:"providerId"`
	SupportsAPIKey bool     `json:"supportsApiKey"`
	Connection     string   `json:"connection"`
	AuthType       string   `json:"authType"`
	ProfileLabels  []string `json:"profileLabels,omitempty"`
	MissingInUse   bool     `json:"missingInUse"`
	OAuthProviders []string `json:"oauthProviders,omitempty"`
}

type ProviderSummaryResource struct {
	Name           string `json:"name"`
	ProviderID     string `json:"providerId"`
	DisplayName    string `json:"displayName"`
	SupportsAPIKey bool   `json:"supportsApiKey"`
	Managed        bool   `json:"managed"`
}

type ProfileResource struct {
	Name      string `json:"name"`
	ProfileID string `json:"profileId"`
	Provider  string `json:"provider"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	Email     string `json:"email,omitempty"`
	ExpiresAt int64  `json:"expiresAt,omitempty"`
}

type ModelCatalogEntryResource struct {
	Name          string   `json:"name"`
	ModelKey      string   `json:"modelKey"`
	DisplayName   string   `json:"displayName"`
	Provider      string   `json:"provider"`
	Input         string   `json:"input"`
	ContextWindow int64    `json:"contextWindow"`
	Available     bool     `json:"available"`
	Tags          []string `json:"tags,omitempty"`
}

type CodexAuthSessionResource struct {
	Name         string `json:"name"`
	SessionID    string `json:"sessionId"`
	State        string `json:"state"`
	AuthURL      string `json:"authUrl,omitempty"`
	ExpiresAt    int64  `json:"expiresAt"`
	CreatedAt    int64  `json:"createdAt"`
	ErrorCode    string `json:"errorCode,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

type AuthResetResult struct {
	Provider              string   `json:"provider"`
	Restart               bool     `json:"restart"`
	AuthStorePath         string   `json:"authStorePath"`
	ConfigPath            string   `json:"configPath"`
	AuthProfilesRemoved   []string `json:"authProfilesRemoved"`
	ConfigProfilesRemoved []string `json:"configProfilesRemoved"`
	AuthBackupPath        string   `json:"authBackupPath,omitempty"`
	ConfigBackupPath      string   `json:"configBackupPath,omitempty"`
	Restarted             bool     `json:"restarted"`
	RestartSkipped        bool     `json:"restartSkipped"`
	RestartError          string   `json:"restartError,omitempty"`
}

type TelegramChannelResource struct {
	Name                 string   `json:"name"`
	ChannelID            string   `json:"channelId"`
	DisplayName          string   `json:"displayName"`
	Enabled              bool     `json:"enabled"`
	Configured           bool     `json:"configured"`
	Mode                 string   `json:"mode"`
	BotTokenConfigured   bool     `json:"botTokenConfigured"`
	DMPolicy             string   `json:"dmPolicy"`
	AllowFrom            []string `json:"allowFrom,omitempty"`
	GroupPolicy          string   `json:"groupPolicy"`
	RequireMention       bool     `json:"requireMention"`
	WebhookURLConfigured bool     `json:"webhookUrlConfigured"`
	LastAppliedAction    string   `json:"lastAppliedAction,omitempty"`
}

type TelegramPairingResource struct {
	Code        string `json:"code"`
	UserID      string `json:"userId"`
	Username    string `json:"username,omitempty"`
	FirstName   string `json:"firstName,omitempty"`
	RequestedAt string `json:"requestedAt,omitempty"`
}

type TelegramChannelConfig struct {
	Enabled        bool
	BotToken       string
	TokenFile      string
	DMPolicy       string
	AllowFrom      []string
	GroupPolicy    string
	RequireMention bool
	WebhookURL     string
}

type TelegramChannelUpdate struct {
	Enabled        bool
	BotToken       *string
	DMPolicy       string
	AllowFrom      []string
	GroupPolicy    string
	RequireMention bool
}

type TelegramChannelTestResult struct {
	Name         string `json:"name"`
	ChannelID    string `json:"channelId"`
	OK           bool   `json:"ok"`
	Message      string `json:"message"`
	BotID        int64  `json:"botId,omitempty"`
	BotUsername  string `json:"botUsername,omitempty"`
	BotFirstName string `json:"botFirstName,omitempty"`
}

type ChannelSummaryResource struct {
	Name            string `json:"name"`
	ChannelID       string `json:"channelId"`
	DisplayName     string `json:"displayName"`
	Enabled         bool   `json:"enabled"`
	Configured      bool   `json:"configured"`
	PluginInstalled bool   `json:"pluginInstalled"`
	Installable     bool   `json:"installable"`
}

type PluginResource struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Version    string   `json:"version,omitempty"`
	Installed  bool     `json:"installed"`
	Enabled    bool     `json:"enabled"`
	Status     string   `json:"status,omitempty"`
	Origin     string   `json:"origin,omitempty"`
	Source     string   `json:"source,omitempty"`
	ChannelIDs []string `json:"channelIds,omitempty"`
}

type PluginInstallResult struct {
	Name      string         `json:"name"`
	PluginID  string         `json:"pluginId"`
	Spec      string         `json:"spec"`
	Installed bool           `json:"installed"`
	Restarted bool           `json:"restarted"`
	Output    string         `json:"output,omitempty"`
	Plugin    PluginResource `json:"plugin"`
}

type QQBotChannelResource struct {
	Name                   string   `json:"name"`
	ChannelID              string   `json:"channelId"`
	DisplayName            string   `json:"displayName"`
	PluginInstalled        bool     `json:"pluginInstalled"`
	PluginVersion          string   `json:"pluginVersion,omitempty"`
	PluginStatus           string   `json:"pluginStatus,omitempty"`
	PluginSpec             string   `json:"pluginSpec"`
	Enabled                bool     `json:"enabled"`
	Configured             bool     `json:"configured"`
	AppID                  string   `json:"appId,omitempty"`
	AppIDConfigured        bool     `json:"appIdConfigured"`
	ClientSecretConfigured bool     `json:"clientSecretConfigured"`
	AllowFrom              []string `json:"allowFrom,omitempty"`
	MarkdownSupport        bool     `json:"markdownSupport"`
	ImageServerBaseURL     string   `json:"imageServerBaseUrl,omitempty"`
	LastAppliedAction      string   `json:"lastAppliedAction,omitempty"`
}

type QQBotChannelConfig struct {
	Enabled            bool
	AppID              string
	ClientSecret       string
	ClientSecretFile   string
	AllowFrom          []string
	MarkdownSupport    bool
	ImageServerBaseURL string
}

type QQBotChannelUpdate struct {
	Enabled            bool
	AppID              string
	ClientSecret       *string
	AllowFrom          []string
	MarkdownSupport    bool
	ImageServerBaseURL string
}

type WeComAppChannelResource struct {
	Name                     string   `json:"name"`
	ChannelID                string   `json:"channelId"`
	DisplayName              string   `json:"displayName"`
	PluginInstalled          bool     `json:"pluginInstalled"`
	PluginVersion            string   `json:"pluginVersion,omitempty"`
	PluginStatus             string   `json:"pluginStatus,omitempty"`
	PluginSpec               string   `json:"pluginSpec"`
	Enabled                  bool     `json:"enabled"`
	Configured               bool     `json:"configured"`
	CorpID                   string   `json:"corpId,omitempty"`
	CorpIDConfigured         bool     `json:"corpIdConfigured"`
	CorpSecretConfigured     bool     `json:"corpSecretConfigured"`
	AgentID                  string   `json:"agentId,omitempty"`
	AgentIDConfigured        bool     `json:"agentIdConfigured"`
	TokenConfigured          bool     `json:"tokenConfigured"`
	EncodingAESKeyConfigured bool     `json:"encodingAesKeyConfigured"`
	WebhookPath              string   `json:"webhookPath,omitempty"`
	APIBaseURL               string   `json:"apiBaseUrl,omitempty"`
	DMPolicy                 string   `json:"dmPolicy"`
	AllowFrom                []string `json:"allowFrom,omitempty"`
	WelcomeText              string   `json:"welcomeText,omitempty"`
	LastAppliedAction        string   `json:"lastAppliedAction,omitempty"`
}

type WeComAppChannelConfig struct {
	Enabled        bool
	CorpID         string
	CorpSecret     string
	CorpSecretFile string
	AgentID        string
	Token          string
	EncodingAESKey string
	WebhookPath    string
	APIBaseURL     string
	DMPolicy       string
	AllowFrom      []string
	WelcomeText    string
}

type WeComAppChannelUpdate struct {
	Enabled        bool
	CorpID         string
	CorpSecret     *string
	AgentID        string
	Token          *string
	EncodingAESKey *string
	WebhookPath    string
	APIBaseURL     string
	DMPolicy       string
	AllowFrom      []string
	WelcomeText    string
}

func nowMillis() int64 {
	return time.Now().UnixMilli()
}
