package openclaw

import (
	"encoding/json"
	"errors"
	"os"
	"testing"
)

func TestStore_TelegramChannel_CRUD(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	// Get returns defaults when no config exists
	cfg, err := store.GetTelegramChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Enabled {
		t.Error("expected disabled by default")
	}
	if cfg.DMPolicy != "pairing" {
		t.Errorf("default dmPolicy = %q", cfg.DMPolicy)
	}

	// Update
	token := "bot123:token"
	updated, err := store.UpdateTelegramChannel(TelegramChannelUpdate{
		Enabled:   true,
		BotToken:  &token,
		DMPolicy:  "allowlist",
		AllowFrom: []string{"111"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !updated.Enabled {
		t.Error("expected enabled")
	}
	if updated.BotToken != token {
		t.Errorf("bot token = %q", updated.BotToken)
	}

	// Verify persisted
	cfg2, err := store.GetTelegramChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg2.BotToken != token {
		t.Errorf("persisted token = %q", cfg2.BotToken)
	}
	if len(cfg2.AllowFrom) != 1 || cfg2.AllowFrom[0] != "111" {
		t.Errorf("persisted allowFrom = %v", cfg2.AllowFrom)
	}

	// Disconnect
	if err := store.DisconnectTelegramChannel(); err != nil {
		t.Fatal(err)
	}
	cfg3, err := store.GetTelegramChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg3.Enabled {
		t.Error("expected disabled after disconnect")
	}
	if cfg3.BotToken != "" {
		t.Error("expected empty token after disconnect")
	}
}

func TestStore_QQBotChannel_CRUD(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	// Get returns defaults when no config exists
	cfg, err := store.GetQQBotChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Enabled {
		t.Error("expected disabled by default")
	}
	if len(cfg.AllowFrom) != 1 || cfg.AllowFrom[0] != "*" {
		t.Errorf("default allowFrom = %v", cfg.AllowFrom)
	}

	// Update
	secret := "s3cret"
	updated, err := store.UpdateQQBotChannel(QQBotChannelUpdate{
		Enabled:      true,
		AppID:        "app123",
		ClientSecret: &secret,
		AllowFrom:    []string{"user1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !updated.Enabled {
		t.Error("expected enabled")
	}
	if updated.AppID != "app123" {
		t.Errorf("appID = %q", updated.AppID)
	}

	// Verify persisted
	cfg2, err := store.GetQQBotChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg2.AppID != "app123" {
		t.Errorf("persisted appID = %q", cfg2.AppID)
	}

	// Disconnect
	if err := store.DisconnectQQBotChannel(); err != nil {
		t.Fatal(err)
	}
	cfg3, err := store.GetQQBotChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg3.Enabled {
		t.Error("expected disabled after disconnect")
	}
}

func TestStore_WeComAppChannel_CRUD(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	// Get returns defaults when no config exists
	cfg, err := store.GetWeComAppChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Enabled {
		t.Error("expected disabled by default")
	}
	if cfg.DMPolicy != "open" {
		t.Errorf("default dmPolicy = %q", cfg.DMPolicy)
	}
	if len(cfg.AllowFrom) != 1 || cfg.AllowFrom[0] != "*" {
		t.Errorf("default allowFrom = %v", cfg.AllowFrom)
	}

	// Update
	secret := "corp-secret"
	token := "msg-token"
	aesKey := "aes-key-32chars"
	updated, err := store.UpdateWeComAppChannel(WeComAppChannelUpdate{
		Enabled:        true,
		CorpID:         "corp123",
		CorpSecret:     &secret,
		AgentID:        "1000002",
		Token:          &token,
		EncodingAESKey: &aesKey,
		DMPolicy:       "open",
		AllowFrom:      []string{"*"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !updated.Enabled {
		t.Error("expected enabled")
	}
	if updated.CorpID != "corp123" {
		t.Errorf("corpID = %q", updated.CorpID)
	}

	// Verify persisted
	cfg2, err := store.GetWeComAppChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg2.CorpID != "corp123" {
		t.Errorf("persisted corpID = %q", cfg2.CorpID)
	}
	if cfg2.CorpSecret != secret {
		t.Errorf("persisted corpSecret = %q", cfg2.CorpSecret)
	}
	var raw map[string]any
	data, err := os.ReadFile(paths.ConfigPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatal(err)
	}
	channels, ok := raw["channels"].(map[string]any)
	if !ok {
		t.Fatal("channels not found in config")
	}
	wecom, ok := channels["wecom-app"].(map[string]any)
	if !ok {
		t.Fatal("wecom-app not found in config")
	}
	got, ok := wecom["agentId"].(float64)
	if !ok {
		t.Fatalf("agentId should be stored as number, got %T", wecom["agentId"])
	}
	if int64(got) != 1000002 {
		t.Fatalf("agentId = %v", got)
	}
	if got, ok := wecom["encodingAESKey"].(string); !ok || got != aesKey {
		t.Fatalf("encodingAESKey = %#v", wecom["encodingAESKey"])
	}
	if _, ok := wecom["encodingAesKey"]; ok {
		t.Fatalf("legacy encodingAesKey key should not be written: %#v", wecom["encodingAesKey"])
	}

	// Disconnect
	if err := store.DisconnectWeComAppChannel(); err != nil {
		t.Fatal(err)
	}
	cfg3, err := store.GetWeComAppChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg3.Enabled {
		t.Error("expected disabled after disconnect")
	}
}

func TestStore_GetWeComAppChannelConfig_ReadsNumericAgentID(t *testing.T) {
	paths := newTestPaths(t)
	if err := os.WriteFile(paths.ConfigPath, []byte(`{
  "channels": {
    "wecom-app": {
      "enabled": true,
      "corpId": "ww123",
      "agentId": 1000002,
      "token": "token",
      "encodingAesKey": "aes"
    }
  }
}
`), 0o600); err != nil {
		t.Fatal(err)
	}

	store := NewStore(paths)
	cfg, err := store.GetWeComAppChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.AgentID != "1000002" {
		t.Fatalf("agentID = %q", cfg.AgentID)
	}
	if cfg.EncodingAESKey != "aes" {
		t.Fatalf("encodingAESKey = %q", cfg.EncodingAESKey)
	}
}

func TestStore_GetWeComAppChannelConfig_ReadsEncodingAESKey(t *testing.T) {
	paths := newTestPaths(t)
	if err := os.WriteFile(paths.ConfigPath, []byte(`{
  "channels": {
    "wecom-app": {
      "enabled": true,
      "corpId": "ww123",
      "agentId": 1000002,
      "token": "token",
      "encodingAESKey": "aes-new"
    }
  }
}
`), 0o600); err != nil {
		t.Fatal(err)
	}

	store := NewStore(paths)
	cfg, err := store.GetWeComAppChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.EncodingAESKey != "aes-new" {
		t.Fatalf("encodingAESKey = %q", cfg.EncodingAESKey)
	}
}

func TestStore_UpsertProviderAPIKey(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	if err := store.UpsertProviderAPIKey("openai", "sk-test-key"); err != nil {
		t.Fatal(err)
	}

	// Verify auth store
	var auth AuthStore
	data, err := os.ReadFile(paths.AuthStorePath)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &auth); err != nil {
		t.Fatal(err)
	}
	cred, ok := auth.Profiles["openai:default"]
	if !ok {
		t.Fatal("profile not found")
	}
	if cred.Type != "api_key" || cred.Key != "sk-test-key" || cred.Provider != "openai" {
		t.Errorf("unexpected cred: %+v", cred)
	}

	// Verify config file
	var cfg map[string]any
	data, err = os.ReadFile(paths.ConfigPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		t.Fatal(err)
	}
	profiles := getNestedMap(cfg, []string{"auth", "profiles"})
	profileRaw, ok := profiles["openai:default"]
	if !ok {
		t.Fatal("config profile not found")
	}
	profile := profileRaw.(map[string]any)
	if profile["provider"] != "openai" || profile["mode"] != "api_key" {
		t.Errorf("config profile = %v", profile)
	}
}

func TestStore_DisconnectProvider(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	// First upsert
	if err := store.UpsertProviderAPIKey("openai", "sk-key"); err != nil {
		t.Fatal(err)
	}

	// Disconnect
	if err := store.DisconnectProvider("openai"); err != nil {
		t.Fatal(err)
	}

	// Verify auth store is cleaned
	var auth AuthStore
	data, err := os.ReadFile(paths.AuthStorePath)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &auth); err != nil {
		t.Fatal(err)
	}
	if len(auth.Profiles) != 0 {
		t.Errorf("expected empty profiles, got %d", len(auth.Profiles))
	}
}

func TestStore_ListAuthProfiles(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	// Write multiple profiles
	writeTestJSON(t, paths.AuthStorePath, AuthStore{
		Version: 1,
		Profiles: map[string]AuthCredential{
			"openai:default":    {Type: "api_key", Provider: "openai", Key: "sk-1"},
			"anthropic:default": {Type: "api_key", Provider: "anthropic", Key: "sk-2"},
		},
	})

	// List all
	all, err := store.ListAuthProfiles("")
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 2 {
		t.Fatalf("expected 2 profiles, got %d", len(all))
	}
	// Should be sorted by profileID
	if all[0].ProfileID != "anthropic:default" {
		t.Errorf("first profile = %q, want anthropic:default", all[0].ProfileID)
	}

	// Filter by provider
	openai, err := store.ListAuthProfiles("openai")
	if err != nil {
		t.Fatal(err)
	}
	if len(openai) != 1 || openai[0].Provider != "openai" {
		t.Errorf("filtered profiles = %+v", openai)
	}
}

func TestStore_GetAuthProfile(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	writeTestJSON(t, paths.AuthStorePath, AuthStore{
		Version: 1,
		Profiles: map[string]AuthCredential{
			"openai:default": {Type: "api_key", Provider: "openai", Key: "sk-1"},
		},
	})

	// Found
	p, err := store.GetAuthProfile("openai", "openai:default")
	if err != nil {
		t.Fatal(err)
	}
	if p.ProfileID != "openai:default" {
		t.Errorf("profileID = %q", p.ProfileID)
	}

	// Not found
	_, err = store.GetAuthProfile("openai", "openai:missing")
	if err == nil {
		t.Fatal("expected error")
	}
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Errorf("expected NotFoundError, got %T", err)
	}
}

func TestStore_ResetAuth(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	writeTestJSON(t, paths.AuthStorePath, AuthStore{
		Version: 1,
		Profiles: map[string]AuthCredential{
			"openai:default":    {Type: "api_key", Provider: "openai", Key: "sk-1"},
			"anthropic:default": {Type: "api_key", Provider: "anthropic", Key: "sk-2"},
		},
	})
	writeTestJSON(t, paths.ConfigPath, map[string]any{
		"auth": map[string]any{
			"profiles": map[string]any{
				"openai:default":    map[string]any{"provider": "openai", "mode": "api_key"},
				"anthropic:default": map[string]any{"provider": "anthropic", "mode": "api_key"},
			},
		},
	})

	result, err := store.ResetAuth("openai")
	if err != nil {
		t.Fatal(err)
	}

	if len(result.AuthProfilesRemoved) != 1 || result.AuthProfilesRemoved[0] != "openai:default" {
		t.Errorf("auth profiles removed = %v", result.AuthProfilesRemoved)
	}
	if result.AuthBackupPath == "" {
		t.Error("expected backup path")
	}
	// Verify openai profile removed but anthropic remains
	var auth AuthStore
	data, err := os.ReadFile(paths.AuthStorePath)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &auth); err != nil {
		t.Fatal(err)
	}
	if _, ok := auth.Profiles["openai:default"]; ok {
		t.Error("openai profile should be removed")
	}
	if _, ok := auth.Profiles["anthropic:default"]; !ok {
		t.Error("anthropic profile should remain")
	}

	// Verify backup exists
	if _, err := os.Stat(result.AuthBackupPath); err != nil {
		t.Errorf("backup file missing: %v", err)
	}
}

func TestStore_EmptyState(t *testing.T) {
	paths := newTestPaths(t)
	store := NewStore(paths)

	// ListAuthProfiles on missing file returns empty
	profiles, err := store.ListAuthProfiles("")
	if err != nil {
		t.Fatal(err)
	}
	if len(profiles) != 0 {
		t.Errorf("expected 0 profiles, got %d", len(profiles))
	}

	// GetTelegramChannelConfig on missing file returns defaults
	cfg, err := store.GetTelegramChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DMPolicy != "pairing" {
		t.Errorf("default dmPolicy = %q", cfg.DMPolicy)
	}

	// GetQQBotChannelConfig on missing file returns defaults
	qqCfg, err := store.GetQQBotChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if len(qqCfg.AllowFrom) != 1 || qqCfg.AllowFrom[0] != "*" {
		t.Errorf("default allowFrom = %v", qqCfg.AllowFrom)
	}

	// GetWeComAppChannelConfig on missing file returns defaults
	wecomCfg, err := store.GetWeComAppChannelConfig()
	if err != nil {
		t.Fatal(err)
	}
	if wecomCfg.DMPolicy != "open" {
		t.Errorf("default dmPolicy = %q", wecomCfg.DMPolicy)
	}
	if len(wecomCfg.AllowFrom) != 1 || wecomCfg.AllowFrom[0] != "*" {
		t.Errorf("default allowFrom = %v", wecomCfg.AllowFrom)
	}
}
