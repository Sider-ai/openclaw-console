package updater

import "time"

// Config holds configuration for the updater extension.
type Config struct {
	GitHubToken string
	StateFile   string // path to persist installed versions; empty disables persistence
	Components  []ComponentConfig
	Interval    time.Duration // check interval; defaults to 30 minutes
}

// ComponentConfig describes a managed component.
type ComponentConfig struct {
	ID          string // unique identifier, e.g. "openclaw-console"
	DisplayName string // human-readable name
	GitHubOwner string // GitHub org/user, e.g. "Sider-ai"
	GitHubRepo  string // GitHub repo name
	AssetName   string // release asset filename, e.g. "openclaw-console-linux-amd64"
	BinaryPath  string // local install path, e.g. "/usr/local/bin/openclaw-console"
	ServiceName string // systemd service name for restart
}

// ComponentStatus is the API response type for a single component.
type ComponentStatus struct {
	ID             string `json:"id"`
	DisplayName    string `json:"displayName"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	Status         string `json:"status"`
}

// UpdateLog is a single log entry shown in the UI.
type UpdateLog struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
	Level     string `json:"level"`
}

const (
	statusUnknown         = "unknown"
	statusUpToDate        = "up_to_date"
	statusUpdateAvailable = "update_available"
	statusUpdating        = "updating"
)
