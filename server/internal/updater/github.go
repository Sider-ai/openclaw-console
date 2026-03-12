package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"time"
)

type githubClient struct {
	token      string
	httpClient *http.Client
}

type githubRelease struct {
	TagName string        `json:"tag_name"`
	Assets  []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"` // API URL (use Accept: application/octet-stream)
}

func newGitHubClient(token string) *githubClient {
	return &githubClient{
		token:      token,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (g *githubClient) latestRelease(ctx context.Context, owner, repo string) (*githubRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	g.setAuth(req)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned %d for %s/%s", resp.StatusCode, owner, repo)
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, err
	}
	return &release, nil
}

func (g *githubClient) downloadAsset(ctx context.Context, a githubAsset) (io.ReadCloser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.URL, nil)
	if err != nil {
		return nil, err
	}
	g.setAuth(req)
	req.Header.Set("Accept", "application/octet-stream")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		_ = resp.Body.Close()
		return nil, fmt.Errorf("asset download returned %d", resp.StatusCode)
	}
	return resp.Body, nil
}

func (g *githubClient) setAuth(req *http.Request) {
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}
}

func matchAsset(assets []githubAsset, pattern string) (githubAsset, bool) {
	for _, a := range assets {
		if a.Name == pattern {
			return a, true
		}
		if matched, _ := filepath.Match(pattern, a.Name); matched {
			return a, true
		}
	}
	return githubAsset{}, false
}
