package openclaw

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// mockCLI implements CLIRunner for testing.
type mockCLI struct {
	modelsStatusFn    func(ctx context.Context) (modelsStatus, error)
	modelsListFn      func(ctx context.Context, provider string) (modelsList, error)
	setDefaultModelFn func(ctx context.Context, model string) error
	pluginsListFn     func(ctx context.Context) (pluginsList, error)
	installPluginFn   func(ctx context.Context, spec string) (string, error)
	pairingListFn     func(ctx context.Context, channel string) (pairingList, error)
	pairingApproveFn  func(ctx context.Context, channel, code string) error
	pairingRejectFn   func(ctx context.Context, channel, code string) error
	gatewayRestartFn  func(ctx context.Context) error
}

type mockRestarter struct {
	restartFn func(ctx context.Context) error
	calls     int
}

func (m *mockRestarter) Restart(ctx context.Context) error {
	m.calls++
	if m.restartFn != nil {
		return m.restartFn(ctx)
	}
	return nil
}

func (m *mockCLI) ModelsStatus(ctx context.Context) (modelsStatus, error) {
	if m.modelsStatusFn != nil {
		return m.modelsStatusFn(ctx)
	}
	return modelsStatus{}, nil
}

func (m *mockCLI) ModelsList(ctx context.Context, provider string) (modelsList, error) {
	if m.modelsListFn != nil {
		return m.modelsListFn(ctx, provider)
	}
	return modelsList{}, nil
}

func (m *mockCLI) SetDefaultModel(ctx context.Context, model string) error {
	if m.setDefaultModelFn != nil {
		return m.setDefaultModelFn(ctx, model)
	}
	return nil
}

func (m *mockCLI) PluginsList(ctx context.Context) (pluginsList, error) {
	if m.pluginsListFn != nil {
		return m.pluginsListFn(ctx)
	}
	return pluginsList{}, nil
}

func (m *mockCLI) InstallPlugin(ctx context.Context, spec string) (string, error) {
	if m.installPluginFn != nil {
		return m.installPluginFn(ctx, spec)
	}
	return "", nil
}

func (m *mockCLI) PairingList(ctx context.Context, channel string) (pairingList, error) {
	if m.pairingListFn != nil {
		return m.pairingListFn(ctx, channel)
	}
	return pairingList{}, nil
}

func (m *mockCLI) PairingApprove(ctx context.Context, channel, code string) error {
	if m.pairingApproveFn != nil {
		return m.pairingApproveFn(ctx, channel, code)
	}
	return nil
}

func (m *mockCLI) PairingReject(ctx context.Context, channel, code string) error {
	if m.pairingRejectFn != nil {
		return m.pairingRejectFn(ctx, channel, code)
	}
	return nil
}

func (m *mockCLI) GatewayRestart(ctx context.Context) error {
	if m.gatewayRestartFn != nil {
		return m.gatewayRestartFn(ctx)
	}
	return nil
}

// newStandardMockCLI returns a mock with realistic provider and model data.
func newStandardMockCLI() *mockCLI {
	return &mockCLI{
		modelsStatusFn: func(_ context.Context) (modelsStatus, error) {
			var s modelsStatus
			s.DefaultModel = "openai/gpt-4.1"
			s.Auth.Providers = []struct {
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
					}{
						Labels: []string{"openai:default"},
						APIKey: 1,
						Count:  1,
					},
				},
				{
					Provider: "anthropic",
					Profiles: struct {
						Labels []string `json:"labels"`
						OAuth  int      `json:"oauth"`
						APIKey int      `json:"apiKey"`
						Token  int      `json:"token"`
						Count  int      `json:"count"`
					}{
						Labels: []string{"anthropic:default"},
						APIKey: 1,
						Count:  1,
					},
				},
			}
			s.Auth.ProvidersWithOAuth = []string{"openai-codex"}
			return s, nil
		},
		modelsListFn: func(_ context.Context, _ string) (modelsList, error) {
			return modelsList{
				Count: 3,
				Models: []struct {
					Key           string   `json:"key"`
					Name          string   `json:"name"`
					Input         string   `json:"input"`
					ContextWindow int64    `json:"contextWindow"`
					Available     bool     `json:"available"`
					Tags          []string `json:"tags"`
				}{
					{
						Key:           "openai/gpt-4.1",
						Name:          "GPT 4.1",
						Input:         "text",
						ContextWindow: 1048576,
						Available:     true,
						Tags:          []string{"chat"},
					},
					{
						Key:           "openai/o3-mini",
						Name:          "O3 Mini",
						Input:         "text",
						ContextWindow: 200000,
						Available:     true,
						Tags:          []string{"reasoning"},
					},
					{
						Key:           "anthropic/claude-sonnet-4-6",
						Name:          "Claude Sonnet 4.6",
						Input:         "text+image",
						ContextWindow: 200000,
						Available:     true,
						Tags:          []string{"chat"},
					},
				},
			}, nil
		},
		pluginsListFn: func(_ context.Context) (pluginsList, error) {
			return pluginsList{
				Plugins: []struct {
					ID         string   `json:"id"`
					Name       string   `json:"name"`
					Version    string   `json:"version"`
					Source     string   `json:"source"`
					Origin     string   `json:"origin"`
					Enabled    bool     `json:"enabled"`
					Status     string   `json:"status"`
					ChannelIDs []string `json:"channelIds"`
				}{
					{
						ID:         "telegram",
						Name:       "Telegram",
						Version:    "builtin",
						Source:     "builtin",
						Enabled:    true,
						Status:     "active",
						ChannelIDs: []string{"telegram"},
					},
				},
			}, nil
		},
	}
}

// newTestPaths returns Paths rooted at a temp dir.
func newTestPaths(t *testing.T) Paths {
	t.Helper()
	dir := t.TempDir()
	stateDir := filepath.Join(dir, ".openclaw")
	authDir := filepath.Join(stateDir, "agents", "main", "agent")
	if err := os.MkdirAll(authDir, 0o755); err != nil {
		t.Fatal(err)
	}
	return Paths{
		Home:          dir,
		StateDir:      stateDir,
		ConfigPath:    filepath.Join(stateDir, "openclaw.json"),
		AuthStorePath: filepath.Join(authDir, "auth-profiles.json"),
	}
}

// newTestService creates a Service with a mock CLI and real Store backed by TempDir.
func newTestService(t *testing.T, cli CLIRunner) *Service {
	return newTestServiceWithRestarter(t, cli, &mockRestarter{})
}

func newTestServiceWithRestarter(t *testing.T, cli CLIRunner, restarter Restarter) *Service {
	t.Helper()
	paths := newTestPaths(t)
	store := NewStore(paths)
	svc := NewService(cli, store, restarter)
	if err := svc.Warmup(context.Background()); err != nil {
		t.Fatal(err)
	}
	return svc
}

// writeTestJSON writes v as JSON to the given path, creating parent dirs.
func writeTestJSON(t *testing.T, path string, v any) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
}
