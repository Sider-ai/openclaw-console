package openclaw

import (
	"context"
	"errors"
	"testing"
)

func TestService_ListProviders(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	providers, err := svc.ListProviders(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(providers) == 0 {
		t.Fatal("expected providers")
	}
	found := false
	for _, p := range providers {
		if p.ProviderID == "openai" {
			found = true
			if p.DisplayName != "OpenAI" {
				t.Errorf("display name = %q", p.DisplayName)
			}
		}
	}
	if !found {
		t.Error("openai provider not found")
	}
}

func TestService_GetProvider(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	p, err := svc.GetProvider(ctx, "openai")
	if err != nil {
		t.Fatal(err)
	}
	if p.ProviderID != "openai" {
		t.Errorf("providerId = %q", p.ProviderID)
	}
	if p.Connection != ConnectionConnected {
		t.Errorf("connection = %q", p.Connection)
	}
}

func TestService_GetProvider_NotFound(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	_, err := svc.GetProvider(ctx, "nonexistent-provider")
	if err == nil {
		t.Fatal("expected error")
	}
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Errorf("expected NotFoundError, got %T: %v", err, err)
	}
}

func TestService_ConnectProviderAPIKey(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	p, err := svc.ConnectProviderAPIKey(ctx, "anthropic", "sk-test-key")
	if err != nil {
		t.Fatal(err)
	}
	if p.ProviderID != "anthropic" {
		t.Errorf("providerId = %q", p.ProviderID)
	}
}

func TestService_ConnectProviderAPIKey_UnsupportedProvider(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	_, err := svc.ConnectProviderAPIKey(ctx, "openai-codex", "key")
	if err == nil {
		t.Fatal("expected error")
	}
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Errorf("expected NotFoundError, got %T", err)
	}
}

func TestService_DisconnectProvider(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	// First connect
	if _, err := svc.ConnectProviderAPIKey(ctx, "openai", "sk-key"); err != nil {
		t.Fatal(err)
	}

	// Then disconnect
	p, err := svc.DisconnectProvider(ctx, "openai")
	if err != nil {
		t.Fatal(err)
	}
	if p.ProviderID != "openai" {
		t.Errorf("providerId = %q", p.ProviderID)
	}
}

func TestService_DisconnectProvider_UnsupportedProvider(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	_, err := svc.DisconnectProvider(ctx, "amazon-bedrock")
	if err == nil {
		t.Fatal("expected error")
	}
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Errorf("expected NotFoundError, got %T", err)
	}
}

func TestService_UpdateDefaultModel(t *testing.T) {
	called := false
	cli := newStandardMockCLI()
	cli.setDefaultModelFn = func(_ context.Context, model string) error {
		called = true
		if model != "anthropic/claude-sonnet-4-6" {
			t.Errorf("model = %q", model)
		}
		return nil
	}

	svc := newTestService(t, cli)
	ctx := context.Background()

	_, err := svc.UpdateDefaultModel(ctx, "anthropic/claude-sonnet-4-6")
	if err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Error("SetDefaultModel not called")
	}
}

func TestService_UpdateDefaultModel_Empty(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	_, err := svc.UpdateDefaultModel(ctx, "")
	if err == nil {
		t.Fatal("expected error")
	}
	var ie *InputError
	if !errors.As(err, &ie) {
		t.Errorf("expected InputError, got %T", err)
	}
}

func TestService_GetModelSetting(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	setting, err := svc.GetModelSetting(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if setting.DefaultModel != "openai/gpt-4.1" {
		t.Errorf("default model = %q", setting.DefaultModel)
	}
}

func TestService_ListModelCatalogEntries_Pagination(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	// First page with small pageSize
	entries, nextToken, err := svc.ListModelCatalogEntries(ctx, "openai", "", 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if nextToken == "" {
		t.Fatal("expected next token")
	}

	// Second page
	entries2, nextToken2, err := svc.ListModelCatalogEntries(ctx, "openai", nextToken, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries2) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries2))
	}
	if nextToken2 != "" {
		t.Errorf("expected no next token, got %q", nextToken2)
	}

	// Provider validation
	_, _, err = svc.ListModelCatalogEntries(ctx, "", "", 10)
	if err == nil {
		t.Fatal("expected error for empty provider")
	}

	// Unknown provider
	_, _, err = svc.ListModelCatalogEntries(ctx, "nonexistent-xyz", "", 10)
	if err == nil {
		t.Fatal("expected error for unknown provider")
	}
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Errorf("expected NotFoundError, got %T", err)
	}
}

