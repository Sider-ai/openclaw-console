package openclaw

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Service struct {
	cli   *CLI
	store *Store
	cache *serviceCache
}

func NewService(cli *CLI, store *Store) *Service {
	return &Service{
		cli:   cli,
		store: store,
		cache: newServiceCache(cli),
	}
}

func (s *Service) Warmup(ctx context.Context) error {
	return s.cache.Warmup(ctx)
}

func (s *Service) StartBackground(ctx context.Context) {
	s.cache.Start(ctx)
}

func (s *Service) triggerCacheRefresh(reason string) {
	s.cache.TriggerRefresh(reason)
}

func (s *Service) refreshCacheSync(ctx context.Context, reason string) error {
	if err := s.cache.Warmup(ctx); err != nil {
		s.triggerCacheRefresh(reason)
		return err
	}
	return nil
}

func (s *Service) GetModelSetting(ctx context.Context) (ModelSettingResource, error) {
	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return ModelSettingResource{}, err
	}
	return snapshot.modelSetting, nil
}

func (s *Service) UpdateDefaultModel(ctx context.Context, defaultModel string) (ModelSettingResource, error) {
	if strings.TrimSpace(defaultModel) == "" {
		return ModelSettingResource{}, fmt.Errorf("defaultModel is required")
	}
	if err := s.cli.SetDefaultModel(ctx, defaultModel); err != nil {
		return ModelSettingResource{}, err
	}
	if err := s.refreshCacheSync(ctx, "set-default-model"); err != nil {
		return ModelSettingResource{}, err
	}
	return s.GetModelSetting(ctx)
}

func (s *Service) ListProviders(ctx context.Context) ([]ProviderSummaryResource, error) {
	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]ProviderSummaryResource, 0, len(snapshot.providers))
	for _, provider := range snapshot.providers {
		out = append(out, provider)
	}
	return out, nil
}

