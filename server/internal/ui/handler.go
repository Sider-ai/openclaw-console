package ui

import (
	"bytes"
	"embed"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"
)

//go:embed all:dist
var embeddedDist embed.FS

var distFS = mustSubFS()

func mustSubFS() fs.FS {
	sub, err := fs.Sub(embeddedDist, "dist")
	if err != nil {
		panic("ui dist not found: " + err.Error())
	}
	return sub
}

func NewHandler() http.Handler {
	fileServer := http.FileServer(http.FS(distFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.NotFound(w, r)
			return
		}

		reqPath := normalizePath(r.URL.Path)
		if reqPath == "" {
			serveEmbeddedFile(w, r, "index.html")
			return
		}

		if isReservedPath(reqPath) {
			http.NotFound(w, r)
			return
		}

		if fileExists(reqPath) {
			serve(fileServer, w, r, "/"+reqPath)
			return
		}

		if !strings.Contains(path.Base(reqPath), ".") {
			routeIndex := path.Join(reqPath, "index.html")
			if fileExists(routeIndex) {
				serveEmbeddedFile(w, r, routeIndex)
				return
			}
			serveEmbeddedFile(w, r, "index.html")
			return
		}

		http.NotFound(w, r)
	})
}

func normalizePath(raw string) string {
	clean := path.Clean("/" + raw)
	clean = strings.TrimPrefix(clean, "/")
	if clean == "." {
		return ""
	}
	return clean
}

func isReservedPath(reqPath string) bool {
	return reqPath == "healthz" ||
		strings.HasPrefix(reqPath, "healthz/") ||
		reqPath == "api" ||
		strings.HasPrefix(reqPath, "api/") ||
		reqPath == "v1" ||
		strings.HasPrefix(reqPath, "v1/")
}

func fileExists(name string) bool {
	info, err := fs.Stat(distFS, name)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func serveEmbeddedFile(w http.ResponseWriter, r *http.Request, name string) {
	content, err := fs.ReadFile(distFS, name)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if contentType := mime.TypeByExtension(path.Ext(name)); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(content))
}

func serve(fileServer http.Handler, w http.ResponseWriter, r *http.Request, targetPath string) {
	req := r.Clone(r.Context())
	clonedURL := *r.URL
	clonedURL.Path = targetPath
	req.URL = &clonedURL
	fileServer.ServeHTTP(w, req)
}
