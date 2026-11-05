package postinvestment_test

import (
	"archive/zip"
	"bytes"
	"strings"
	"testing"
)

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
