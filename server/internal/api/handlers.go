package api

import (
	"context"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"

	"github.com/Sider-ai/sider-openclaw-console/server/internal/openclaw"
)

type API struct {
	service  *openclaw.Service
	sessions *openclaw.SessionManager
}

func NewAPI(service *openclaw.Service, sessions *openclaw.SessionManager) *API {
	return &API{service: service, sessions: sessions}
}

func mapServiceError(err error) error {
	var nf *openclaw.NotFoundError
	if errors.As(err, &nf) {
		return huma.Error404NotFound(nf.Error())
	}
	var ie *openclaw.InputError
	if errors.As(err, &ie) {
		return huma.Error400BadRequest(ie.Error())
	}
	var ce *openclaw.ConflictError
	if errors.As(err, &ce) {
		return huma.Error409Conflict(ce.Error())
	}
	return huma.Error500InternalServerError(err.Error())
}

// Model settings

func (a *API) GetDefaultModelSetting(
	ctx context.Context,
	input *GetDefaultModelSettingInput,
) (*GetDefaultModelSettingOutput, error) {
	res, err := a.service.GetModelSetting(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &GetDefaultModelSettingOutput{Body: res}, nil
}

func (a *API) PatchDefaultModelSetting(
	ctx context.Context,
	input *PatchDefaultModelSettingInput,
) (*PatchDefaultModelSettingOutput, error) {
	res, err := a.service.UpdateDefaultModel(ctx, input.Body.DefaultModel)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &PatchDefaultModelSettingOutput{Body: res}, nil
}

// Providers

func (a *API) ListProviders(ctx context.Context, input *ListProvidersInput) (*ListProvidersOutput, error) {
	items, err := a.service.ListProviders(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	out := &ListProvidersOutput{}
	out.Body.Providers = items
	return out, nil
}

func (a *API) GetProvider(ctx context.Context, input *GetProviderInput) (*GetProviderOutput, error) {
	res, err := a.service.GetProvider(ctx, input.Provider)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &GetProviderOutput{Body: res}, nil
}

func (a *API) ConnectProviderAPIKey(
	ctx context.Context,
	input *ConnectProviderAPIKeyInput,
) (*ConnectProviderAPIKeyOutput, error) {
	res, err := a.service.ConnectProviderAPIKey(ctx, input.Provider, input.Body.APIKey)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &ConnectProviderAPIKeyOutput{Body: res}, nil
}

func (a *API) DisconnectProvider(
	ctx context.Context,
	input *DisconnectProviderInput,
) (*DisconnectProviderOutput, error) {
	res, err := a.service.DisconnectProvider(ctx, input.Provider)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &DisconnectProviderOutput{Body: res}, nil
}

// Auth

func (a *API) ResetAuth(ctx context.Context, input *ResetAuthInput) (*ResetAuthOutput, error) {
	restart := true
	if input.Body.Restart != nil {
		restart = *input.Body.Restart
	}
	res, err := a.service.ResetAuth(ctx, input.Body.Provider, restart)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &ResetAuthOutput{Body: res}, nil
}

func (a *API) ListAuthProfiles(ctx context.Context, input *ListAuthProfilesInput) (*ListAuthProfilesOutput, error) {
	items, err := a.service.ListAuthProfiles(input.Provider)
	if err != nil {
		return nil, mapServiceError(err)
	}
	out := &ListAuthProfilesOutput{}
	out.Body.AuthProfiles = items
	return out, nil
}

func (a *API) GetAuthProfile(ctx context.Context, input *GetAuthProfileInput) (*GetAuthProfileOutput, error) {
	item, err := a.service.GetAuthProfile(input.Provider, input.AuthProfile)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &GetAuthProfileOutput{Body: item}, nil
}

// Telegram channel

func (a *API) GetTelegramChannel(
	ctx context.Context,
	input *GetTelegramChannelInput,
) (*GetTelegramChannelOutput, error) {
	res, err := a.service.GetTelegramChannel()
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &GetTelegramChannelOutput{Body: res}, nil
}

func (a *API) PatchTelegramChannel(
	ctx context.Context,
	input *PatchTelegramChannelInput,
) (*PatchTelegramChannelOutput, error) {
	res, err := a.service.UpdateTelegramChannel(ctx, openclaw.TelegramChannelUpdate{
		Enabled:        input.Body.Enabled,
		BotToken:       input.Body.BotToken,
		DMPolicy:       input.Body.DMPolicy,
		AllowFrom:      input.Body.AllowFrom,
		GroupPolicy:    input.Body.GroupPolicy,
		RequireMention: input.Body.RequireMention,
	})
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &PatchTelegramChannelOutput{Body: res}, nil
}

func (a *API) TestTelegramChannel(
	ctx context.Context,
	input *TestTelegramChannelInput,
) (*TestTelegramChannelOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()
	res, err := a.service.TestTelegramChannel(ctx, input.Body.BotToken)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &TestTelegramChannelOutput{Body: res}, nil
}

func (a *API) DisconnectTelegramChannel(
	ctx context.Context,
	input *DisconnectTelegramChannelInput,
) (*DisconnectTelegramChannelOutput, error) {
	res, err := a.service.DisconnectTelegramChannel(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &DisconnectTelegramChannelOutput{Body: res}, nil
}

func (a *API) ListTelegramPairings(
	ctx context.Context,
	input *ListTelegramPairingsInput,
) (*ListTelegramPairingsOutput, error) {
	items, err := a.service.ListTelegramPairings(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	out := &ListTelegramPairingsOutput{}
	out.Body.Pairings = items
	return out, nil
}

func (a *API) ApproveTelegramPairing(
	ctx context.Context,
	input *ApproveTelegramPairingInput,
) (*ApproveTelegramPairingOutput, error) {
	if err := a.service.ApproveTelegramPairing(ctx, input.Code); err != nil {
		return nil, mapServiceError(err)
	}
	out := &ApproveTelegramPairingOutput{}
	out.Body.Code = input.Code
	return out, nil
}

func (a *API) RejectTelegramPairing(
	ctx context.Context,
	input *RejectTelegramPairingInput,
) (*RejectTelegramPairingOutput, error) {
	if err := a.service.RejectTelegramPairing(ctx, input.Code); err != nil {
		return nil, mapServiceError(err)
	}
	out := &RejectTelegramPairingOutput{}
	out.Body.Code = input.Code
	return out, nil
}

// Channels

func (a *API) ListChannels(ctx context.Context, input *ListChannelsInput) (*ListChannelsOutput, error) {
	items, err := a.service.ListChannels(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	out := &ListChannelsOutput{}
	out.Body.Channels = items
	return out, nil
}

// QQ Bot channel

func (a *API) GetQQBotChannel(ctx context.Context, input *GetQQBotChannelInput) (*GetQQBotChannelOutput, error) {
	res, err := a.service.GetQQBotChannel(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &GetQQBotChannelOutput{Body: res}, nil
}

func (a *API) PatchQQBotChannel(ctx context.Context, input *PatchQQBotChannelInput) (*PatchQQBotChannelOutput, error) {
	res, err := a.service.UpdateQQBotChannel(ctx, openclaw.QQBotChannelUpdate{
		Enabled:            input.Body.Enabled,
		AppID:              input.Body.AppID,
		ClientSecret:       input.Body.ClientSecret,
		AllowFrom:          input.Body.AllowFrom,
		MarkdownSupport:    input.Body.MarkdownSupport,
		ImageServerBaseURL: input.Body.ImageServerBaseURL,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &PatchQQBotChannelOutput{Body: res}, nil
}

func (a *API) DisconnectQQBotChannel(
	ctx context.Context,
	input *DisconnectQQBotChannelInput,
) (*DisconnectQQBotChannelOutput, error) {
	res, err := a.service.DisconnectQQBotChannel(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &DisconnectQQBotChannelOutput{Body: res}, nil
}

// Plugins

func (a *API) ListPlugins(ctx context.Context, input *ListPluginsInput) (*ListPluginsOutput, error) {
	items, err := a.service.ListPlugins(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	out := &ListPluginsOutput{}
	out.Body.Plugins = items
	return out, nil
}

func (a *API) InstallQQBotPlugin(
	ctx context.Context,
	input *InstallQQBotPluginInput,
) (*InstallQQBotPluginOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	res, err := a.service.InstallQQBotPlugin(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &InstallQQBotPluginOutput{Body: res}, nil
}

// Model catalog

func (a *API) ListModelCatalogEntries(
	ctx context.Context,
	input *ListModelCatalogEntriesInput,
) (*ListModelCatalogEntriesOutput, error) {
	if input.Provider == "" {
		items, err := a.service.ListModelCatalogSnapshot(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &ListModelCatalogEntriesOutput{}
		out.Body.ModelCatalogEntries = items
		return out, nil
	}

	items, next, err := a.service.ListModelCatalogEntries(ctx, input.Provider, input.PageToken, input.PageSize)
	if err != nil {
		return nil, mapServiceError(err)
	}
	out := &ListModelCatalogEntriesOutput{}
	out.Body.ModelCatalogEntries = items
	out.Body.NextPageToken = next
	return out, nil
}

// Codex auth sessions

func (a *API) CreateCodexAuthSession(
	ctx context.Context,
	input *CreateCodexAuthSessionInput,
) (*CreateCodexAuthSessionOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	res, err := a.sessions.Create(ctx, input.Body.DefaultModelHint)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}
	return &CreateCodexAuthSessionOutput{Body: res}, nil
}

func (a *API) GetCodexAuthSession(
	ctx context.Context,
	input *GetCodexAuthSessionInput,
) (*GetCodexAuthSessionOutput, error) {
	res, err := a.sessions.Get(input.CodexAuthSession)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &GetCodexAuthSessionOutput{Body: res}, nil
}

func (a *API) SubmitCodexRedirect(
	ctx context.Context,
	input *SubmitCodexRedirectInput,
) (*SubmitCodexRedirectOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, 95*time.Second)
	defer cancel()
	res, err := a.sessions.SubmitRedirect(ctx, input.CodexAuthSession, input.Body.RedirectURL)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &SubmitCodexRedirectOutput{Body: res}, nil
}

func (a *API) CancelCodexSession(
	ctx context.Context,
	input *CancelCodexSessionInput,
) (*CancelCodexSessionOutput, error) {
	res, err := a.sessions.Cancel(input.CodexAuthSession)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &CancelCodexSessionOutput{Body: res}, nil
}
