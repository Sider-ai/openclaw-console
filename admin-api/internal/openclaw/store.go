package openclaw

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
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

func (s *Store) UpsertOpenAIAPIKey(ctx context.Context, apiKey string, defaultModel string, cli *CLI) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	auth, err := s.readAuthStore(s.paths.AuthStorePath)
	if err != nil {
		return err
	}
	auth.Profiles["openai:default"] = AuthCredential{
		Type:     "api_key",
		Provider: "openai",
		Key:      strings.TrimSpace(apiKey),
	}
	if err := s.writeJSONAtomic(s.paths.AuthStorePath, auth); err != nil {
		return err
	}

	cfg, err := s.readRawJSONMap(s.paths.ConfigPath)
	if err != nil {
		return err
	}
	setNestedMapValue(cfg, []string{"auth", "profiles", "openai:default"}, map[string]any{
		"provider": "openai",
		"mode":     "api_key",
	})
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

func maybeRestartOpenClaw() error {
	if os.Getenv("OPENCLAW_ADMIN_SKIP_RESTART") == "1" {
		return nil
	}
	if _, err := exec.LookPath("systemctl"); err != nil {
		return nil
	}
	cmd := exec.Command("systemctl", "restart", "openclaw")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("restart openclaw service: %w", err)
	}
	return nil
}
