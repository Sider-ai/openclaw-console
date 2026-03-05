package openclaw

import (
	"fmt"
	"os"
	"os/user"
	"path/filepath"
)

// Paths resolves where openclaw config/state files live.
type Paths struct {
	Home          string
	StateDir      string
	ConfigPath    string
	AuthStorePath string
}

func ResolvePaths() (Paths, error) {
	home := os.Getenv("OPENCLAW_HOME")
	if home == "" {
		u, err := user.Current()
		if err != nil {
			return Paths{}, fmt.Errorf("resolve current user: %w", err)
		}
		home = u.HomeDir
	}

	stateDir := filepath.Join(home, ".openclaw")
	configPath := os.Getenv("OPENCLAW_CONFIG_PATH")
	if configPath == "" {
		configPath = filepath.Join(stateDir, "openclaw.json")
	}

	authStorePath := filepath.Join(stateDir, "agents", "main", "agent", "auth-profiles.json")
	return Paths{
		Home:          home,
		StateDir:      stateDir,
		ConfigPath:    configPath,
		AuthStorePath: authStorePath,
	}, nil
}

func (p Paths) WithHome(home string) Paths {
	stateDir := filepath.Join(home, ".openclaw")
	return Paths{
		Home:          home,
		StateDir:      stateDir,
		ConfigPath:    filepath.Join(stateDir, "openclaw.json"),
		AuthStorePath: filepath.Join(stateDir, "agents", "main", "agent", "auth-profiles.json"),
	}
}
