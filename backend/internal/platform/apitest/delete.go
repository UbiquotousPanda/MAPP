package apitest

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
)

// DeleteSeen deletes the record at path with the version GET path answers now (at the top or in one wrapped
// object), as the web app sends the version it shows; a record the client cannot read is sent with version 1.
func (c *Client) DeleteSeen(tb testing.TB, path string, opts ...RequestOption) *Response {
	tb.Helper()
	recordPath, query, _ := strings.Cut(path, "?")
	version := 1
	if read := c.Do(tb, http.MethodGet, recordPath, nil, SkipValidation()); read.Status == http.StatusOK {
		version = max(version, versionIn(read.Body))
	}
	if query != "" {
		query += "&"
	}
	return c.Do(tb, http.MethodDelete, fmt.Sprintf("%s?%sversion=%d", recordPath, query, version), nil, opts...)
}

func versionIn(body []byte) int {
	var parts map[string]json.RawMessage
	if json.Unmarshal(body, &parts) != nil {
		return 0
	}
	var version int
	if json.Unmarshal(parts["version"], &version) == nil && version > 0 {
		return version
	}
	for _, part := range parts {
		var wrapped struct{ Version int }
		if json.Unmarshal(part, &wrapped) == nil && wrapped.Version > 0 {
			return wrapped.Version
		}
	}
	return 0
}
