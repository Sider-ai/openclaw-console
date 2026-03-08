package openclaw

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"
)

func TestStore_TelegramChannel_CRUD(t *testing.T) {
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
	paths := newTestPaths(t)
	store := NewStore(paths)
	ctx := context.Background()

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
	updated, err := store.UpdateTelegramChannel(ctx, TelegramChannelUpdate{
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
	if err := store.DisconnectTelegramChannel(ctx); err != nil {
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
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
	paths := newTestPaths(t)
	store := NewStore(paths)
	ctx := context.Background()

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
	updated, err := store.UpdateQQBotChannel(ctx, QQBotChannelUpdate{
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
	if err := store.DisconnectQQBotChannel(ctx); err != nil {
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

func TestStore_UpsertProviderAPIKey(t *testing.T) {
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
	paths := newTestPaths(t)
	store := NewStore(paths)
	ctx := context.Background()

	if err := store.UpsertProviderAPIKey(ctx, "openai", "sk-test-key"); err != nil {
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
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
	paths := newTestPaths(t)
	store := NewStore(paths)
	ctx := context.Background()

	// First upsert
	if err := store.UpsertProviderAPIKey(ctx, "openai", "sk-key"); err != nil {
		t.Fatal(err)
	}

	// Disconnect
	if err := store.DisconnectProvider(ctx, "openai"); err != nil {
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
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
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
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
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
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
	paths := newTestPaths(t)
	store := NewStore(paths)
	ctx := context.Background()
	cli := &mockCLI{}

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

	result, err := store.ResetAuth(ctx, "openai", false, cli)
	if err != nil {
		t.Fatal(err)
	}

	if len(result.AuthProfilesRemoved) != 1 || result.AuthProfilesRemoved[0] != "openai:default" {
		t.Errorf("auth profiles removed = %v", result.AuthProfilesRemoved)
	}
	if result.AuthBackupPath == "" {
		t.Error("expected backup path")
	}
	if result.RestartSkipped != true {
		t.Error("expected restart skipped")
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
	t.Setenv("OPENCLAW_ADMIN_SKIP_RESTART", "1")
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
}