func (s *Service) GetProvider(ctx context.Context, provider string) (ProviderResource, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return ProviderResource{}, fmt.Errorf("provider is required")
	}

	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return ProviderResource{}, err
	}

	item, ok := snapshot.providerByID[provider]
	if !ok {
		return ProviderResource{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	item.ProfileLabels = append([]string(nil), item.ProfileLabels...)
	item.OAuthProviders = append([]string(nil), item.OAuthProviders...)
	return item, nil
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
	if err := s.refreshCacheSync(ctx, "connect-api-key"); err != nil {
		return ProviderResource{}, err
	}
	return s.GetProvider(ctx, provider)
}

func (s *Service) DisconnectProvider(ctx context.Context, provider string) (ProviderResource, error) {
	if !isManagedProvider(provider) {
		return ProviderResource{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	if err := s.store.DisconnectProvider(ctx, provider); err != nil {
		return ProviderResource{}, err
	}
	if err := s.refreshCacheSync(ctx, "disconnect-provider"); err != nil {
		return ProviderResource{}, err
	}
	return s.GetProvider(ctx, provider)
}

func (s *Service) GetTelegramChannel() (TelegramChannelResource, error) {
	cfg, err := s.store.GetTelegramChannelConfig()
	if err != nil {
		return TelegramChannelResource{}, err
	}
	return buildTelegramChannelResource(cfg, ""), nil
}

func (s *Service) UpdateTelegramChannel(ctx context.Context, update TelegramChannelUpdate) (TelegramChannelResource, error) {
	if err := validateTelegramPolicies(update.DMPolicy, update.GroupPolicy); err != nil {
		return TelegramChannelResource{}, err
	}
	normalizedAllowFrom, err := normalizeTelegramAllowFrom(update.AllowFrom, update.DMPolicy)
	if err != nil {
		return TelegramChannelResource{}, err
	}
	update.AllowFrom = normalizedAllowFrom

	cfg, err := s.store.UpdateTelegramChannel(ctx, update)
	if err != nil {
		return TelegramChannelResource{}, err
	}
	return buildTelegramChannelResource(cfg, "saved"), nil
}

func (s *Service) DisconnectTelegramChannel(ctx context.Context) (TelegramChannelResource, error) {
	if err := s.store.DisconnectTelegramChannel(ctx); err != nil {
		return TelegramChannelResource{}, err
	}
	return s.GetTelegramChannel()
}

func (s *Service) TestTelegramChannel(ctx context.Context, botToken string) (TelegramChannelTestResult, error) {
	cfg, err := s.store.GetTelegramChannelConfig()
	if err != nil {
		return TelegramChannelTestResult{}, err
	}
	token := strings.TrimSpace(botToken)
	if token == "" {
		token = strings.TrimSpace(cfg.BotToken)
	}
	if token == "" {
		return TelegramChannelTestResult{}, fmt.Errorf("botToken is required")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.telegram.org/bot"+token+"/getMe", nil)
	if err != nil {
		return TelegramChannelTestResult{}, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return TelegramChannelTestResult{}, fmt.Errorf("telegram api request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	var payload struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
		Result      struct {
			ID        int64  `json:"id"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return TelegramChannelTestResult{}, fmt.Errorf("decode telegram api response: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest || !payload.OK {
		message := strings.TrimSpace(payload.Description)
		if message == "" {
			message = fmt.Sprintf("telegram api returned HTTP %d", resp.StatusCode)
		}
		return TelegramChannelTestResult{}, fmt.Errorf("telegram token rejected: %s", message)
	}

	return TelegramChannelTestResult{
		Name:         "channels/telegram:test",
		ChannelID:    "telegram",
		OK:           true,
		Message:      "Telegram bot token is valid.",
		BotID:        payload.Result.ID,
		BotUsername:  payload.Result.Username,
		BotFirstName: payload.Result.FirstName,
	}, nil
}

func (s *Service) ResetAuth(ctx context.Context, provider string, restart bool) (AuthResetResult, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		provider = "openai"
	}
	if !isSupportedResetProvider(provider) {
		return AuthResetResult{}, fmt.Errorf("unsupported provider: %s", provider)
	}
	result, err := s.store.ResetAuth(ctx, provider, restart, s.cli)
	if err != nil {
		return AuthResetResult{}, err
	}
	_ = s.refreshCacheSync(ctx, "reset-auth")
	return result, nil
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

func (s *Service) ListModelCatalogSnapshot(ctx context.Context) ([]ModelCatalogEntryResource, error) {
	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ModelCatalogEntryResource, 0, len(snapshot.availableModelCatalog))
	for _, item := range snapshot.availableModelCatalog {
		item.Tags = append([]string(nil), item.Tags...)
		out = append(out, item)
	}
	return out, nil
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

	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return nil, "", err
	}

	if _, known := snapshot.providerIDs[provider]; !known {
		return nil, "", fmt.Errorf("unsupported provider: %s", provider)
	}
	items := snapshot.modelCatalogByProvider[provider]
	if offset >= len(items) {
		return []ModelCatalogEntryResource{}, "", nil
	}
	end := min(offset+pageSize, len(items))

	out := make([]ModelCatalogEntryResource, 0, end-offset)
	for _, item := range items[offset:end] {
		item.Tags = append([]string(nil), item.Tags...)
		out = append(out, item)
	}

	next := ""
	if end < len(items) {
		next = EncodePageToken(end)
	}
	return out, next, nil
}

func isManagedProvider(provider string) bool {
	switch provider {
	case "openai-codex":
		return true
	default:
		return supportsAPIKeyProvider(provider)
	}
}

func buildTelegramChannelResource(cfg TelegramChannelConfig, action string) TelegramChannelResource {
	return TelegramChannelResource{
		Name:                 "channels/telegram",
		ChannelID:            "telegram",
		DisplayName:          "Telegram",
		Enabled:              cfg.Enabled,
		Configured:           strings.TrimSpace(cfg.BotToken) != "" || strings.TrimSpace(cfg.TokenFile) != "",
		Mode:                 telegramMode(cfg),
		BotTokenConfigured:   strings.TrimSpace(cfg.BotToken) != "" || strings.TrimSpace(cfg.TokenFile) != "",
		DMPolicy:             defaultString(cfg.DMPolicy, "pairing"),
		AllowFrom:            append([]string(nil), cfg.AllowFrom...),
		GroupPolicy:          defaultString(cfg.GroupPolicy, "allowlist"),
		RequireMention:       cfg.RequireMention,
		WebhookURLConfigured: strings.TrimSpace(cfg.WebhookURL) != "",
		LastAppliedAction:    action,
	}
}

func telegramMode(cfg TelegramChannelConfig) string {
	if strings.TrimSpace(cfg.WebhookURL) != "" {
		return "webhook"
	}
	return "polling"
}

func validateTelegramPolicies(dmPolicy string, groupPolicy string) error {
	switch dmPolicy {
	case "pairing", "allowlist", "open", "disabled":
	default:
		return fmt.Errorf("unsupported dmPolicy: %s", dmPolicy)
	}

	switch groupPolicy {
	case "allowlist", "open", "disabled":
	default:
		return fmt.Errorf("unsupported groupPolicy: %s", groupPolicy)
	}
	return nil
}

func normalizeTelegramAllowFrom(values []string, dmPolicy string) ([]string, error) {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if trimmed != "*" {
			if _, err := parseTelegramUserID(trimmed); err != nil {
				return nil, err
			}
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}

	if dmPolicy == "open" {
		if len(out) != 1 || out[0] != "*" {
			return nil, fmt.Errorf(`dmPolicy "open" requires allowFrom to be "*"`)
		}
	}
	if dmPolicy == "allowlist" && len(out) == 0 {
		return nil, fmt.Errorf(`dmPolicy "allowlist" requires at least one Telegram user ID in allowFrom`)
	}
	return out, nil
}

func parseTelegramUserID(value string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("allowFrom must contain numeric Telegram user IDs or *")
	}
	return id, nil
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

func isCanonicalProviderID(provider string) bool {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return false
	}
	for i := 0; i < len(provider); i++ {
		ch := provider[i]
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' {
			continue
		}
		return false
	}
	return true
}

func isKnownProvider(provider string) bool {
	switch provider {
	case "amazon-bedrock", "github-copilot", "openai-codex":
		return true
	default:
		return supportsAPIKeyProvider(provider)
	}
}

func isWhitelistedProviderID(provider string, discovered map[string]struct{}) bool {
	provider = strings.TrimSpace(provider)
	if !isCanonicalProviderID(provider) {
		return false
	}
	if discovered != nil {
		if _, ok := discovered[provider]; ok {
			return true
		}
	}
	return isKnownProvider(provider)
}
