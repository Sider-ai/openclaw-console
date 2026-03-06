package openclaw

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Store struct {
	paths Paths
	mu    sync.Mutex
}

func NewStore(paths Paths) *Store {
	return &Store{paths: paths}
}

type AuthStore struct {
	Version  int                       `json:"version"`
	Profiles map[string]AuthCredential `json:"profiles"`
}

type AuthCredential struct {
	Type      string `json:"type"`
	Provider  string `json:"provider"`
	Key       string `json:"key,omitempty"`
	Token     string `json:"token,omitempty"`
	Access    string `json:"access,omitempty"`
	Refresh   string `json:"refresh,omitempty"`
	Expires   int64  `json:"expires,omitempty"`
	Email     string `json:"email,omitempty"`
	AccountID string `json:"accountId,omitempty"`
	KeyRef    string `json:"keyRef,omitempty"`
	TokenRef  string `json:"tokenRef,omitempty"`
}

func (s *Store) UpsertProviderAPIKey(_ context.Context, provider string, apiKey string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	provider = strings.TrimSpace(provider)
	if provider == "" {
		return fmt.Errorf("provider is required")
	}

	auth, err := s.readAuthStore(s.paths.AuthStorePath)
	if err != nil {
		return err
	}
	profileID := provider + ":default"
	auth.Profiles[profileID] = AuthCredential{
		Type:     "api_key",
		Provider: provider,
		Key:      strings.TrimSpace(apiKey),
	}
	if err := s.writeJSONAtomic(s.paths.AuthStorePath, auth); err != nil {
		return err
	}

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return err
	}
	setNestedMapValue(cfg, []string{"auth", "profiles", profileID}, map[string]any{
		"provider": provider,
		"mode":     "api_key",
	})
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return err
	}

	return maybeRestartOpenClaw()
}

func (s *Store) DisconnectProvider(ctx context.Context, provider string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	auth, err := s.readAuthStore(s.paths.AuthStorePath)
	if err != nil {
		return err
	}
	for id, cred := range auth.Profiles {
		if cred.Provider == provider {
			delete(auth.Profiles, id)
		}
	}
	if err := s.writeJSONAtomic(s.paths.AuthStorePath, auth); err != nil {
		return err
	}

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return err
	}
	profiles := getNestedMap(cfg, []string{"auth", "profiles"})
	for key, raw := range profiles {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		p, _ := item["provider"].(string)
		if p == provider {
			delete(profiles, key)
		}
	}
	setNestedMapValue(cfg, []string{"auth", "profiles"}, profiles)
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return err
	}

	return maybeRestartOpenClaw()
}

func (s *Store) GetTelegramChannelConfig() (TelegramChannelConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return TelegramChannelConfig{}, err
	}
	return readTelegramChannelConfig(cfg), nil
}

func (s *Store) UpdateTelegramChannel(_ context.Context, update TelegramChannelUpdate) (TelegramChannelConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return TelegramChannelConfig{}, err
	}

	current := readTelegramChannelConfig(cfg)
	if update.BotToken != nil {
		current.BotToken = strings.TrimSpace(*update.BotToken)
		if current.BotToken != "" {
			current.TokenFile = ""
		}
	}

	current.Enabled = update.Enabled
	current.DMPolicy = strings.TrimSpace(update.DMPolicy)
	current.AllowFrom = append([]string(nil), update.AllowFrom...)
	current.GroupPolicy = strings.TrimSpace(update.GroupPolicy)
	current.RequireMention = update.RequireMention

	setNestedMapValue(cfg, []string{"channels", "telegram"}, telegramChannelConfigMap(current))
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return TelegramChannelConfig{}, err
	}
	return current, maybeRestartOpenClaw()
}

func (s *Store) DisconnectTelegramChannel(_ context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return err
	}

	channels := getNestedMap(cfg, []string{"channels"})
	delete(channels, "telegram")
	setNestedMapValue(cfg, []string{"channels"}, channels)
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return err
	}
	return maybeRestartOpenClaw()
}

func (s *Store) GetQQBotChannelConfig() (QQBotChannelConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return QQBotChannelConfig{}, err
	}
	return readQQBotChannelConfig(cfg), nil
}

