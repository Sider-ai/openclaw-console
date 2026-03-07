package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/Sider-ai/sider-openclaw-console/server/internal/openclaw"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

func writeServiceError(w http.ResponseWriter, err error) {
	var notFoundErr *openclaw.NotFoundError
	if errors.As(err, &notFoundErr) {
		writeNotFound(w, notFoundErr.Error())
		return
	}
	var inputErr *openclaw.InputError
	if errors.As(err, &inputErr) {
		writeBadRequest(w, inputErr.Error())
		return
	}
	var conflictErr *openclaw.ConflictError
	if errors.As(err, &conflictErr) {
		writeConflict(w, conflictErr.Error())
		return
	}
	writeInternalError(w, err)
}

type Handler struct {
	service  *openclaw.Service
	sessions *openclaw.SessionManager
	validate *validator.Validate
}

func NewHandler(service *openclaw.Service, sessions *openclaw.SessionManager) *Handler {
	v := validator.New()
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" || name == "" {
			return fld.Name
		}
		return name
	})
	return &Handler{service: service, sessions: sessions, validate: v}
}

func (h *Handler) GetDefaultModelSetting(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.GetModelSetting(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) PatchDefaultModelSetting(w http.ResponseWriter, r *http.Request) {
	updateMask := r.URL.Query().Get("update_mask")
	if updateMask == "" {
		writeBadRequest(w, "update_mask is required and must include default_model")
		return
	}
	if updateMask != "default_model" {
		writeBadRequest(w, "only update_mask=default_model is supported")
		return
	}

	var req patchModelSettingRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	if err := h.validate.Struct(&req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	res, err := h.service.UpdateDefaultModel(r.Context(), req.DefaultModel)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ListProviders(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListProviders(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, providerListResponse{Providers: items})
}

func (h *Handler) GetProvider(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	res, err := h.service.GetProvider(r.Context(), providerID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ConnectProviderAPIKey(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	var req connectAPIKeyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	if err := h.validate.Struct(&req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	providerRes, err := h.service.ConnectProviderAPIKey(r.Context(), providerID, req.APIKey)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, providerRes)
}

func (h *Handler) DisconnectProvider(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	res, err := h.service.DisconnectProvider(r.Context(), providerID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ResetAuth(w http.ResponseWriter, r *http.Request) {
	var req resetAuthRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}

	restart := true
	if req.Restart != nil {
		restart = *req.Restart
	}

	res, err := h.service.ResetAuth(r.Context(), req.Provider, restart)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ListAuthProfiles(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	items, err := h.service.ListAuthProfiles(providerID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, authProfileListResponse{AuthProfiles: items})
}

func (h *Handler) GetAuthProfile(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	profileID := chi.URLParam(r, "auth_profile")
	item, err := h.service.GetAuthProfile(providerID, profileID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) GetTelegramChannel(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.GetTelegramChannel()
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) PatchTelegramChannel(w http.ResponseWriter, r *http.Request) {
	var req patchTelegramChannelRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	if err := h.validate.Struct(&req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	res, err := h.service.UpdateTelegramChannel(r.Context(), openclaw.TelegramChannelUpdate{
		Enabled:        req.Enabled,
		BotToken:       req.BotToken,
		DMPolicy:       req.DMPolicy,
		AllowFrom:      req.AllowFrom,
		GroupPolicy:    req.GroupPolicy,
		RequireMention: req.RequireMention,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) TestTelegramChannel(w http.ResponseWriter, r *http.Request) {
	var req testTelegramChannelRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
	defer cancel()
	res, err := h.service.TestTelegramChannel(ctx, req.BotToken)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) DisconnectTelegramChannel(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.DisconnectTelegramChannel(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ListTelegramPairings(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListTelegramPairings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, telegramPairingListResponse{Pairings: items})
}

func (h *Handler) ApproveTelegramPairing(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		writeBadRequest(w, "code is required")
		return
	}
	if err := h.service.ApproveTelegramPairing(r.Context(), code); err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"code": code})
}

func (h *Handler) RejectTelegramPairing(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		writeBadRequest(w, "code is required")
		return
	}
	if err := h.service.RejectTelegramPairing(r.Context(), code); err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"code": code})
}

func (h *Handler) ListChannels(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListChannels(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, channelListResponse{Channels: items})
}

func (h *Handler) GetQQBotChannel(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.GetQQBotChannel(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) PatchQQBotChannel(w http.ResponseWriter, r *http.Request) {
	var req patchQQBotChannelRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	if err := h.validate.Struct(&req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	res, err := h.service.UpdateQQBotChannel(r.Context(), openclaw.QQBotChannelUpdate{
		Enabled:            req.Enabled,
		AppID:              req.AppID,
		ClientSecret:       req.ClientSecret,
		AllowFrom:          req.AllowFrom,
		MarkdownSupport:    req.MarkdownSupport,
		ImageServerBaseURL: req.ImageServerBaseURL,
	})
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) DisconnectQQBotChannel(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.DisconnectQQBotChannel(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ListPlugins(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListPlugins(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, pluginListResponse{Plugins: items})
}

func (h *Handler) InstallQQBotPlugin(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	res, err := h.service.InstallQQBotPlugin(ctx)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ListModelCatalogEntries(w http.ResponseWriter, r *http.Request) {
	provider := r.URL.Query().Get("provider")
	if provider == "" {
		items, err := h.service.ListModelCatalogSnapshot(r.Context())
		if err != nil {
			writeInternalError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, modelCatalogListResponse{ModelCatalogEntries: items})
		return
	}
	pageSize := 50
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			writeBadRequest(w, "page_size must be a positive integer")
			return
		}
		pageSize = n
	}
	pageToken := r.URL.Query().Get("page_token")

	items, next, err := h.service.ListModelCatalogEntries(r.Context(), provider, pageToken, pageSize)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, modelCatalogListResponse{ModelCatalogEntries: items, NextPageToken: next})
}

func (h *Handler) CreateCodexAuthSession(w http.ResponseWriter, r *http.Request) {
	var req createCodexSessionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	res, err := h.sessions.Create(ctx, req.DefaultModelHint)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, res)
}

func (h *Handler) GetCodexAuthSession(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "codex_auth_session")
	res, err := h.sessions.Get(sessionID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) SubmitCodexRedirect(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "codex_auth_session")
	var req submitRedirectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	if err := h.validate.Struct(&req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	if !strings.HasPrefix(req.RedirectURL, "http://localhost:1455/auth/callback") {
		writeBadRequest(w, "redirectUrl must start with http://localhost:1455/auth/callback")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 95*time.Second)
	defer cancel()
	res, err := h.sessions.SubmitRedirect(ctx, sessionID, req.RedirectURL)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) CancelCodexSession(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "codex_auth_session")
	res, err := h.sessions.Cancel(sessionID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func decodeJSON(r *http.Request, out any) error {
	if r.Body == nil {
		return nil
	}
	defer func() {
		_ = r.Body.Close()
	}()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(out); err != nil {
		if errors.Is(err, context.Canceled) {
			return err
		}
		if err.Error() == "EOF" {
			return nil
		}
		return fmt.Errorf("invalid json: %w", err)
	}
	return nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeBadRequest(w http.ResponseWriter, message string) {
	writeError(w, http.StatusBadRequest, "INVALID_ARGUMENT", message)
}

func writeConflict(w http.ResponseWriter, message string) {
	writeError(w, http.StatusConflict, "FAILED_PRECONDITION", message)
}

func writeNotFound(w http.ResponseWriter, message string) {
	writeError(w, http.StatusNotFound, "NOT_FOUND", message)
}

func writeInternalError(w http.ResponseWriter, err error) {
	writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
}

func writeError(w http.ResponseWriter, code int, status, message string) {
	writeJSON(w, code, APIError{Error: APIErrorBody{
		Code:    code,
		Status:  status,
		Message: message,
	}})
}
