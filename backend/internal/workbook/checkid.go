package workbook

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// A check ID is a random part, so a file can be imported again after an undo, and a digest of the plan and file.
func newCheckID(planID, content string) string {
	return rand.Text() + "." + digestOf(planID, content)
}

func checkFits(checkID, planID, content string) bool {
	_, digest, ok := strings.Cut(checkID, ".")
	return ok && digest == digestOf(planID, content)
}

func digestOf(planID, content string) string {
	sum := sha256.Sum256([]byte(planID + "\x00" + content))
	return hex.EncodeToString(sum[:])
}
