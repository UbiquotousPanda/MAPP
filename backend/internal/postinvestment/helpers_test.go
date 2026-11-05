package postinvestment_test

import (
	"archive/zip"
	"bytes"
	"io"
	"strings"
	"testing"
)

// slidesText is the XML of every slide, for checking what a slide says.
func slidesText(t *testing.T, pptx []byte) string {
	t.Helper()
	r, err := zip.NewReader(bytes.NewReader(pptx), int64(len(pptx)))
	if err != nil {
		t.Fatalf("not a PowerPoint file: %v", err)
	}
	var text strings.Builder
	for _, f := range r.File {
		if !strings.HasPrefix(f.Name, "ppt/slides/slide") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("open %s: %v", f.Name, err)
		}
		body, err := io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			t.Fatalf("read %s: %v", f.Name, err)
		}
		text.Write(body)
	}
	return text.String()
}

func countSlides(t *testing.T, pptx []byte) int {
	t.Helper()
	r, err := zip.NewReader(bytes.NewReader(pptx), int64(len(pptx)))
	if err != nil {
		t.Fatalf("not a PowerPoint file: %v", err)
	}
	n := 0
	for _, f := range r.File {
		if strings.HasPrefix(f.Name, "ppt/slides/slide") && strings.HasSuffix(f.Name, ".xml") {
			n++
		}
	}
	return n
}
