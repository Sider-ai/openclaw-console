package openclaw

import (
	"context"
	"fmt"
	"slices"
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

func (s *Service) GetProvider(ctx context.Context, provider string) (ProviderResource, error) {
	if !isSupportedProvider(provider) {
		return ProviderResource{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	status, err := s.cli.ModelsStatus(ctx)
	if err != nil {
		return ProviderResource{}, err
	}

	resource := ProviderResource{
		Name:       "providers/" + provider,
		ProviderID: provider,
		Connection: "NOT_CONFIGURED",
		AuthType:   "NONE",
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

func (s *Service) ConnectOpenAIAPIKey(ctx context.Context, apiKey string, defaultModel string) (ProviderResource, ModelSettingResource, error) {
	if strings.TrimSpace(apiKey) == "" {
		return ProviderResource{}, ModelSettingResource{}, fmt.Errorf("apiKey is required")
	}
	resolvedDefaultModel, err := s.resolveOpenAIDefaultModel(ctx, defaultModel)
	if err != nil {
		return ProviderResource{}, ModelSettingResource{}, err
	}
	if err := s.store.UpsertOpenAIAPIKey(ctx, apiKey, resolvedDefaultModel, s.cli); err != nil {
		return ProviderResource{}, ModelSettingResource{}, err
	}
	providerRes, err := s.GetProvider(ctx, "openai")
	if err != nil {
		return ProviderResource{}, ModelSettingResource{}, err
	}
	modelRes, err := s.GetModelSetting(ctx)
	if err != nil {
		return ProviderResource{}, ModelSettingResource{}, err
	}
	return providerRes, modelRes, nil
}

func (s *Service) resolveOpenAIDefaultModel(ctx context.Context, requested string) (string, error) {
	const fallbackOpenAIModel = "openai/gpt-5"

	req := strings.TrimSpace(requested)
	if strings.HasPrefix(req, "openai/") {
		return req, nil
	}

	status, err := s.cli.ModelsStatus(ctx)
	if err == nil && strings.HasPrefix(strings.TrimSpace(status.DefaultModel), "openai/") {
		return strings.TrimSpace(status.DefaultModel), nil
	}

	list, err := s.cli.ModelsList(ctx, "openai")
	if err != nil {
		return fallbackOpenAIModel, nil
	}

	for _, m := range list.Models {
		if strings.HasPrefix(strings.TrimSpace(m.Key), "openai/") && m.Available {
			return strings.TrimSpace(m.Key), nil
		}
	}
	for _, m := range list.Models {
		if strings.HasPrefix(strings.TrimSpace(m.Key), "openai/") {
			return strings.TrimSpace(m.Key), nil
		}
	}
	return fallbackOpenAIModel, nil
}

func (s *Service) DisconnectProvider(ctx context.Context, provider string) (ProviderResource, error) {
	if !isSupportedProvider(provider) {
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
	if provider != "" && !isSupportedProvider(provider) {
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
	return s.store.ListAuthProfiles(provider)
}

func (s *Service) GetAuthProfile(provider, profileID string) (*ProfileResource, error) {
	if !isSupportedProvider(provider) {
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
	return s.store.GetAuthProfile(provider, profileID)
}

func (s *Service) ListModelCatalogEntries(ctx context.Context, provider, pageToken string, pageSize int) ([]ModelCatalogEntryResource, string, error) {
	if !isSupportedProvider(provider) {
		return nil, "", fmt.Errorf("unsupported provider: %s", provider)
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

func isSupportedProvider(provider string) bool {
	switch provider {
	case "openai", "openai-codex":
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