func (s *Store) UpdateQQBotChannel(_ context.Context, update QQBotChannelUpdate) (QQBotChannelConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return QQBotChannelConfig{}, err
	}

	current := readQQBotChannelConfig(cfg)
	current.Enabled = update.Enabled
	current.AppID = strings.TrimSpace(update.AppID)
	current.AllowFrom = append([]string(nil), update.AllowFrom...)
	current.MarkdownSupport = update.MarkdownSupport
	current.ImageServerBaseURL = strings.TrimSpace(update.ImageServerBaseURL)
	if update.ClientSecret != nil {
		current.ClientSecret = strings.TrimSpace(*update.ClientSecret)
		if current.ClientSecret != "" {
			current.ClientSecretFile = ""
		}
	}

	setNestedMapValue(cfg, []string{"channels", "qqbot"}, qqbotChannelConfigMap(current))
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return QQBotChannelConfig{}, err
	}
	return current, maybeRestartOpenClaw()
}

func (s *Store) DisconnectQQBotChannel(_ context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return err
	}

	channels := getNestedMap(cfg, []string{"channels"})
	delete(channels, "qqbot")
	setNestedMapValue(cfg, []string{"channels"}, channels)
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return err
	}
	return maybeRestartOpenClaw()
}

func (s *Store) ResetAuth(ctx context.Context, provider string, restart bool, cli *CLI) (AuthResetResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	res := AuthResetResult{
		Provider:      provider,
		Restart:       restart,
		AuthStorePath: s.paths.AuthStorePath,
		ConfigPath:    s.paths.ConfigPath,
	}

	if err := requireRegularFile(s.paths.AuthStorePath, "auth store"); err != nil {
		return AuthResetResult{}, err
	}
	if err := requireRegularFile(s.paths.ConfigPath, "config file"); err != nil {
		return AuthResetResult{}, err
	}

	authRaw, err := s.readRawJSONMap(s.paths.AuthStorePath)
	if err != nil {
		return AuthResetResult{}, err
	}
	cfgRaw, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return AuthResetResult{}, err
	}

	authProfiles := readMapField(authRaw, "profiles")
	cfgProfiles := getNestedMap(cfgRaw, []string{"auth", "profiles"})

	res.AuthProfilesRemoved = matchingProfileIDs(authProfiles, provider)
	res.ConfigProfilesRemoved = matchingProfileIDs(cfgProfiles, provider)

	ts := time.Now().Format("20060102-150405")
	res.AuthBackupPath = s.paths.AuthStorePath + ".bak." + ts
	res.ConfigBackupPath = s.paths.ConfigPath + ".bak." + ts

	if err := copyFile(s.paths.AuthStorePath, res.AuthBackupPath); err != nil {
		return AuthResetResult{}, err
	}
	if err := copyFile(s.paths.ConfigPath, res.ConfigBackupPath); err != nil {
		return AuthResetResult{}, err
	}

	if provider == "all" {
		authRaw["profiles"] = map[string]any{}
		authRaw["usageStats"] = map[string]any{}
		setNestedMapValue(cfgRaw, []string{"auth", "profiles"}, map[string]any{})
	} else {
		authRaw["profiles"] = removeProfilesByProvider(authProfiles, provider)

		usageStats, ok := authRaw["usageStats"].(map[string]any)
		if ok {
			for key := range usageStats {
				if strings.HasPrefix(key, provider+":") {
					delete(usageStats, key)
				}
			}
			authRaw["usageStats"] = usageStats
		}

		setNestedMapValue(cfgRaw, []string{"auth", "profiles"}, removeProfilesByProvider(cfgProfiles, provider))
	}

	if err := s.writeJSONAtomic(s.paths.AuthStorePath, authRaw); err != nil {
		return AuthResetResult{}, err
	}
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfgRaw); err != nil {
		return AuthResetResult{}, err
	}

	if !restart {
		res.RestartSkipped = true
		return res, nil
	}

	if os.Getenv("OPENCLAW_ADMIN_SKIP_RESTART") == "1" {
		res.RestartSkipped = true
		return res, nil
	}

	if cli == nil {
		res.RestartError = "restart requested but cli is unavailable"
		return res, nil
	}

	if err := cli.GatewayRestart(ctx); err != nil {
		res.RestartError = err.Error()
		return res, nil
	}
	res.Restarted = true
	return res, nil
}

