package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBearerAuthDisabled(t *testing.T) {
	handler := bearerAuth(RouterConfig{})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/providers", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected %d, got %d", http.StatusNoContent, rec.Code)
	}
}

func TestBearerAuthChallengesUnauthorizedRequests(t *testing.T) {
	handler := bearerAuth(RouterConfig{
		AuthToken: "secret-token",
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/providers", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, rec.Code)
	}
	if got := rec.Header().Get("WWW-Authenticate"); got != `Bearer realm="OpenClaw Console"` {
		t.Fatalf("expected bearer auth challenge header, got %q", got)
	}
}

func TestBearerAuthAcceptsValidToken(t *testing.T) {
	handler := bearerAuth(RouterConfig{
		AuthToken: "secret-token",
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/providers", nil)
	req.Header.Set("Authorization", "Bearer secret-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected %d, got %d", http.StatusAccepted, rec.Code)
	}
}

func TestBearerAuthSkipsHealthzAndOptions(t *testing.T) {
	t.Run("healthz", func(t *testing.T) {
		router := NewRouter(NewAPI(nil, nil), RouterConfig{
			AuthToken: "secret-token",
		}, nil, nil)

		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected %d, got %d", http.StatusOK, rec.Code)
		}
	})

	t.Run("options", func(t *testing.T) {
		handler := bearerAuth(RouterConfig{
			AuthToken: "secret-token",
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

	t.Run("ui paths", func(t *testing.T) {
		handler := bearerAuth(RouterConfig{
			AuthToken: "secret-token",
		})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		for _, path := range []string{"/", "/models", "/channels/telegram"} {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("path %s: expected %d, got %d", path, http.StatusOK, rec.Code)
			}
		}
	})
}
