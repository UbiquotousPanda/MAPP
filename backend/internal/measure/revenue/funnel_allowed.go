package revenue

import "slices"

func excludesStage(a ActivitySeries, stage string) bool {
	return len(a.AllowedStages) > 0 && !slices.Contains(a.AllowedStages, stage)
}

// AllowingStage keeps the activities a stage counts; one whose plan's model lacks the stage counts nowhere for it.
func AllowingStage(series []ActivitySeries, stage string) []ActivitySeries {
	return slices.DeleteFunc(slices.Clone(series), func(a ActivitySeries) bool { return excludesStage(a, stage) })
}
