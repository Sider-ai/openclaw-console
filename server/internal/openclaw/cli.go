package openclaw

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
)

type CLI struct{}

func NewCLI() *CLI {
	return &CLI{}
}

type modelsStatus struct {
	DefaultModel string `json:"defaultModel"`
	Auth         struct {
		ProvidersWithOAuth    []string `json:"providersWithOAuth"`
		MissingProvidersInUse []string `json:"missingProvidersInUse"`
		Providers             []struct {
			Provider string `json:"provider"`
			Profiles struct {
				Labels []string `json:"labels"`
				OAuth  int      `json:"oauth"`
				APIKey int      `json:"apiKey"`
				Token  int      `json:"token"`
				Count  int      `json:"count"`
			} `json:"profiles"`
		} `json:"providers"`
	} `json:"auth"`
}

type modelsList struct {
	Count  int `json:"count"`
	Models []struct {
		Key           string   `json:"key"`
		Name          string   `json:"name"`
		Input         string   `json:"input"`
		ContextWindow int64    `json:"contextWindow"`
		Available     bool     `json:"available"`
		Tags          []string `json:"tags"`
	} `json:"models"`
}

type pluginsList struct {
	Plugins []struct {
		ID         string   `json:"id"`
		Name       string   `json:"name"`
		Version    string   `json:"version"`
		Source     string   `json:"source"`
		Origin     string   `json:"origin"`
		Enabled    bool     `json:"enabled"`
		Status     string   `json:"status"`
		ChannelIDs []string `json:"channelIds"`
	} `json:"plugins"`
}

type channelsCapabilities struct {
	Channels []struct {
		Channel    string `json:"channel"`
		AccountID  string `json:"accountId"`
		Configured bool   `json:"configured"`
		Enabled    bool   `json:"enabled"`
	} `json:"channels"`
}

func (c *CLI) ModelsStatus(ctx context.Context) (modelsStatus, error) {
	out, err := c.runJSON(ctx, "openclaw", "models", "status")
	if err != nil {
		return modelsStatus{}, err
	}
	var st modelsStatus
	if err := json.Unmarshal(out, &st); err != nil {
		return modelsStatus{}, fmt.Errorf("parse models status: %w", err)
	}
	return st, nil
}

func (c *CLI) ModelsList(ctx context.Context, provider string) (modelsList, error) {
	args := []string{"models", "list", "--all"}
	if provider != "" {
		args = append(args, "--provider", provider)
	}
	out, err := c.runJSON(ctx, "openclaw", args...)
	if err != nil {
		return modelsList{}, err
	}
	var ml modelsList
	if err := json.Unmarshal(out, &ml); err != nil {
		return modelsList{}, fmt.Errorf("parse models list: %w", err)
	}
	return ml, nil
}

func (c *CLI) SetDefaultModel(ctx context.Context, model string) error {
	if model == "" {
		return errors.New("model is required")
	}
	_, err := c.run(ctx, "openclaw", "models", "set", model)
	return err
}

func (c *CLI) GatewayRestart(ctx context.Context) error {
	_, err := c.run(ctx, "openclaw", "gateway", "restart")
	return err
}

func (c *CLI) PluginsList(ctx context.Context) (pluginsList, error) {
	out, err := c.runJSON(ctx, "openclaw", "plugins", "list")
	if err != nil {
		return pluginsList{}, err
	}
	var res pluginsList
	if err := json.Unmarshal(out, &res); err != nil {
		return pluginsList{}, fmt.Errorf("parse plugins list: %w", err)
	}
	return res, nil
}

func (c *CLI) InstallPlugin(ctx context.Context, spec string) (string, error) {
	out, err := c.run(ctx, "openclaw", "plugins", "install", spec)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

type pairingList struct {
	Pairings []struct {
		Code        string `json:"code"`
		Channel     string `json:"channel"`
		UserID      string `json:"userId"`
		Username    string `json:"username"`
		FirstName   string `json:"firstName"`
		RequestedAt string `json:"requestedAt"`
	} `json:"pairings"`
}

func (c *CLI) PairingList(ctx context.Context, channel string) (pairingList, error) {
	out, err := c.runJSON(ctx, "openclaw", "pairing", "list", channel)
	if err != nil {
		return pairingList{}, err
	}
	var res pairingList
	if err := json.Unmarshal(out, &res); err != nil {
		return pairingList{}, fmt.Errorf("parse pairing list: %w", err)
	}
	return res, nil
}

func (c *CLI) PairingApprove(ctx context.Context, channel, code string) error {
	_, err := c.run(ctx, "openclaw", "pairing", "approve", channel, code)
	return err
}

func (c *CLI) PairingReject(ctx context.Context, channel, code string) error {
	_, err := c.run(ctx, "openclaw", "pairing", "reject", channel, code)
	return err
}

func (c *CLI) ChannelCapabilities(ctx context.Context, channel string) (channelsCapabilities, error) {
	args := []string{"channels", "capabilities"}
	if channel != "" {
		args = append(args, "--channel", channel)
	}
	out, err := c.runJSON(ctx, "openclaw", args...)
	if err != nil {
		return channelsCapabilities{}, err
	}
	var res channelsCapabilities
	if err := json.Unmarshal(out, &res); err != nil {
		return channelsCapabilities{}, fmt.Errorf("parse channels capabilities: %w", err)
	}
	return res, nil
}

func (c *CLI) runJSON(ctx context.Context, bin string, args ...string) ([]byte, error) {
	args = append(args, "--json")
	cmd := exec.CommandContext(ctx, bin, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%s %v failed: %w: %s", bin, args, err, stderr.String())
	}
	return stdout.Bytes(), nil
}

func (c *CLI) run(ctx context.Context, bin string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, bin, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%s %v failed: %w: %s", bin, args, err, string(out))
	}
	return out, nil
}

func EncodePageToken(offset int) string {
	return base64.RawURLEncoding.EncodeToString([]byte(strconv.Itoa(offset)))
}

func DecodePageToken(token string) (int, error) {
	if token == "" {
		return 0, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return 0, &InputError{Message: fmt.Sprintf("invalid page token: %v", err)}
	}
	n, err := strconv.Atoi(string(b))
	if err != nil {
		return 0, &InputError{Message: fmt.Sprintf("invalid page token: %v", err)}
	}
	if n < 0 {
		return 0, &InputError{Message: "invalid page token"}
	}
	return n, nil
}
