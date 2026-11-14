package history

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"

	"mapp/internal/platform/errs"
)

const (
	versionParam   = "version"
	reloadToDelete = "Reload the page to see the record as it is now, then delete it."
)

// SeenVersion reads the required ?version= of a delete that moves record id to the recycle bin.
func SeenVersion(c *gin.Context, id string) (context.Context, error) {
	version, err := strconv.Atoi(c.Query(versionParam))
	if err != nil || version < 1 {
		return nil, errs.Validation(errs.FieldError{Field: versionParam, Message: reloadToDelete})
	}
	return WithSeenVersion(c.Request.Context(), id, version), nil
}
