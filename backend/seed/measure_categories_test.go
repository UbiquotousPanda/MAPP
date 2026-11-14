package seed_test

import (
	"context"
	"testing"

	"mapp/internal/platform/fake"
	"mapp/internal/settings"
	"mapp/internal/settings/settingstest"
)

func categoriesIn(t *testing.T, db *fake.DB) []settings.ActivityCategory {
	t.Helper()
	var list []settings.ActivityCategory
	read(t, db, func(ctx context.Context) error {
		var err error
		list, err = settingstest.NewStore(db).ListActivityCategories(ctx)
		return err
	})
	return list
}
