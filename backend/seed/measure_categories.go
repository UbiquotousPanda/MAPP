package seed

import (
	"context"

	"mapp/internal/platform/ids"
	"mapp/internal/settings"
)

type measureCategory struct {
	Name    string
	Default bool
	Types   []string
}

// addMeasureCategories groups the demo's activity types into 047's categories (T062); a type left out is
// Uncategorised, so the reports show that bucket too.
func (d *demo) addMeasureCategories(ctx context.Context, list []measureCategory) error {
	for _, c := range list {
		var r resolver
		typeIDs := make([]string, 0, len(c.Types))
		for _, name := range c.Types {
			typeIDs = append(typeIDs, r.id(d.settings.ActivityTypes, "activity type", name))
		}
		if r.err != nil {
			return r.err
		}
		id, err := d.next(ctx, ids.PrefixActivityCategory)
		if err != nil {
			return err
		}
		category := settings.ActivityCategory{ID: id, Name: c.Name, IsDefault: c.Default, Active: true,
			ActivityTypeIDs: typeIDs, Meta: d.meta()}
		if err = d.stores.Settings.PutActivityCategory(ctx, category); err != nil {
			return err
		}
	}
	return nil
}
