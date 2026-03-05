package openclaw

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
)

type Service struct {
	cli   *CLI
	store *Store
}

func NewService(cli *CLI, store *Store) *Service {
	return &Service{cli: cli, store: store}
}

func (s *Service) GetModelSetting(ctx context.Context) (ModelSettingResource, error) {
	status, err := s.cli.ModelsStatus(ctx)
	if err != nil {
		return ModelSettingResource{}, err
	}
	return ModelSettingResource{
		Name:         "modelSettings/default",
		DefaultModel: status.DefaultModel,
	}, nil
}

func (s *Service) UpdateDefaultModel(ctx context.Context, defaultModel string) (ModelSettingResource, error) {
	if strings.TrimSpace(defaultModel) == "" {
		return ModelSettingResource{}, fmt.Errorf("defaultModel is required")
	}
	if err := s.cli.SetDefaultModel(ctx, defaultModel); err != nil {
		return ModelSettingResource{}, err
	}
	return s.GetModelSetting(ctx)
}

func (s *Service) ListProviders(ctx context.Context) ([]ProviderSummaryResource, error) {
	providerSet := map[string]struct{}{}

	list, err := s.cli.ModelsList(ctx, "")
	if err != nil {
		return nil, err
	}
	for _, model := range list.Models {
		provider := providerFromModelKey(model.Key)
		if provider == "" {
			continue
		}
		providerSet[provider] = struct{}{}
	}

	status, err := s.cli.ModelsStatus(ctx)
	if err == nil {
		for _, item := range status.Auth.Providers {
			if strings.TrimSpace(item.Provider) == "" {
				continue
			}
			providerSet[strings.TrimSpace(item.Provider)] = struct{}{}
		}
		for _, item := range status.Auth.ProvidersWithOAuth {
			if strings.TrimSpace(item) == "" {
				continue
			}
			providerSet[strings.TrimSpace(item)] = struct{}{}
		}
		for _, item := range status.Auth.MissingProvidersInUse {
			if strings.TrimSpace(item) == "" {
				continue
			}
			providerSet[strings.TrimSpace(item)] = struct{}{}
		}
	}

	providerIDs := make([]string, 0, len(providerSet))
	for provider := range providerSet {
		providerIDs = append(providerIDs, provider)
	}
	sort.Strings(providerIDs)

	out := make([]ProviderSummaryResource, 0, len(providerIDs))
	for _, provider := range providerIDs {
		out = append(out, ProviderSummaryResource{
			Name:           "providers/" + provider,
			ProviderID:     provider,
			DisplayName:    providerDisplayName(provider),
			SupportsAPIKey: supportsAPIKeyProvider(provider),
			Managed:        isManagedProvider(provider),
		})
	}
	return out, nil
}

func (s *Service) GetProvider(ctx context.Context, provider string) (ProviderResource, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return ProviderResource{}, fmt.Errorf("provider is required")
	}
	status, err := s.cli.ModelsStatus(ctx)
	if err != nil {
		return ProviderResource{}, err
	}

	resource := ProviderResource{
		Name:           "providers/" + provider,
		ProviderID:     provider,
		SupportsAPIKey: supportsAPIKeyProvider(provider),
		Connection:     "NOT_CONFIGURED",
		AuthType:       "NONE",
	}

	for _, p := range status.Auth.Providers {
		if p.Provider != provider {
			continue
		}
		resource.ProfileLabels = append(resource.ProfileLabels, p.Profiles.Labels...)
		switch {
		case p.Profiles.OAuth > 0:
			resource.Connection = "CONNECTED"
			resource.AuthType = "OAUTH"
		case p.Profiles.APIKey > 0:
			resource.Connection = "CONNECTED"
			resource.AuthType = "API_KEY"
		case p.Profiles.Token > 0:
			resource.Connection = "CONNECTED"
			resource.AuthType = "TOKEN"
		}
	}

	if slices.Contains(status.Auth.MissingProvidersInUse, provider) {
		resource.MissingInUse = true
	}
	resource.OAuthProviders = append(resource.OAuthProviders, status.Auth.ProvidersWithOAuth...)
	return resource, nil
}

