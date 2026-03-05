package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Sider-ai/sider-openclaw-console/admin-api/internal/openclaw"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service  *openclaw.Service
	sessions *openclaw.SessionManager
}

func NewHandler(service *openclaw.Service, sessions *openclaw.SessionManager) *Handler {
	return &Handler{service: service, sessions: sessions}
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
	updateMask := strings.TrimSpace(r.URL.Query().Get("update_mask"))
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
		if strings.Contains(err.Error(), "unsupported provider") {
			writeNotFound(w, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ConnectOpenAIAPIKey(w http.ResponseWriter, r *http.Request) {
	var req connectAPIKeyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeBadRequest(w, err.Error())
		return
	}
	providerRes, modelRes, err := h.service.ConnectOpenAIAPIKey(r.Context(), req.APIKey, req.DefaultModel)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, connectAPIKeyResponse{
		Provider:     providerRes,
		ModelSetting: modelRes,
	})
}

func (h *Handler) DisconnectProvider(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	res, err := h.service.DisconnectProvider(r.Context(), providerID)
	if err != nil {
		if strings.Contains(err.Error(), "unsupported provider") {
			writeNotFound(w, err.Error())
			return
		}
		writeInternalError(w, err)
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
		if strings.Contains(err.Error(), "unsupported provider") {
			writeBadRequest(w, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) ListAuthProfiles(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	items, err := h.service.ListAuthProfiles(providerID)
	if err != nil {
		if strings.Contains(err.Error(), "unsupported provider") {
			writeNotFound(w, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, authProfileListResponse{AuthProfiles: items})
}

func (h *Handler) GetAuthProfile(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "provider")
	profileID := chi.URLParam(r, "auth_profile")
	item, err := h.service.GetAuthProfile(providerID, profileID)
	if err != nil {
		if errors.Is(err, openclaw.ErrNotFound) {
			writeNotFound(w, "auth profile not found")
			return
		}
		if strings.Contains(err.Error(), "unsupported provider") {
			writeNotFound(w, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) ListModelCatalogEntries(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeBadRequest(w, "provider is required")
		return
	}
	pageSize := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("page_size")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			writeBadRequest(w, "page_size must be a positive integer")
			return
		}
		pageSize = n
	}
	pageToken := strings.TrimSpace(r.URL.Query().Get("page_token"))

	items, next, err := h.service.ListModelCatalogEntries(r.Context(), provider, pageToken, pageSize)
	if err != nil {
		if strings.Contains(err.Error(), "provider is required") {
			writeBadRequest(w, err.Error())
			return
		}
		if strings.Contains(err.Error(), "page token") {
			writeBadRequest(w, err.Error())
			return
		}
		writeInternalError(w, err)
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
		if errors.Is(err, openclaw.ErrNotFound) {
			writeNotFound(w, "session not found")
			return
		}
		writeInternalError(w, err)
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
	if !strings.HasPrefix(strings.TrimSpace(req.RedirectURL), "http://localhost:1455/auth/callback") {
		writeBadRequest(w, "redirectUrl must start with http://localhost:1455/auth/callback")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 95*time.Second)
	defer cancel()
	res, err := h.sessions.SubmitRedirect(ctx, sessionID, req.RedirectURL)
	if err != nil {
		if errors.Is(err, openclaw.ErrNotFound) {
			writeNotFound(w, "session not found")
			return
		}
		if strings.Contains(err.Error(), "session not ready") {
			writeConflict(w, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) CancelCodexSession(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "codex_auth_session")
	res, err := h.sessions.Cancel(sessionID)
	if err != nil {
		if errors.Is(err, openclaw.ErrNotFound) {
			writeNotFound(w, "session not found")
			return
		}
		writeInternalError(w, err)
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
