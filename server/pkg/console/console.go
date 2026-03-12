// Package console provides the extension interface and bootstrap entry point
// for the OpenClaw Console server.
//
// External consumers (e.g. a private wrapper repo) import this package to
// register Extension implementations and start the server via Bootstrap.
package console

import (
	"context"
	"net/http"
)

// Extension defines a pluggable module that adds API routes, background tasks,
// and a navigation entry to the console UI.
type Extension interface {
	// ID returns a unique identifier for this extension (e.g. "updater").
	ID() string

	// DisplayName returns a human-readable name for sidebar display.
	DisplayName() string

	// Icon returns a Lucide icon name (e.g. "refresh-cw").
	Icon() string

	// BasePath returns the frontend route path (e.g. "/system-updates").
	BasePath() string

	// Handler returns an http.Handler whose routes are mounted
	// at /api/v1/extensions/{ID}/.
	Handler() http.Handler

	// Start launches background tasks. The provided context is cancelled
	// on server shutdown. Must be non-blocking.
	Start(ctx context.Context) error
}

// Config holds configuration for the console server.
type Config struct {
	Addr      string
	AuthToken string
}
