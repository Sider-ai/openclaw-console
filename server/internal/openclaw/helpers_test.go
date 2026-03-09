package openclaw

import (
	"testing"
)

func TestNormalizeTelegramAllowFrom(t *testing.T) {
	tests := []struct {
		name     string
		values   []string
		dmPolicy string
		want     []string
		wantErr  bool
	}{
		{name: "dedup", values: []string{"123", "456", "123"}, dmPolicy: "allowlist", want: []string{"123", "456"}},
		{name: "wildcard open", values: []string{"*"}, dmPolicy: "open", want: []string{"*"}},
		{name: "open requires wildcard only", values: []string{"123"}, dmPolicy: "open", wantErr: true},
		{name: "open rejects wildcard plus id", values: []string{"*", "123"}, dmPolicy: "open", wantErr: true},
		{name: "allowlist requires at least one", values: []string{}, dmPolicy: "allowlist", wantErr: true},
		{name: "pairing empty ok", values: []string{}, dmPolicy: "pairing", want: []string{}},
		{
			name:     "trim whitespace",
			values:   []string{" 123 ", "  456  "},
			dmPolicy: "allowlist",
			want:     []string{"123", "456"},
		},
		{name: "skip empty", values: []string{"", "  ", "123"}, dmPolicy: "allowlist", want: []string{"123"}},
		{name: "invalid id", values: []string{"abc"}, dmPolicy: "allowlist", wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := normalizeTelegramAllowFrom(tc.values, tc.dmPolicy)
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(got) != len(tc.want) {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Errorf("index %d: got %q, want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestNormalizeStringList(t *testing.T) {
	tests := []struct {
		name   string
		values []string
		want   []string
	}{
		{name: "empty", values: []string{}, want: []string{}},
		{name: "nil", values: nil, want: []string{}},
		{name: "dedup", values: []string{"a", "b", "a"}, want: []string{"a", "b"}},
		{name: "trim and skip empty", values: []string{" x ", "", "  ", " y "}, want: []string{"x", "y"}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := normalizeStringList(tc.values)
			if len(got) != len(tc.want) {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Errorf("index %d: got %q, want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestParseTelegramUserID(t *testing.T) {
	tests := []struct {
		input   string
		want    int64
		wantErr bool
	}{
		{input: "123456", want: 123456},
		{input: "-100123", want: -100123},
		{input: "abc", wantErr: true},
		{input: "", wantErr: true},
		{input: "12.34", wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got, err := parseTelegramUserID(tc.input)
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Errorf("got %d, want %d", got, tc.want)
			}
		})
	}
}

func TestEncodeDecodePageToken(t *testing.T) {
	tests := []int{0, 1, 50, 200, 1000}
	for _, offset := range tests {
		token := EncodePageToken(offset)
		got, err := DecodePageToken(token)
		if err != nil {
			t.Fatalf("DecodePageToken(%q): %v", token, err)
		}
		if got != offset {
			t.Errorf("round-trip offset %d: got %d", offset, got)
		}
	}
}

func TestDecodePageToken_Invalid(t *testing.T) {
	tests := []string{"!!invalid!!", "abc"}
	for _, token := range tests {
		_, err := DecodePageToken(token)
		if err == nil {
			t.Errorf("expected error for token %q", token)
		}
	}
}

func TestDecodePageToken_Empty(t *testing.T) {
	got, err := DecodePageToken("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != 0 {
		t.Errorf("got %d, want 0", got)
	}
}

func TestSupportsAPIKeyProvider(t *testing.T) {
	if !supportsAPIKeyProvider("openai") {
		t.Error("openai should be supported")
	}
	if !supportsAPIKeyProvider("anthropic") {
		t.Error("anthropic should be supported")
	}
	if supportsAPIKeyProvider("openai-codex") {
		t.Error("openai-codex should not support API key")
	}
	if supportsAPIKeyProvider("unknown-provider") {
		t.Error("unknown should not be supported")
	}
}

func TestIsManagedProvider(t *testing.T) {
	if !isManagedProvider("openai") {
		t.Error("openai should be managed")
	}
	if !isManagedProvider("openai-codex") {
		t.Error("openai-codex should be managed")
	}
	if isManagedProvider("amazon-bedrock") {
		t.Error("amazon-bedrock should not be managed")
	}
}

func TestIsSupportedResetProvider(t *testing.T) {
	if !isSupportedResetProvider("openai") {
		t.Error("openai should be supported for reset")
	}
	if !isSupportedResetProvider("openai-codex") {
		t.Error("openai-codex should be supported for reset")
	}
	if !isSupportedResetProvider("all") {
		t.Error("all should be supported for reset")
	}
	if isSupportedResetProvider("anthropic") {
		t.Error("anthropic should not be supported for reset")
	}
}

func TestIsCanonicalProviderID(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"openai", true},
		{"openai-codex", true},
		{"my_provider", true},
		{"abc123", true},
		{"", false},
		{"OpenAI", false},
		{"open ai", false},
		{"open/ai", false},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			if got := isCanonicalProviderID(tc.input); got != tc.want {
				t.Errorf("isCanonicalProviderID(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}

func TestIsKnownProvider(t *testing.T) {
	if !isKnownProvider("openai") {
		t.Error("openai should be known")
	}
	if !isKnownProvider("amazon-bedrock") {
		t.Error("amazon-bedrock should be known")
	}
	if !isKnownProvider("github-copilot") {
		t.Error("github-copilot should be known")
	}
	if isKnownProvider("totally-unknown") {
		t.Error("totally-unknown should not be known")
	}
}

func TestIsWhitelistedProviderID(t *testing.T) {
	discovered := map[string]struct{}{"custom-llm": {}}

	if !isWhitelistedProviderID("openai", nil) {
		t.Error("known provider should be whitelisted")
	}
	if !isWhitelistedProviderID("custom-llm", discovered) {
		t.Error("discovered provider should be whitelisted")
	}
	if isWhitelistedProviderID("custom-llm", nil) {
		t.Error("undiscovered unknown provider should not be whitelisted")
	}
	if isWhitelistedProviderID("Open AI", nil) {
		t.Error("non-canonical should not be whitelisted")
	}
}

func TestProviderDisplayName(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"openai", "OpenAI"},
		{"openai-codex", "OpenAI Codex"},
		{"amazon-bedrock", "Amazon Bedrock"},
		{"github-copilot", "GitHub Copilot"},
		{"xai", "xAI"},
		{"zai", "Z.AI"},
		{"groq", "Groq"},
		{"my-custom-provider", "My Custom Provider"},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			if got := providerDisplayName(tc.input); got != tc.want {
				t.Errorf("providerDisplayName(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestHumanizeProviderID(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"groq", "Groq"},
		{"my-provider", "My Provider"},
		{"my_provider", "My Provider"},
		{"", ""},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			if got := humanizeProviderID(tc.input); got != tc.want {
				t.Errorf("humanizeProviderID(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestTelegramMode(t *testing.T) {
	if got := telegramMode(TelegramChannelConfig{WebhookURL: "https://example.com/hook"}); got != "webhook" {
		t.Errorf("got %q, want webhook", got)
	}
	if got := telegramMode(TelegramChannelConfig{}); got != "polling" {
		t.Errorf("got %q, want polling", got)
	}
}

func TestProfileStatus(t *testing.T) {
	tests := []struct {
		name string
		cred AuthCredential
		want string
	}{
		{name: "api_key", cred: AuthCredential{Type: "api_key"}, want: "STATIC"},
		{name: "token", cred: AuthCredential{Type: "token"}, want: "STATIC"},
		{name: "oauth no expires", cred: AuthCredential{Type: "oauth"}, want: "OK"},
		{name: "oauth future", cred: AuthCredential{Type: "oauth", Expires: nowMillis() + 3600000}, want: "OK"},
		{name: "oauth expired", cred: AuthCredential{Type: "oauth", Expires: 1000}, want: "EXPIRED"},
		{name: "unknown type", cred: AuthCredential{Type: "magic"}, want: "UNKNOWN"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := profileStatus(tc.cred); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestSanitizeModelKey(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"openai/gpt-4.1", "openai~gpt-4.1"},
		{"some provider/model name", "some_provider~model_name"},
		{"simple", "simple"},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			if got := sanitizeModelKey(tc.input); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestProviderFromModelKey(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"openai/gpt-4.1", "openai"},
		{"anthropic/claude-sonnet-4-6", "anthropic"},
		{"simple", "simple"},
		{"", ""},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			if got := providerFromModelKey(tc.input); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestBuildTelegramChannelResource(t *testing.T) {
	cfg := TelegramChannelConfig{
		Enabled:    true,
		BotToken:   "test-token",
		DMPolicy:   "pairing",
		AllowFrom:  []string{"123"},
		WebhookURL: "https://example.com",
	}
	res := buildTelegramChannelResource(cfg, "saved")
	if res.Name != "channels/telegram" {
		t.Errorf("got name %q", res.Name)
	}
	if !res.Enabled {
		t.Error("expected enabled")
	}
	if !res.Configured {
		t.Error("expected configured")
	}
	if res.Mode != "webhook" {
		t.Errorf("got mode %q, want webhook", res.Mode)
	}
	if res.LastAppliedAction != "saved" {
		t.Errorf("got action %q", res.LastAppliedAction)
	}
}

func TestBuildQQBotChannelResource(t *testing.T) {
	cfg := QQBotChannelConfig{
		Enabled:      true,
		AppID:        "app123",
		ClientSecret: "secret",
		AllowFrom:    []string{"*"},
	}
	plugin := PluginResource{ID: "qqbot", Installed: true, Version: "1.5.2"}
	res := buildQQBotChannelResource(cfg, plugin, "saved")
	if res.Name != "channels/qqbot" {
		t.Errorf("got name %q", res.Name)
	}
	if !res.PluginInstalled {
		t.Error("expected plugin installed")
	}
	if !res.Configured {
		t.Error("expected configured")
	}
	if res.LastAppliedAction != "saved" {
		t.Errorf("got action %q", res.LastAppliedAction)
	}
}

func TestBuildWeComAppChannelResource(t *testing.T) {
	cfg := WeComAppChannelConfig{
		Enabled:        true,
		CorpID:         "corp123",
		CorpSecret:     "secret",
		AgentID:        "agent1",
		Token:          "token",
		EncodingAESKey: "aeskey",
		AllowFrom:      []string{"*"},
	}
	plugin := PluginResource{ID: "wecom-app", Installed: true, Version: "1.0.0"}
	res := buildWeComAppChannelResource(cfg, plugin, "saved")
	if res.Name != "channels/wecom-app" {
		t.Errorf("got name %q", res.Name)
	}
	if !res.PluginInstalled {
		t.Error("expected plugin installed")
	}
	if !res.Configured {
		t.Error("expected configured")
	}
	if res.LastAppliedAction != "saved" {
		t.Errorf("got action %q", res.LastAppliedAction)
	}
}

func TestPluginByID(t *testing.T) {
	plugins := []PluginResource{
		{ID: "telegram", Installed: true},
		{ID: "qqbot", Installed: true},
	}
	got := pluginByID(plugins, "qqbot")
	if got.ID != "qqbot" || !got.Installed {
		t.Errorf("got %+v", got)
	}
	missing := pluginByID(plugins, "missing")
	if missing.Installed {
		t.Error("missing plugin should not be installed")
	}
}

func TestDefaultString(t *testing.T) {
	if got := defaultString("", "fallback"); got != "fallback" {
		t.Errorf("got %q", got)
	}
	if got := defaultString("value", "fallback"); got != "value" {
		t.Errorf("got %q", got)
	}
}
