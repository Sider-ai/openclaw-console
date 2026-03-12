package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

const (
	maxLogs              = 100
	defaultCheckInterval = 30 * time.Minute
)

// Updater implements the console.Extension interface for system component
// updates. It periodically checks GitHub releases and provides an API to
// trigger downloads, binary replacements, and service restarts.
type Updater struct {
	cfg    Config
	github *githubClient

	mu         sync.RWMutex
	components map[string]*componentState
	logs       []UpdateLog
}

type componentState struct {
	config         ComponentConfig
	currentVersion string
	latestVersion  string
	status         string
}

// New creates an Updater extension. Call Start to begin background checking.
func New(cfg Config) *Updater {
	if cfg.Interval == 0 {
		cfg.Interval = defaultCheckInterval
	}

	components := make(map[string]*componentState, len(cfg.Components))
	for _, c := range cfg.Components {
		components[c.ID] = &componentState{
			config: c,
			status: statusUnknown,
		}
	}

	u := &Updater{
		cfg:        cfg,
		github:     newGitHubClient(cfg.GitHubToken),
		components: components,
	}
	u.loadState()
	return u
}

// Extension interface.

func (u *Updater) ID() string          { return "updater" }
func (u *Updater) DisplayName() string { return "System Updates" }
func (u *Updater) Icon() string        { return "refresh-cw" }
func (u *Updater) BasePath() string    { return "/system-updates" }

func (u *Updater) Handler() http.Handler {
	r := chi.NewRouter()
	r.Get("/components", u.handleListComponents)
	r.Post("/components/check", u.handleCheckComponents)
	r.Post("/components/{id}/update", u.handleUpdateComponent)
	r.Post("/components/update-all", u.handleUpdateAll)
	r.Get("/logs", u.handleListLogs)
	return r
}

func (u *Updater) Start(ctx context.Context) error {
	go u.backgroundLoop(ctx)
	return nil
}

// Background loop.

func (u *Updater) backgroundLoop(ctx context.Context) {
	// Initial check shortly after startup.
	timer := time.NewTimer(10 * time.Second)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			u.checkAll(ctx)
			timer.Reset(u.cfg.Interval)
		}
	}
}

// Version checking.

func (u *Updater) checkAll(ctx context.Context) {
	u.mu.RLock()
	configs := make([]ComponentConfig, 0, len(u.components))
	for _, cs := range u.components {
		configs = append(configs, cs.config)
	}
	u.mu.RUnlock()

	for _, cfg := range configs {
		if ctx.Err() != nil {
			return
		}
		u.checkComponent(ctx, cfg)
	}
}

func (u *Updater) checkComponent(ctx context.Context, cfg ComponentConfig) {
	release, err := u.github.latestRelease(ctx, cfg.GitHubOwner, cfg.GitHubRepo)
	if err != nil {
		u.addLog("error", fmt.Sprintf("%s: failed to check: %v", cfg.DisplayName, err))
		return
	}

	u.mu.Lock()
	defer u.mu.Unlock()

	cs := u.components[cfg.ID]
	if cs == nil {
		return
	}
	cs.latestVersion = release.TagName
	if cs.currentVersion != "" && cs.currentVersion == release.TagName {
		cs.status = statusUpToDate
	} else {
		cs.status = statusUpdateAvailable
	}
}

// Update execution.

func (u *Updater) updateSingle(ctx context.Context, id string) error {
	u.mu.RLock()
	cs, ok := u.components[id]
	if !ok {
		u.mu.RUnlock()
		return fmt.Errorf("component %q not found", id)
	}
	cfg := cs.config
	latestVersion := cs.latestVersion
	u.mu.RUnlock()

	if latestVersion == "" {
		return fmt.Errorf("no latest version known for %s; run check first", cfg.DisplayName)
	}
	return u.applyUpdate(ctx, cfg, latestVersion)
}

func (u *Updater) updateAllComponents(ctx context.Context) {
	u.mu.RLock()
	type item struct {
		config  ComponentConfig
		version string
	}
	var pending []item
	for _, cs := range u.components {
		if cs.status == statusUpdateAvailable && cs.latestVersion != "" {
			pending = append(pending, item{cs.config, cs.latestVersion})
		}
	}
	u.mu.RUnlock()

	for _, it := range pending {
		if ctx.Err() != nil {
			return
		}
		if err := u.applyUpdate(ctx, it.config, it.version); err != nil {
			u.addLog("error", fmt.Sprintf("%s: %v", it.config.DisplayName, err))
		}
	}
}