func (s *Service) ConnectProviderAPIKey(ctx context.Context, provider string, apiKey string) (ProviderResource, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return ProviderResource{}, fmt.Errorf("provider is required")
	}
	if !supportsAPIKeyProvider(provider) {
		return ProviderResource{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	if strings.TrimSpace(apiKey) == "" {
		return ProviderResource{}, fmt.Errorf("apiKey is required")
	}
	if err := s.store.UpsertProviderAPIKey(ctx, provider, apiKey); err != nil {
		return ProviderResource{}, err
	}
	providerRes, err := s.GetProvider(ctx, provider)
	if err != nil {
		return ProviderResource{}, err
	}
	return providerRes, nil
}

func (s *Service) DisconnectProvider(ctx context.Context, provider string) (ProviderResource, error) {
	if !isManagedProvider(provider) {
		return ProviderResource{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	if err := s.store.DisconnectProvider(ctx, provider); err != nil {
		return ProviderResource{}, err
	}
	return s.GetProvider(ctx, provider)
}

func (s *Service) ResetAuth(ctx context.Context, provider string, restart bool) (AuthResetResult, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		provider = "openai"
	}
	if !isSupportedResetProvider(provider) {
		return AuthResetResult{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	return s.store.ResetAuth(ctx, provider, restart, s.cli)
}

func (s *Service) ListAuthProfiles(provider string) ([]ProfileResource, error) {
	if provider != "" && !isManagedProvider(provider) {
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
	return s.store.ListAuthProfiles(provider)
}

func (s *Service) GetAuthProfile(provider, profileID string) (*ProfileResource, error) {
	if !isManagedProvider(provider) {
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
	return s.store.GetAuthProfile(provider, profileID)
}

func (s *Service) ListModelCatalogEntries(ctx context.Context, provider, pageToken string, pageSize int) ([]ModelCatalogEntryResource, string, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return nil, "", fmt.Errorf("provider is required")
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200
	}
	offset, err := DecodePageToken(pageToken)
	if err != nil {
		return nil, "", err
	}

	list, err := s.cli.ModelsList(ctx, provider)
	if err != nil {
		return nil, "", err
	}

	if offset >= len(list.Models) {
		return []ModelCatalogEntryResource{}, "", nil
	}
	end := min(offset+pageSize, len(list.Models))

	entries := make([]ModelCatalogEntryResource, 0, end-offset)
	for _, m := range list.Models[offset:end] {
		entries = append(entries, ModelCatalogEntryResource{
			Name:          "modelCatalogEntries/" + sanitizeModelKey(m.Key),
			ModelKey:      m.Key,
			DisplayName:   m.Name,
			Provider:      provider,
			Input:         m.Input,
			ContextWindow: m.ContextWindow,
			Available:     m.Available,
			Tags:          m.Tags,
		})
	}

	next := ""
	if end < len(list.Models) {
		next = EncodePageToken(end)
	}
	return entries, next, nil
}

func isManagedProvider(provider string) bool {
	switch provider {
	case "openai-codex":
		return true
	default:
		return supportsAPIKeyProvider(provider)
	}
}

func supportsAPIKeyProvider(provider string) bool {
	// Documentation-backed allowlist for API key providers in OpenClaw.
	switch provider {
	case "anthropic",
		"azure-openai-responses",
		"cerebras",
		"cloudflare-ai-gateway",
		"glm",
		"google",
		"groq",
		"huggingface",
		"kilocode",
		"kimi-coding",
		"litellm",
		"minimax",
		"minimax-cn",
		"mistral",
		"moonshot",
		"nvidia",
		"openai",
		"opencode",
		"openrouter",
		"qianfan",
		"together",
		"venice",
		"vercel-ai-gateway",
		"xai",
		"xiaomi",
		"zai":
		return true
	default:
		return false
	}
}

func isSupportedResetProvider(provider string) bool {
	switch provider {
	case "openai", "openai-codex", "all":
		return true
	default:
		return false
	}
}

func sanitizeModelKey(key string) string {
	replacer := strings.NewReplacer("/", "~", " ", "_")
	return replacer.Replace(key)
}

func providerFromModelKey(key string) string {
	raw := strings.TrimSpace(key)
	if raw == "" {
		return ""
	}
	parts := strings.SplitN(raw, "/", 2)
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
}

func providerDisplayName(provider string) string {
	switch provider {
	case "openai":
		return "OpenAI"
	case "openai-codex":
		return "OpenAI Codex"
	case "amazon-bedrock":
		return "Amazon Bedrock"
	case "github-copilot":
		return "GitHub Copilot"
	case "xai":
		return "xAI"
	case "zai":
		return "Z.AI"
	default:
		return humanizeProviderID(provider)
	}
}

func humanizeProviderID(provider string) string {
	words := strings.FieldsFunc(provider, func(r rune) bool {
		return r == '-' || r == '_'
	})
	if len(words) == 0 {
		return provider
	}
	for i, word := range words {
		if word == "" {
			continue
		}
		words[i] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
}
