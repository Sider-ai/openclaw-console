package updater

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (u *Updater) handleListComponents(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"components": u.componentStatuses(),
	})
}

func (u *Updater) handleCheckComponents(w http.ResponseWriter, r *http.Request) {
	u.checkAll(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"components": u.componentStatuses(),
	})
}

func (u *Updater) handleUpdateComponent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := u.updateSingle(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"components": u.componentStatuses(),
	})
}

func (u *Updater) handleUpdateAll(w http.ResponseWriter, r *http.Request) {
	u.updateAllComponents(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"components": u.componentStatuses(),
	})
}

func (u *Updater) handleListLogs(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"logs": u.recentLogs(),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"detail": msg})
}