func (u *Updater) applyUpdate(ctx context.Context, cfg ComponentConfig, version string) error {
	u.setStatus(cfg.ID, statusUpdating)
	u.addLog("info", fmt.Sprintf("%s: downloading %s…", cfg.DisplayName, version))

	release, err := u.github.latestRelease(ctx, cfg.GitHubOwner, cfg.GitHubRepo)
	if err != nil {
		u.setStatus(cfg.ID, statusUpdateAvailable)
		return fmt.Errorf("fetch release: %w", err)
	}

	asset, ok := matchAsset(release.Assets, cfg.AssetName)
	if !ok {
		u.setStatus(cfg.ID, statusUpdateAvailable)
		return fmt.Errorf("asset %q not found in release %s", cfg.AssetName, version)
	}

	body, err := u.github.downloadAsset(ctx, asset)
	if err != nil {
		u.setStatus(cfg.ID, statusUpdateAvailable)
		return fmt.Errorf("download: %w", err)
	}
	defer body.Close()

	if err := replaceBinary(cfg.BinaryPath, body); err != nil {
		u.setStatus(cfg.ID, statusUpdateAvailable)
		return fmt.Errorf("replace binary: %w", err)
	}

	u.addLog("info", fmt.Sprintf("%s: binary replaced, restarting…", cfg.DisplayName))

	if cfg.ServiceName != "" {
		if err := restartService(ctx, cfg.ServiceName); err != nil {
			u.addLog("error", fmt.Sprintf("%s: restart failed: %v", cfg.DisplayName, err))
		}
	}

	u.mu.Lock()
	if cs, ok := u.components[cfg.ID]; ok {
		cs.currentVersion = version
		cs.status = statusUpToDate
	}
	u.mu.Unlock()

	u.saveState()
	u.addLog("success", fmt.Sprintf("%s: updated to %s", cfg.DisplayName, version))
	return nil
}

// State helpers.

func (u *Updater) setStatus(id, status string) {
	u.mu.Lock()
	if cs, ok := u.components[id]; ok {
		cs.status = status
	}
	u.mu.Unlock()
}

func (u *Updater) componentStatuses() []ComponentStatus {
	u.mu.RLock()
	defer u.mu.RUnlock()

	out := make([]ComponentStatus, 0, len(u.components))
	for _, cs := range u.components {
		out = append(out, ComponentStatus{
			ID:             cs.config.ID,
			DisplayName:    cs.config.DisplayName,
			CurrentVersion: cs.currentVersion,
			LatestVersion:  cs.latestVersion,
			Status:         cs.status,
		})
	}
	return out
}

func (u *Updater) addLog(level, message string) {
	entry := UpdateLog{
		Timestamp: time.Now().Format("15:04:05"),
		Message:   message,
		Level:     level,
	}
	log.Info().Str("level", level).Msg(message)

	u.mu.Lock()
	u.logs = append(u.logs, entry)
	if len(u.logs) > maxLogs {
		u.logs = u.logs[len(u.logs)-maxLogs:]
	}
	u.mu.Unlock()
}

func (u *Updater) recentLogs() []UpdateLog {
	u.mu.RLock()
	defer u.mu.RUnlock()

	if len(u.logs) == 0 {
		return []UpdateLog{}
	}
	// Return newest first.
	out := make([]UpdateLog, len(u.logs))
	for i, j := 0, len(u.logs)-1; j >= 0; i, j = i+1, j-1 {
		out[i] = u.logs[j]
	}
	return out
}

// Persistence.

type persistedState struct {
	Versions map[string]string `json:"versions"`
}

func (u *Updater) loadState() {
	if u.cfg.StateFile == "" {
		return
	}
	data, err := os.ReadFile(u.cfg.StateFile)
	if err != nil {
		return
	}
	var ps persistedState
	if err := json.Unmarshal(data, &ps); err != nil {
		return
	}
	u.mu.Lock()
	for id, version := range ps.Versions {
		if cs, ok := u.components[id]; ok {
			cs.currentVersion = version
		}
	}
	u.mu.Unlock()
}

func (u *Updater) saveState() {
	if u.cfg.StateFile == "" {
		return
	}
	u.mu.RLock()
	ps := persistedState{Versions: make(map[string]string)}
	for id, cs := range u.components {
		if cs.currentVersion != "" {
			ps.Versions[id] = cs.currentVersion
		}
	}
	u.mu.RUnlock()

	data, err := json.MarshalIndent(ps, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(u.cfg.StateFile, data, 0o600)
}

// System operations.

func replaceBinary(binaryPath string, data io.Reader) error {
	tmpPath := binaryPath + ".tmp"
	f, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("create temp: %w", err)
	}

	if _, err := io.Copy(f, data); err != nil {
		_ = f.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("write: %w", err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("close: %w", err)
	}
	if err := os.Chmod(tmpPath, 0o755); err != nil { //nolint:gosec // executable binary requires 0755
		_ = os.Remove(tmpPath)
		return fmt.Errorf("chmod: %w", err)
	}
	if err := os.Rename(tmpPath, binaryPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("rename: %w", err)
	}
	return nil
}

var validServiceName = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)

func restartService(ctx context.Context, name string) error {
	if !validServiceName.MatchString(name) {
		return fmt.Errorf("invalid service name: %q", name)
	}
	return exec.CommandContext(ctx, "systemctl", "restart", name).Run() //nolint:gosec // name is validated above
}
