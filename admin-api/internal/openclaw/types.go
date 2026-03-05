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
	Connection     string   `json:"connection"`
	AuthType       string   `json:"authType"`
	ProfileLabels  []string `json:"profileLabels,omitempty"`
	MissingInUse   bool     `json:"missingInUse"`
	OAuthProviders []string `json:"oauthProviders,omitempty"`
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

func nowMillis() int64 {
	return time.Now().UnixMilli()
}