func (s *Store) ListAuthProfiles(provider string) ([]ProfileResource, error) {
	auth, err := s.readAuthStore(s.paths.AuthStorePath)
	if err != nil {
		return nil, err
	}

	items := make([]ProfileResource, 0)
	for id, cred := range auth.Profiles {
		if provider != "" && cred.Provider != provider {
			continue
		}
		items = append(items, ProfileResource{
			Name:      fmt.Sprintf("providers/%s/authProfiles/%s", cred.Provider, id),
			ProfileID: id,
			Provider:  cred.Provider,
			Type:      cred.Type,
			Status:    profileStatus(cred),
			Email:     cred.Email,
			ExpiresAt: cred.Expires,
		})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].ProfileID < items[j].ProfileID })
	return items, nil
}

func (s *Store) GetAuthProfile(provider, profileID string) (*ProfileResource, error) {
	profiles, err := s.ListAuthProfiles(provider)
	if err != nil {
		return nil, err
	}
	for i := range profiles {
		if profiles[i].ProfileID == profileID {
			p := profiles[i]
			return &p, nil
		}
	}
	return nil, ErrNotFound
}

func (s *Store) MergeCodexFromTemp(ctx context.Context, tmp Paths, defaultModel string, cli *CLI) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	tmpStore, err := s.readAuthStore(tmp.AuthStorePath)
	if err != nil {
		return fmt.Errorf("read temp auth store: %w", err)
	}

	targetStore, err := s.readAuthStore(s.paths.AuthStorePath)
	if err != nil {
		return err
	}

	merged := false
	for profileID, cred := range tmpStore.Profiles {
		if cred.Provider != "openai-codex" {
			continue
		}
		targetStore.Profiles[profileID] = cred
		merged = true
	}
	if !merged {
		return fmt.Errorf("no openai-codex profiles found in temp auth store")
	}
	if err := s.writeJSONAtomic(s.paths.AuthStorePath, targetStore); err != nil {
		return err
	}

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return err
	}
	profiles := getNestedMap(cfg, []string{"auth", "profiles"})
	for profileID, cred := range targetStore.Profiles {
		if cred.Provider != "openai-codex" {
			continue
		}
		profiles[profileID] = map[string]any{
			"provider": "openai-codex",
			"mode":     "oauth",
		}
	}
	setNestedMapValue(cfg, []string{"auth", "profiles"}, profiles)
	if err := s.writeJSONAtomic(s.paths.ConfigPath, cfg); err != nil {
		return err
	}

	if defaultModel != "" {
		if err := cli.SetDefaultModel(ctx, defaultModel); err != nil {
			return err
		}
	}

	return maybeRestartOpenClaw()
}

func (s *Store) readRawJSONMap(path string) (map[string]any, error) {
	var m map[string]any
	if err := readJSON(path, &m); err != nil {
		if os.IsNotExist(err) {
			return map[string]any{}, nil
		}
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	if m == nil {
		m = map[string]any{}
	}
	return m, nil
}

func (s *Store) readAuthStore(path string) (AuthStore, error) {
	var st AuthStore
	if err := readJSON(path, &st); err != nil {
		if os.IsNotExist(err) {
			return AuthStore{Version: 1, Profiles: map[string]AuthCredential{}}, nil
		}
		return AuthStore{}, fmt.Errorf("read %s: %w", path, err)
	}
	if st.Version == 0 {
		st.Version = 1
	}
	if st.Profiles == nil {
		st.Profiles = map[string]AuthCredential{}
	}
	return st, nil
}

func (s *Store) writeJSONAtomic(path string, v any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", filepath.Dir(path), err)
	}

	buf, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	buf = append(buf, '\n')

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, buf, 0o600); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		return err
	}
	return nil
}

func readJSON(path string, out any) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	return dec.Decode(out)
}

func getNestedMap(root map[string]any, path []string) map[string]any {
	cur := root
	for _, segment := range path {
		nextRaw, ok := cur[segment]
		if !ok {
			next := map[string]any{}
			cur[segment] = next
			cur = next
			continue
		}
		next, ok := nextRaw.(map[string]any)
		if !ok {
			next = map[string]any{}
			cur[segment] = next
		}
		cur = next
	}
	return cur
}

