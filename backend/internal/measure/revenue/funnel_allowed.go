package revenue

import "slices"

// excludesStage is true when the activity's model is known and does not allow the stage.
func excludesStage(a ActivitySeries, stage string) bool {
	return len(a.AllowedStages) > 0 && !slices.Contains(a.AllowedStages, stage)
}

func allowingStage(series []ActivitySeries, stage string) []ActivitySeries {
	return slices.DeleteFunc(slices.Clone(series), func(a ActivitySeries) bool { return excludesStage(a, stage) })
}

// withoutExcludedStage drops the goal and projection of a stage the model does not allow; counted facts stay.
func withoutExcludedStage(series []ActivitySeries, stage string) []ActivitySeries {
	out := make([]ActivitySeries, 0, len(series))
	for _, a := range series {
		if excludesStage(a, stage) {
			a = notProjecting(a, stage)
		}
		out = append(out, a)
	}
	return out
}

func notProjecting(a ActivitySeries, stage string) ActivitySeries {
	a.Stages = slices.DeleteFunc(slices.Clone(a.Stages), func(s string) bool { return s == stage })
	if stage == StageMQL {
		a.Goal.MQL = nil
	} else {
		a.Goal.INQ = nil
	}
	a.Months = slices.Clone(a.Months)
	for i := range a.Months {
		f := stageFigureOf(&a.Months[i], stage)
		f.Projected, f.Goal = nil, nil
	}
	return a
}

func stageFigureOf(m *Month, stage string) *Figure[int64] {
	if stage == StageMQL {
		return &m.MQL
	}
	return &m.INQ
}
