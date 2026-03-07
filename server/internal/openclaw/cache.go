package openclaw

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/rs/zerolog/log"
)

type serviceSnapshot struct {
	modelSetting           ModelSettingResource
	providers              []ProviderSummaryResource
	providerByID           map[string]ProviderResource
	providerIDs            map[string]struct{}
	modelCatalogByProvider map[string][]ModelCatalogEntryResource
	availableModelCatalog  []ModelCatalogEntryResource
	plugins                pluginsList
}

type serviceCache struct {
	cli *CLI

	mu       sync.RWMutex
	snapshot *serviceSnapshot

	startOnce sync.Once
	refreshCh chan struct{}
}

func newServiceCache(cli *CLI) *serviceCache {
	return &serviceCache{
		cli:       cli,
		refreshCh: make(chan struct{}, 1),
	}
}

func (c *serviceCache) Warmup(ctx context.Context) error {
	return c.refresh(ctx)
}

func (c *serviceCache) Start(ctx context.Context) {
	c.startOnce.Do(func() {
		go c.refreshLoop(ctx)
		if err := c.startFileWatcher(ctx, c.cli.paths.ConfigPath, c.cli.paths.AuthStorePath); err != nil {
			log.Warn().Err(err).Msg("openclaw cache file watcher disabled")
		}
		c.TriggerRefresh("startup")
	})
}

func (c *serviceCache) TriggerRefresh(_ string) {
	select {
	case c.refreshCh <- struct{}{}:
	default:
	}
}

func (c *serviceCache) Snapshot(ctx context.Context) (*serviceSnapshot, error) {
	c.mu.RLock()
	snapshot := c.snapshot
	c.mu.RUnlock()
	if snapshot != nil {
		return snapshot, nil
	}
	if err := c.refresh(ctx); err != nil {
		return nil, err
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.snapshot == nil {
		return nil, errors.New("cache unavailable")
	}
	return c.snapshot, nil
}

func (c *serviceCache) refreshLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-c.refreshCh:
			refreshCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
			if err := c.refresh(refreshCtx); err != nil {
				log.Warn().Err(err).Msg("openclaw cache refresh failed")
			}
			cancel()
		}
	}
}

func (c *serviceCache) refresh(ctx context.Context) error {
	status, err := c.cli.ModelsStatus(ctx)
	if err != nil {
		return err
	}
	list, err := c.cli.ModelsList(ctx, "")
	if err != nil {
		return err
	}
	plugins, err := c.cli.PluginsList(ctx)
	if err != nil {
		return err
	}
	next := buildServiceSnapshot(status, list)
	next.plugins = plugins
	c.mu.Lock()
	c.snapshot = next
	c.mu.Unlock()
	return nil
}

func (c *serviceCache) startFileWatcher(ctx context.Context, paths ...string) error {
	targetsByDir := map[string]map[string]struct{}{}
	for _, p := range paths {
		if p == "" {
			continue
		}
		dir := filepath.Dir(p)
		base := filepath.Base(p)
		targets := targetsByDir[dir]
		if targets == nil {
			targets = map[string]struct{}{}
			targetsByDir[dir] = targets
		}
		targets[base] = struct{}{}
	}
	if len(targetsByDir) == 0 {
		return nil
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	for dir := range targetsByDir {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			_ = watcher.Close()
			return fmt.Errorf("prepare watch dir %s: %w", dir, err)
		}
		if err := watcher.Add(dir); err != nil {
			_ = watcher.Close()
			return fmt.Errorf("watch %s: %w", dir, err)
		}
	}

	go func() {
		defer watcher.Close()
		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				targets := targetsByDir[filepath.Dir(event.Name)]
				if len(targets) == 0 {
					continue
				}
				if _, ok := targets[filepath.Base(event.Name)]; !ok {
					continue
				}
				if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Rename|fsnotify.Remove) == 0 {
					continue
				}
				c.TriggerRefresh("file-change")
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Warn().Err(err).Msg("openclaw cache watcher error")
			}
		}
	}()
	return nil
}