func readTelegramChannelConfig(root map[string]any) TelegramChannelConfig {
	rawChannels, ok := root["channels"].(map[string]any)
	if !ok {
		return TelegramChannelConfig{
			DMPolicy:       "pairing",
			GroupPolicy:    "allowlist",
			RequireMention: true,
		}
	}
	rawTelegram, ok := rawChannels["telegram"].(map[string]any)
	if !ok {
		return TelegramChannelConfig{
			DMPolicy:       "pairing",
			GroupPolicy:    "allowlist",
			RequireMention: true,
		}
	}

	cfg := TelegramChannelConfig{
		Enabled:        readBool(rawTelegram, "enabled"),
		BotToken:       readString(rawTelegram, "botToken"),
		TokenFile:      readString(rawTelegram, "tokenFile"),
		DMPolicy:       defaultString(readString(rawTelegram, "dmPolicy"), "pairing"),
		AllowFrom:      readStringList(rawTelegram, "allowFrom"),
		GroupPolicy:    defaultString(readString(rawTelegram, "groupPolicy"), "allowlist"),
		RequireMention: readTelegramRequireMention(rawTelegram),
		WebhookURL:     readString(rawTelegram, "webhookUrl"),
	}
	return cfg
}

func readQQBotChannelConfig(root map[string]any) QQBotChannelConfig {
	rawChannels, ok := root["channels"].(map[string]any)
	if !ok {
		return QQBotChannelConfig{
			AllowFrom:       []string{"*"},
			MarkdownSupport: true,
		}
	}
	rawQQBot, ok := rawChannels["qqbot"].(map[string]any)
	if !ok {
		return QQBotChannelConfig{
			AllowFrom:       []string{"*"},
			MarkdownSupport: true,
		}
	}

	return QQBotChannelConfig{
		Enabled:            readBool(rawQQBot, "enabled"),
		AppID:              readString(rawQQBot, "appId"),
		ClientSecret:       readString(rawQQBot, "clientSecret"),
		ClientSecretFile:   readString(rawQQBot, "clientSecretFile"),
		AllowFrom:          defaultStringList(readStringList(rawQQBot, "allowFrom"), []string{"*"}),
		MarkdownSupport:    readDefaultBool(rawQQBot, "markdownSupport", true),
		ImageServerBaseURL: readString(rawQQBot, "imageServerBaseUrl"),
	}
}

func telegramChannelConfigMap(cfg TelegramChannelConfig) map[string]any {
	out := map[string]any{
		"enabled":     cfg.Enabled,
		"dmPolicy":    defaultString(cfg.DMPolicy, "pairing"),
		"groupPolicy": defaultString(cfg.GroupPolicy, "allowlist"),
		"streaming":   "partial",
		"groups":      map[string]any{"*": map[string]any{"requireMention": cfg.RequireMention}},
	}
	if len(cfg.AllowFrom) > 0 {
		out["allowFrom"] = stringIDsToJSONNumbers(cfg.AllowFrom)
	}
	if token := strings.TrimSpace(cfg.BotToken); token != "" {
		out["botToken"] = token
	}
	if tokenFile := strings.TrimSpace(cfg.TokenFile); tokenFile != "" {
		out["tokenFile"] = tokenFile
	}
	if webhookURL := strings.TrimSpace(cfg.WebhookURL); webhookURL != "" {
		out["webhookUrl"] = webhookURL
	}
	return out
}

func qqbotChannelConfigMap(cfg QQBotChannelConfig) map[string]any {
	out := map[string]any{
		"enabled":         cfg.Enabled,
		"allowFrom":       append([]string(nil), cfg.AllowFrom...),
		"markdownSupport": cfg.MarkdownSupport,
	}
	if appID := strings.TrimSpace(cfg.AppID); appID != "" {
		out["appId"] = appID
	}
	if clientSecret := strings.TrimSpace(cfg.ClientSecret); clientSecret != "" {
		out["clientSecret"] = clientSecret
	}
	if clientSecretFile := strings.TrimSpace(cfg.ClientSecretFile); clientSecretFile != "" {
		out["clientSecretFile"] = clientSecretFile
	}
	if imageServerBaseURL := strings.TrimSpace(cfg.ImageServerBaseURL); imageServerBaseURL != "" {
		out["imageServerBaseUrl"] = imageServerBaseURL
	}
	return out
}

func setNestedMapValue(root map[string]any, path []string, value any) {
	if len(path) == 0 {
		return
	}
	if len(path) == 1 {
		root[path[0]] = value
		return
	}
	parent := getNestedMap(root, path[:len(path)-1])
	parent[path[len(path)-1]] = value
}

func readString(root map[string]any, key string) string {
	value, _ := root[key].(string)
	return strings.TrimSpace(value)
}

func readBool(root map[string]any, key string) bool {
	value, _ := root[key].(bool)
	return value
}

