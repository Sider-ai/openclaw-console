package openclaw

import "context"

// CLIRunner abstracts the openclaw CLI binary for testability.
type CLIRunner interface {
	ModelsStatus(ctx context.Context) (modelsStatus, error)
	ModelsList(ctx context.Context, provider string) (modelsList, error)
	SetDefaultModel(ctx context.Context, model string) error
	PluginsList(ctx context.Context) (pluginsList, error)
	InstallPlugin(ctx context.Context, spec string) (string, error)
	PairingList(ctx context.Context, channel string) (pairingList, error)
	PairingApprove(ctx context.Context, channel, code string) error
	PairingReject(ctx context.Context, channel, code string) error
	GatewayStatus(ctx context.Context) (gatewayStatus, error)
	GatewayStart(ctx context.Context) error
	GatewayStop(ctx context.Context) error
	GatewayRestart(ctx context.Context) error
}