func TestService_UpdateTelegramChannel(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	token := "bot:token123"
	res, err := svc.UpdateTelegramChannel(ctx, TelegramChannelUpdate{
		Enabled:     true,
		BotToken:    &token,
		DMPolicy:    "allowlist",
		AllowFrom:   []string{"123", "456"},
		GroupPolicy: "allowlist",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Enabled {
		t.Error("expected enabled")
	}
	if res.LastAppliedAction != "saved" {
		t.Errorf("action = %q", res.LastAppliedAction)
	}
	if len(res.AllowFrom) != 2 {
		t.Errorf("allowFrom = %v", res.AllowFrom)
	}
}

func TestService_ListTelegramPairings(t *testing.T) {
	cli := newStandardMockCLI()
	cli.pairingListFn = func(_ context.Context, channel string) (pairingList, error) {
		if channel != "telegram" {
			t.Errorf("channel = %q", channel)
		}
		return pairingList{
			Pairings: []struct {
				Code        string `json:"code"`
				Channel     string `json:"channel"`
				UserID      string `json:"userId"`
				Username    string `json:"username"`
				FirstName   string `json:"firstName"`
				RequestedAt string `json:"requestedAt"`
			}{
				{Code: "ABC123", UserID: "111", Username: "alice", FirstName: "Alice"},
			},
		}, nil
	}

	svc := newTestService(t, cli)
	ctx := context.Background()

	pairings, err := svc.ListTelegramPairings(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(pairings) != 1 {
		t.Fatalf("expected 1 pairing, got %d", len(pairings))
	}
	if pairings[0].Code != "ABC123" {
		t.Errorf("code = %q", pairings[0].Code)
	}
}

func TestService_ApproveTelegramPairing_NotFound(t *testing.T) {
	cli := newStandardMockCLI()
	cli.pairingApproveFn = func(_ context.Context, _, _ string) error {
		return errors.New("No pending pairing request found")
	}

	svc := newTestService(t, cli)
	ctx := context.Background()

	err := svc.ApproveTelegramPairing(ctx, "INVALID")
	if err == nil {
		t.Fatal("expected error")
	}
	var ie *InputError
	if !errors.As(err, &ie) {
		t.Errorf("expected InputError, got %T: %v", err, err)
	}
}

func TestService_ListChannels(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	channels, err := svc.ListChannels(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(channels) != 2 {
		t.Fatalf("expected 2 channels, got %d", len(channels))
	}

	var telegram, qqbot *ChannelSummaryResource
	for i := range channels {
		switch channels[i].ChannelID {
		case "telegram":
			telegram = &channels[i]
		case "qqbot":
			qqbot = &channels[i]
		}
	}
	if telegram == nil {
		t.Fatal("telegram channel not found")
	}
	if qqbot == nil {
		t.Fatal("qqbot channel not found")
	}
	if !telegram.PluginInstalled {
		t.Error("telegram plugin should be installed (builtin)")
	}
	if qqbot.PluginInstalled {
		t.Error("qqbot plugin should not be installed")
	}
}

func TestService_ListAuthProfiles(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())

	writeTestJSON(t, svc.store.paths.AuthStorePath, AuthStore{
		Version: 1,
		Profiles: map[string]AuthCredential{
			"openai:default": {Type: "api_key", Provider: "openai", Key: "sk-1"},
		},
	})

	profiles, err := svc.ListAuthProfiles("openai")
	if err != nil {
		t.Fatal(err)
	}
	if len(profiles) != 1 {
		t.Fatalf("expected 1 profile, got %d", len(profiles))
	}
}

func TestService_ListAuthProfiles_UnsupportedProvider(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())

	_, err := svc.ListAuthProfiles("totally-unknown-xyz")
	if err == nil {
		t.Fatal("expected error")
	}
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Errorf("expected NotFoundError, got %T", err)
	}
}

func TestService_ResetAuth(t *testing.T) {
	cli := newStandardMockCLI()
	svc := newTestService(t, cli)
	ctx := context.Background()

	// Setup auth data
	writeTestJSON(t, svc.store.paths.AuthStorePath, AuthStore{
		Version: 1,
		Profiles: map[string]AuthCredential{
			"openai:default": {Type: "api_key", Provider: "openai", Key: "sk-1"},
		},
	})
	writeTestJSON(t, svc.store.paths.ConfigPath, map[string]any{
		"auth": map[string]any{
			"profiles": map[string]any{
				"openai:default": map[string]any{"provider": "openai", "mode": "api_key"},
			},
		},
	})

	result, err := svc.ResetAuth(ctx, "openai", false)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.AuthProfilesRemoved) != 1 {
		t.Errorf("auth profiles removed = %v", result.AuthProfilesRemoved)
	}
}

func TestService_ResetAuth_UnsupportedProvider(t *testing.T) {
	svc := newTestService(t, newStandardMockCLI())
	ctx := context.Background()

	_, err := svc.ResetAuth(ctx, "anthropic", false)
	if err == nil {
		t.Fatal("expected error")
	}
	var ie *InputError
	if !errors.As(err, &ie) {
		t.Errorf("expected InputError, got %T", err)
	}
}