func readStringList(root map[string]any, key string) []string {
	raw, ok := root[key]
	if !ok {
		return nil
	}
	switch value := raw.(type) {
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			switch typed := item.(type) {
			case string:
				if trimmed := strings.TrimSpace(typed); trimmed != "" {
					out = append(out, trimmed)
				}
			case json.Number:
				if trimmed := strings.TrimSpace(typed.String()); trimmed != "" {
					out = append(out, trimmed)
				}
			case float64:
				out = append(out, strconv.FormatInt(int64(typed), 10))
			}
		}
		return out
	case string:
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return []string{trimmed}
		}
	}
	return nil
}

func defaultStringList(values []string, fallback []string) []string {
	if len(values) == 0 {
		return append([]string(nil), fallback...)
	}
	return append([]string(nil), values...)
}

func readDefaultBool(root map[string]any, key string, fallback bool) bool {
	value, ok := root[key]
	if !ok {
		return fallback
	}
	b, ok := value.(bool)
	if !ok {
		return fallback
	}
	return b
}

func readTelegramRequireMention(root map[string]any) bool {
	rawGroups, ok := root["groups"].(map[string]any)
	if !ok {
		return true
	}
	rawDefault, ok := rawGroups["*"].(map[string]any)
	if !ok {
		return true
	}
	value, ok := rawDefault["requireMention"].(bool)
	if !ok {
		return true
	}
	return value
}

func stringIDsToJSONNumbers(values []string) []any {
	out := make([]any, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if trimmed == "*" {
			out = append(out, trimmed)
			continue
		}
		if _, err := strconv.ParseInt(trimmed, 10, 64); err == nil {
			out = append(out, json.Number(trimmed))
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func defaultString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func profileStatus(cred AuthCredential) string {
	switch cred.Type {
	case "api_key", "token":
		return "STATIC"
	case "oauth":
		if cred.Expires > 0 {
			if cred.Expires <= nowMillis() {
				return "EXPIRED"
			}
			return "OK"
		}
		return "OK"
	default:
		return "UNKNOWN"
	}
}

func requireRegularFile(path string, name string) error {
	st, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("%s not found: %s", name, path)
		}
		return fmt.Errorf("stat %s: %w", path, err)
	}
	if st.IsDir() {
		return fmt.Errorf("%s is a directory: %s", name, path)
	}
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open %s: %w", src, err)
	}
	defer func() { _ = in.Close() }()

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", filepath.Dir(dst), err)
	}

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open %s: %w", dst, err)
	}
	defer func() { _ = out.Close() }()

	if _, err := io.Copy(out, in); err != nil {
		return fmt.Errorf("copy %s to %s: %w", src, dst, err)
	}
	return nil
}

func readMapField(root map[string]any, key string) map[string]any {
	raw, ok := root[key]
	if !ok {
		return map[string]any{}
	}
	m, ok := raw.(map[string]any)
	if !ok || m == nil {
		return map[string]any{}
	}
	return m
}

func matchingProfileIDs(profiles map[string]any, provider string) []string {
	ids := make([]string, 0, len(profiles))
	for id, raw := range profiles {
		if provider == "all" || profileProvider(raw) == provider {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	return ids
}

func removeProfilesByProvider(profiles map[string]any, provider string) map[string]any {
	next := make(map[string]any, len(profiles))
	for id, raw := range profiles {
		if profileProvider(raw) == provider {
			continue
		}
		next[id] = raw
	}
	return next
}

func profileProvider(raw any) string {
	item, ok := raw.(map[string]any)
	if !ok {
		return ""
	}
	p, _ := item["provider"].(string)
	return p
}

func maybeRestartOpenClaw() error {
	_, err := restartOpenClaw()
	return err
}

func restartOpenClaw() (bool, error) {
	if os.Getenv("OPENCLAW_ADMIN_SKIP_RESTART") == "1" {
		return false, nil
	}
	if _, err := exec.LookPath("systemctl"); err != nil {
		return restartOpenClawGateway()
	}
	cmd := exec.Command("systemctl", "restart", "openclaw")
	if err := cmd.Run(); err != nil {
		return false, fmt.Errorf("restart openclaw service: %w", err)
	}
	return true, nil
}

func restartOpenClawGateway() (bool, error) {
	if _, err := exec.LookPath("openclaw"); err != nil {
		return false, nil
	}
	cmd := exec.Command("openclaw", "gateway", "restart")
	if err := cmd.Run(); err != nil {
		return false, fmt.Errorf("restart openclaw gateway: %w", err)
	}
	return true, nil
}
