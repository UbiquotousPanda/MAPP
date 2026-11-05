package web_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"mapp/internal/platform/logging"
	"mapp/internal/platform/querycount"
)

func TestRespondError_CancelledRequestIsLoggedAsCancelledNot500(t *testing.T) {
	var out bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(logging.New(&out, slog.LevelInfo))
	t.Cleanup(func() { slog.SetDefault(previous) })

	w := serve(t, failWith(fmt.Errorf("begin transaction: %w", context.Canceled)), newRequest(http.MethodGet, testPath, ""))

	if w.Code != 499 {
		t.Errorf("status = %d, want 499", w.Code)
	}
	for line := range strings.Lines(out.String()) {
		var record map[string]any
		if err := json.Unmarshal([]byte(line), &record); err != nil {
			t.Fatalf("log line %q is not JSON: %v", line, err)
		}
		if record["level"] != "INFO" {
			t.Errorf("log record %v is not at level INFO", record)
		}
		if record["msg"] == "request" && record["status"] != float64(499) {
			t.Errorf("request record status = %v, want 499", record["status"])
		}
	}
}

func TestEngine_RequestRecordCountsTheStatementsSent_028_FR009(t *testing.T) {
	var out bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(logging.New(&out, slog.LevelInfo))
	t.Cleanup(func() { slog.SetDefault(previous) })
	threeStatements := func(c *gin.Context) {
		for range 3 {
			querycount.Add(c.Request.Context())
		}
		c.Status(http.StatusNoContent)
	}

	serve(t, threeStatements, newRequest(http.MethodGet, testPath, ""))

	var record map[string]any
	if err := json.Unmarshal(out.Bytes(), &record); err != nil {
		t.Fatalf("log %q is not one JSON record: %v", out.String(), err)
	}
	if record["queries"] != float64(3) {
		t.Errorf("queries = %v, want 3", record["queries"])
	}
}
