package openclaw

import (
	"errors"
	"time"
)

var ErrNotFound = errors.New("not found")

type ModelSettingResource struct {
	Name         string `json:"name"`
	DefaultModel string `json:"defaultModel"`
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
	Name             string `json:"name"`
	SessionID        string `json:"sessionId"`
	State            string `json:"state"`
	AuthURL          string `json:"authUrl,omitempty"`
	ExpiresAt        int64  `json:"expiresAt"`
	CreatedAt        int64  `json:"createdAt"`
	DefaultModelHint string `json:"defaultModelHint,omitempty"`
	ErrorCode        string `json:"errorCode,omitempty"`
	ErrorMessage     string `json:"errorMessage,omitempty"`
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

func nowMillis() int64 {
	return time.Now().UnixMilli()
}
