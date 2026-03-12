package api

import (
	"context"
	"net/http"
)

// ExtensionRoute holds the routing information for a registered extension.
type ExtensionRoute struct {
	ID      string
	Handler http.Handler
}

// ExtensionInfo holds metadata about a registered extension, returned by
// the GET /api/v1/extensions endpoint.
type ExtensionInfo struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Icon        string `json:"icon"`
	BasePath    string `json:"basePath"`
}

type listExtensionsInput struct{}
type listExtensionsOutput struct {
	Body struct {
		Extensions []ExtensionInfo `json:"extensions"`
	}
}

func listExtensionsHandler(
	infos []ExtensionInfo,
) func(context.Context, *listExtensionsInput) (*listExtensionsOutput, error) {
	if infos == nil {
		infos = []ExtensionInfo{}
	}
	return func(_ context.Context, _ *listExtensionsInput) (*listExtensionsOutput, error) {
		out := &listExtensionsOutput{}
		out.Body.Extensions = infos
		return out, nil
	}
}
