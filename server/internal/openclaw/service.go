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

const (
	qqBotPluginSpec   = "@sliverp/qqbot@1.5.2"
	maxPageSize       = 200
	httpClientTimeout = 10 * time.Second
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

func (s *Service) ListChannels(ctx context.Context) ([]ChannelSummaryResource, error) {
	plugins, err := s.listPlugins(ctx)
	if err != nil {
		return nil, err
	}
	qqbotPlugin := pluginByID(plugins, "qqbot")

	telegramCfg, err := s.store.GetTelegramChannelConfig()
	if err != nil {
		return nil, err
	}
	qqbotCfg, err := s.store.GetQQBotChannelConfig()
	if err != nil {
		return nil, err
	}

	out := []ChannelSummaryResource{
		{
			Name:            "channels/telegram",
			ChannelID:       "telegram",
			DisplayName:     "Telegram",
			Enabled:         telegramCfg.Enabled,
			Configured:      telegramCfg.BotToken != "" || telegramCfg.TokenFile != "",
			PluginInstalled: true,
			Installable:     false,
		},
		{
			Name:            "channels/qqbot",
			ChannelID:       "qqbot",
			DisplayName:     "QQ Bot",
			Enabled:         qqbotCfg.Enabled,
			Configured:      qqbotCfg.AppID != "" && (qqbotCfg.ClientSecret != "" || qqbotCfg.ClientSecretFile != ""),
			PluginInstalled: qqbotPlugin.Installed,
			Installable:     true,
		},
	}
	return out, nil
}

func (s *Service) ListPlugins(ctx context.Context) ([]PluginResource, error) {
	return s.listPlugins(ctx)
}

func (s *Service) GetQQBotChannel(ctx context.Context) (QQBotChannelResource, error) {
	plugins, err := s.listPlugins(ctx)
	if err != nil {
		return QQBotChannelResource{}, err
	}
	plugin := pluginByID(plugins, "qqbot")
	cfg, err := s.store.GetQQBotChannelConfig()
	if err != nil {
		return QQBotChannelResource{}, err
	}
	return buildQQBotChannelResource(cfg, plugin, ""), nil
}

func (s *Service) InstallQQBotPlugin(ctx context.Context) (PluginInstallResult, error) {
	output, err := s.cli.InstallPlugin(ctx, qqBotPluginSpec)
	if err != nil {
		return PluginInstallResult{}, err
	}
	restarted, restartErr := restartOpenClaw(ctx)
	if restartErr != nil {
		return PluginInstallResult{}, restartErr
	}
	if err := s.refreshCacheSync(ctx, "plugin-install"); err != nil {
		return PluginInstallResult{}, err
	}
	plugins, err := s.listPlugins(ctx)
	if err != nil {
		return PluginInstallResult{}, err
	}
	plugin := pluginByID(plugins, "qqbot")
	return PluginInstallResult{
		Name:      "plugins/qqbot:install",
		PluginID:  "qqbot",
		Spec:      qqBotPluginSpec,
		Installed: plugin.Installed,
		Restarted: restarted,
		Output:    strings.TrimSpace(output),
		Plugin:    plugin,
	}, nil
}

func (s *Service) UpdateQQBotChannel(ctx context.Context, update QQBotChannelUpdate) (QQBotChannelResource, error) {
	update.AllowFrom = normalizeStringList(update.AllowFrom)
	cfg, err := s.store.UpdateQQBotChannel(ctx, update)
	if err != nil {
		return QQBotChannelResource{}, err
	}
	plugins, err := s.listPlugins(ctx)
	if err != nil {
		return QQBotChannelResource{}, err
	}
	return buildQQBotChannelResource(cfg, pluginByID(plugins, "qqbot"), "saved"), nil
}

func (s *Service) DisconnectQQBotChannel(ctx context.Context) (QQBotChannelResource, error) {
	if err := s.store.DisconnectQQBotChannel(ctx); err != nil {
		return QQBotChannelResource{}, err
	}
	return s.GetQQBotChannel(ctx)
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
	if defaultModel == "" {
		return ModelSettingResource{}, &InputError{Message: "defaultModel is required"}
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

	return append([]ProviderSummaryResource(nil), snapshot.providers...), nil
}

func (s *Service) GetProvider(ctx context.Context, provider string) (ProviderResource, error) {
	if provider == "" {
		return ProviderResource{}, &InputError{Message: "provider is required"}
	}

	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return ProviderResource{}, err
	}

	item, ok := snapshot.providerByID[provider]
	if !ok {
		return ProviderResource{}, &NotFoundError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
	}
	item.ProfileLabels = append([]string(nil), item.ProfileLabels...)
	item.OAuthProviders = append([]string(nil), item.OAuthProviders...)
	return item, nil
}

func (s *Service) ConnectProviderAPIKey(ctx context.Context, provider string, apiKey string) (ProviderResource, error) {
	if !supportsAPIKeyProvider(provider) {
		return ProviderResource{}, &NotFoundError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
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
		return ProviderResource{}, &NotFoundError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
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

func (s *Service) UpdateTelegramChannel(
	ctx context.Context, update TelegramChannelUpdate,
) (TelegramChannelResource, error) {
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
	token := botToken
	if token == "" {
		token = cfg.BotToken
	}
	if token == "" {
		return TelegramChannelTestResult{}, &InputError{Message: "botToken is required"}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.telegram.org/bot"+token+"/getMe", nil)
	if err != nil {
		return TelegramChannelTestResult{}, err
	}

	client := &http.Client{Timeout: httpClientTimeout}
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
		message := payload.Description
		if message == "" {
			message = fmt.Sprintf("telegram api returned HTTP %d", resp.StatusCode)
		}
		return TelegramChannelTestResult{}, &InputError{Message: fmt.Sprintf("telegram token rejected: %s", message)}
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
	if provider == "" {
		provider = ProviderOpenAI
	}
	if !isSupportedResetProvider(provider) {
		return AuthResetResult{}, &InputError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
	}
	result, err := s.store.ResetAuth(ctx, provider, restart, s.cli)
	if err != nil {
		return AuthResetResult{}, err
	}
	s.triggerCacheRefresh("reset-auth")
	return result, nil
}

func (s *Service) listPlugins(ctx context.Context) ([]PluginResource, error) {
	snapshot, err := s.cache.Snapshot(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]PluginResource, 0, len(snapshot.plugins.Plugins))
	for _, item := range snapshot.plugins.Plugins {
		out = append(out, PluginResource{
			ID:         item.ID,
			Name:       item.Name,
			Version:    item.Version,
			Installed:  true,
			Enabled:    item.Enabled,
			Status:     item.Status,
			Origin:     item.Origin,
			Source:     item.Source,
			ChannelIDs: append([]string(nil), item.ChannelIDs...),
		})
	}
	return out, nil
}

func (s *Service) ListTelegramPairings(ctx context.Context) ([]TelegramPairingResource, error) {
	list, err := s.cli.PairingList(ctx, "telegram")
	if err != nil {
		return nil, err
	}
	out := make([]TelegramPairingResource, 0, len(list.Pairings))
	for _, p := range list.Pairings {
		out = append(out, TelegramPairingResource{
			Code:        p.Code,
			UserID:      p.UserID,
			Username:    p.Username,
			FirstName:   p.FirstName,
			RequestedAt: p.RequestedAt,
		})
	}
	return out, nil
}

func (s *Service) ApproveTelegramPairing(ctx context.Context, code string) error {
	err := s.cli.PairingApprove(ctx, "telegram", code)
	if err != nil && strings.Contains(err.Error(), "No pending pairing request") {
		return &InputError{
			Message: "pairing code not found or has expired — ask the user to send a new message to the bot",
		}
	}
	return err
}

func (s *Service) RejectTelegramPairing(ctx context.Context, code string) error {
	err := s.cli.PairingReject(ctx, "telegram", code)
	if err != nil && strings.Contains(err.Error(), "No pending pairing request") {
		return &InputError{
			Message: "pairing code not found or has expired — ask the user to send a new message to the bot",
		}
	}
	return err
}

func (s *Service) ListAuthProfiles(provider string) ([]ProfileResource, error) {
	if provider != "" && !isManagedProvider(provider) {
		return nil, &NotFoundError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
	}
	return s.store.ListAuthProfiles(provider)
}

func (s *Service) GetAuthProfile(provider, profileID string) (*ProfileResource, error) {
	if !isManagedProvider(provider) {
		return nil, &NotFoundError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
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

func (s *Service) ListModelCatalogEntries(
	ctx context.Context,
	provider, pageToken string,
	pageSize int,
) ([]ModelCatalogEntryResource, string, error) {
	if provider == "" {
		return nil, "", &InputError{Message: "provider is required"}
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
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
		return nil, "", &NotFoundError{Message: fmt.Sprintf("unsupported provider: %s", provider)}
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
	case ProviderOpenAICodex:
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
		Configured:           cfg.BotToken != "" || cfg.TokenFile != "",
		Mode:                 telegramMode(cfg),
		BotTokenConfigured:   cfg.BotToken != "" || cfg.TokenFile != "",
		DMPolicy:             defaultString(cfg.DMPolicy, "pairing"),
		AllowFrom:            append([]string(nil), cfg.AllowFrom...),
		GroupPolicy:          defaultString(cfg.GroupPolicy, "allowlist"),
		RequireMention:       cfg.RequireMention,
		WebhookURLConfigured: cfg.WebhookURL != "",
		LastAppliedAction:    action,
	}
}

func buildQQBotChannelResource(cfg QQBotChannelConfig, plugin PluginResource, action string) QQBotChannelResource {
	return QQBotChannelResource{
		Name:                   "channels/qqbot",
		ChannelID:              "qqbot",
		DisplayName:            "QQ Bot",
		PluginInstalled:        plugin.Installed,
		PluginVersion:          plugin.Version,
		PluginStatus:           plugin.Status,
		PluginSpec:             qqBotPluginSpec,
		Enabled:                cfg.Enabled,
		Configured:             cfg.AppID != "" && (cfg.ClientSecret != "" || cfg.ClientSecretFile != ""),
		AppID:                  cfg.AppID,
		AppIDConfigured:        cfg.AppID != "",
		ClientSecretConfigured: cfg.ClientSecret != "" || cfg.ClientSecretFile != "",
		AllowFrom:              append([]string(nil), cfg.AllowFrom...),
		MarkdownSupport:        cfg.MarkdownSupport,
		ImageServerBaseURL:     cfg.ImageServerBaseURL,
		LastAppliedAction:      action,
	}
}

func telegramMode(cfg TelegramChannelConfig) string {
	if cfg.WebhookURL != "" {
		return "webhook"
	}
	return "polling"
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
			return nil, &InputError{Message: `dmPolicy "open" requires allowFrom to be "*"`}
		}
	}
	if dmPolicy == "allowlist" && len(out) == 0 {
		return nil, &InputError{Message: `dmPolicy "allowlist" requires at least one Telegram user ID in allowFrom`}
	}
	return out, nil
}

func normalizeStringList(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func pluginByID(items []PluginResource, id string) PluginResource {
	for _, item := range items {
		if item.ID == id {
			return item
		}
	}
	return PluginResource{ID: id, Installed: false}
}

func parseTelegramUserID(value string) (int64, error) {
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, &InputError{Message: "allowFrom must contain numeric Telegram user IDs or *"}
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
		ProviderOpenAI,
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
	case ProviderOpenAI, ProviderOpenAICodex, ProviderAll:
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
	if key == "" {
		return ""
	}
	parts := strings.SplitN(key, "/", 2)
	if len(parts) == 0 {
		return ""
	}
	return parts[0]
}

func providerDisplayName(provider string) string {
	switch provider {
	case ProviderOpenAI:
		return "OpenAI"
	case ProviderOpenAICodex:
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
	if provider == "" {
		return false
	}
	for i := range len(provider) {
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
	case "amazon-bedrock", "github-copilot", ProviderOpenAICodex:
		return true
	default:
		return supportsAPIKeyProvider(provider)
	}
}

func isWhitelistedProviderID(provider string, discovered map[string]struct{}) bool {
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
