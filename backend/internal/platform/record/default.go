package record

// OtherDefaults are the items besides keepID marked default: they lose the mark so only one default remains.
func OtherDefaults[T any](items []T, keepID string, idOf func(T) string, isDefault func(T) bool) []T {
	var others []T
	for _, item := range items {
		if isDefault(item) && idOf(item) != keepID {
			others = append(others, item)
		}
	}
	return others
}