func buildServiceSnapshot(status modelsStatus, list modelsList) *serviceSnapshot {
	discoveredProviders := map[string]struct{}{}
	modelCatalogByProvider := map[string][]ModelCatalogEntryResource{}
	availableModelCatalog := make([]ModelCatalogEntryResource, 0, len(list.Models))

	for _, model := range list.Models {
		provider := providerFromModelKey(model.Key)
		if !isCanonicalProviderID(provider) {
			continue
		}
		discoveredProviders[provider] = struct{}{}

		entry := ModelCatalogEntryResource{
			Name:          "modelCatalogEntries/" + sanitizeModelKey(model.Key),
			ModelKey:      model.Key,
			DisplayName:   model.Name,
			Provider:      provider,
			Input:         model.Input,
			ContextWindow: model.ContextWindow,
			Available:     model.Available,
			Tags:          model.Tags,
		}
		modelCatalogByProvider[provider] = append(modelCatalogByProvider[provider], entry)
		if entry.Available {
			availableModelCatalog = append(availableModelCatalog, entry)
		}
	}

	for _, items := range modelCatalogByProvider {
		sort.Slice(items, func(i, j int) bool {
			left := strings.ToLower(items[i].DisplayName + items[i].ModelKey)
			right := strings.ToLower(items[j].DisplayName + items[j].ModelKey)
			return left < right
		})
	}
	sort.Slice(availableModelCatalog, func(i, j int) bool {
		leftProvider := availableModelCatalog[i].Provider
		rightProvider := availableModelCatalog[j].Provider
		if leftProvider != rightProvider {
			return leftProvider < rightProvider
		}
		left := strings.ToLower(availableModelCatalog[i].DisplayName + availableModelCatalog[i].ModelKey)
		right := strings.ToLower(availableModelCatalog[j].DisplayName + availableModelCatalog[j].ModelKey)
		return left < right
	})

	providerSet := map[string]struct{}{}
	for provider := range discoveredProviders {
		providerSet[provider] = struct{}{}
	}
	addStatusProvider := func(provider string) {
		if !isWhitelistedProviderID(provider, discoveredProviders) {
			return
		}
		providerSet[provider] = struct{}{}
	}

	for _, item := range status.Auth.Providers {
		addStatusProvider(item.Provider)
	}
	for _, item := range status.Auth.ProvidersWithOAuth {
		addStatusProvider(item)
	}
	for _, item := range status.Auth.MissingProvidersInUse {
		addStatusProvider(item)
	}

	providerIDs := make([]string, 0, len(providerSet))
	for provider := range providerSet {
		providerIDs = append(providerIDs, provider)
	}
	sort.Strings(providerIDs)

	providers := make([]ProviderSummaryResource, 0, len(providerIDs))
	providerByID := make(map[string]ProviderResource, len(providerIDs))
	for _, provider := range providerIDs {
		providers = append(providers, ProviderSummaryResource{
			Name:           "providers/" + provider,
			ProviderID:     provider,
			DisplayName:    providerDisplayName(provider),
			SupportsAPIKey: supportsAPIKeyProvider(provider),
			Managed:        isManagedProvider(provider),
		})
		providerByID[provider] = buildProviderResourceFromStatus(provider, status, discoveredProviders)
	}

	providerIDsSet := make(map[string]struct{}, len(providerIDs))
	for _, provider := range providerIDs {
		providerIDsSet[provider] = struct{}{}
	}

	return &serviceSnapshot{
		modelSetting: ModelSettingResource{
			Name:         "modelSettings/default",
			DefaultModel: status.DefaultModel,
		},
		providers:              providers,
		providerByID:           providerByID,
		providerIDs:            providerIDsSet,
		modelCatalogByProvider: modelCatalogByProvider,
		availableModelCatalog:  availableModelCatalog,
	}
}

func buildProviderResourceFromStatus(
	provider string,
	status modelsStatus,
	discovered map[string]struct{},
) ProviderResource {
	resource := ProviderResource{
		Name:           "providers/" + provider,
		ProviderID:     provider,
		SupportsAPIKey: supportsAPIKeyProvider(provider),
		Connection:     "NOT_CONFIGURED",
		AuthType:       "NONE",
	}

	for _, p := range status.Auth.Providers {
		if p.Provider != provider {
			continue
		}
		resource.ProfileLabels = append(resource.ProfileLabels, p.Profiles.Labels...)
		switch {
		case p.Profiles.OAuth > 0:
			resource.Connection = ConnectionConnected
			resource.AuthType = "OAUTH"
		case p.Profiles.APIKey > 0:
			resource.Connection = ConnectionConnected
			resource.AuthType = "API_KEY"
		case p.Profiles.Token > 0:
			resource.Connection = ConnectionConnected
			resource.AuthType = "TOKEN"
		}
	}

	resource.MissingInUse = slices.Contains(status.Auth.MissingProvidersInUse, provider)

	seenOAuthProvider := map[string]struct{}{}
	for _, item := range status.Auth.ProvidersWithOAuth {
		if !isWhitelistedProviderID(item, discovered) {
			continue
		}
		if _, ok := seenOAuthProvider[item]; ok {
			continue
		}
		seenOAuthProvider[item] = struct{}{}
		resource.OAuthProviders = append(resource.OAuthProviders, item)
	}
	sort.Strings(resource.OAuthProviders)
	return resource
}
