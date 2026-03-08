package openclaw

import (
	"context"
	"testing"
)

func TestBuildServiceSnapshot(t *testing.T) {
	status := modelsStatus{DefaultModel: "openai/gpt-4.1"}
	status.Auth.Providers = []struct {
		Provider string `json:"provider"`
		Profiles struct {
			Labels []string `json:"labels"`
			OAuth  int      `json:"oauth"`
			APIKey int      `json:"apiKey"`
			Token  int      `json:"token"`
			Count  int      `json:"count"`
		} `json:"profiles"`
	}{
		{
			Provider: "openai",
			Profiles: struct {
				Labels []string `json:"labels"`
				OAuth  int      `json:"oauth"`
				APIKey int      `json:"apiKey"`
				Token  int      `json:"token"`
				Count  int      `json:"count"`
			}{APIKey: 1, Count: 1, Labels: []string{"openai:default"}},
		},
	}
	status.Auth.ProvidersWithOAuth = []string{"openai-codex"}

	list := modelsList{
		Count: 2,
		Models: []struct {
			Key           string   `json:"key"`
			Name          string   `json:"name"`
			Input         string   `json:"input"`
			ContextWindow int64    `json:"contextWindow"`
			Available     bool     `json:"available"`
			Tags          []string `json:"tags"`
		}{
			{Key: "openai/gpt-4.1", Name: "GPT 4.1", Available: true, Tags: []string{"chat"}},
			{Key: "openai/o3-mini", Name: "O3 Mini", Available: false, Tags: []string{"reasoning"}},
			{Key: "anthropic/claude-sonnet-4-6", Name: "Claude Sonnet 4.6", Available: true},
		},
	}

	snap := buildServiceSnapshot(status, list)

	if snap.modelSetting.DefaultModel != "openai/gpt-4.1" {
		t.Errorf("default model = %q", snap.modelSetting.DefaultModel)
	}

	// Providers should include openai (from models + status), anthropic (from models), openai-codex (from ProvidersWithOAuth)
	if len(snap.providers) < 3 {
		t.Fatalf("expected >= 3 providers, got %d: %+v", len(snap.providers), snap.providers)
	}
	providerIDs := map[string]bool{}
	for _, p := range snap.providers {
		providerIDs[p.ProviderID] = true
	}
	for _, want := range []string{"openai", "anthropic", "openai-codex"} {
		if !providerIDs[want] {
			t.Errorf("missing provider %q", want)
		}
	}

	// Model catalog by provider
	openaiModels := snap.modelCatalogByProvider["openai"]
	if len(openaiModels) != 2 {
		t.Errorf("openai models = %d, want 2", len(openaiModels))
	}

	// Available model catalog should only contain available models
	if len(snap.availableModelCatalog) != 2 {
		t.Errorf("available models = %d, want 2", len(snap.availableModelCatalog))
	}

	// Available catalog sorted by provider then name
	if snap.availableModelCatalog[0].Provider != "anthropic" {
		t.Errorf("first available model provider = %q, want anthropic", snap.availableModelCatalog[0].Provider)
	}
}

func TestBuildServiceSnapshot_Empty(t *testing.T) {
	snap := buildServiceSnapshot(modelsStatus{}, modelsList{})
	if len(snap.providers) != 0 {
		t.Errorf("expected 0 providers, got %d", len(snap.providers))
	}
	if len(snap.availableModelCatalog) != 0 {
		t.Errorf("expected 0 available models, got %d", len(snap.availableModelCatalog))
	}
	if snap.modelSetting.Name != "modelSettings/default" {
		t.Errorf("model setting name = %q", snap.modelSetting.Name)
	}
}

func TestBuildProviderResourceFromStatus(t *testing.T) {
	tests := []struct {
		name       string
		provider   string
		oauthCount int
		apiCount   int
		tokenCount int
		wantConn   string
		wantAuth   string
	}{
		{name: "api_key", provider: "openai", apiCount: 1, wantConn: ConnectionConnected, wantAuth: "API_KEY"},
		{name: "oauth", provider: "openai", oauthCount: 1, wantConn: ConnectionConnected, wantAuth: "OAUTH"},
		{name: "token", provider: "openai", tokenCount: 1, wantConn: ConnectionConnected, wantAuth: "TOKEN"},
		{name: "not configured", provider: "openai", wantConn: "NOT_CONFIGURED", wantAuth: "NONE"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var status modelsStatus
			if tc.oauthCount > 0 || tc.apiCount > 0 || tc.tokenCount > 0 {
				status.Auth.Providers = []struct {
					Provider string `json:"provider"`
					Profiles struct {
						Labels []string `json:"labels"`
						OAuth  int      `json:"oauth"`
						APIKey int      `json:"apiKey"`
						Token  int      `json:"token"`
						Count  int      `json:"count"`
					} `json:"profiles"`
				}{
					{
						Provider: tc.provider,
						Profiles: struct {
							Labels []string `json:"labels"`
							OAuth  int      `json:"oauth"`
							APIKey int      `json:"apiKey"`
							Token  int      `json:"token"`
							Count  int      `json:"count"`
						}{OAuth: tc.oauthCount, APIKey: tc.apiCount, Token: tc.tokenCount},
					},
				}
			}
			res := buildProviderResourceFromStatus(tc.provider, status, nil)
			if res.Connection != tc.wantConn {
				t.Errorf("connection = %q, want %q", res.Connection, tc.wantConn)
			}
			if res.AuthType != tc.wantAuth {
				t.Errorf("authType = %q, want %q", res.AuthType, tc.wantAuth)
			}
		})
	}
}

func TestCacheWarmupAndSnapshot(t *testing.T) {
	cli := newStandardMockCLI()
	paths := newTestPaths(t)
	cache := newServiceCache(cli, paths)

	ctx := context.Background()
	if err := cache.Warmup(ctx); err != nil {
		t.Fatal(err)
	}

	snap, err := cache.Snapshot(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if snap == nil {
		t.Fatal("snapshot is nil after warmup")
	}
	if snap.modelSetting.DefaultModel != "openai/gpt-4.1" {
		t.Errorf("default model = %q", snap.modelSetting.DefaultModel)
	}
	if len(snap.providers) == 0 {
		t.Error("expected providers")
	}
	if len(snap.availableModelCatalog) == 0 {
		t.Error("expected available models")
	}
}
