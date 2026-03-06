package api

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBasicAuthDisabled(t *testing.T) {
	handler := basicAuth(RouterConfig{})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/providers", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected %d, got %d", http.StatusNoContent, rec.Code)
	}
}

func TestBasicAuthChallengesUnauthorizedRequests(t *testing.T) {
	handler := basicAuth(RouterConfig{
		AuthUsername: "admin",
		AuthPassword: "secret",
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/providers", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, rec.Code)
	}
	if got := rec.Header().Get("WWW-Authenticate"); got != `Basic realm="OpenClaw Console"` {
		t.Fatalf("expected basic auth challenge header, got %q", got)
	}
}

func TestBasicAuthAcceptsValidCredentials(t *testing.T) {
	handler := basicAuth(RouterConfig{
		AuthUsername: "admin",
		AuthPassword: "secret",
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/providers", nil)
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte("admin:secret")))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected %d, got %d", http.StatusAccepted, rec.Code)
	}
}

func TestBasicAuthSkipsHealthzAndOptions(t *testing.T) {
	t.Run("healthz", func(t *testing.T) {
		router := NewRouter(nil, RouterConfig{
			AuthUsername: "admin",
			AuthPassword: "secret",
		})

		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected %d, got %d", http.StatusOK, rec.Code)
		}
	})

	t.Run("options", func(t *testing.T) {
		handler := basicAuth(RouterConfig{
			AuthUsername: "admin",
			AuthPassword: "secret",
		})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		}))

		req := httptest.NewRequest(http.MethodOptions, "/api/v1/providers", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected %d, got %d", http.StatusNoContent, rec.Code)
		}
	})
}
