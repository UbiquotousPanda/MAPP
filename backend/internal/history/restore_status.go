package history

// StatusAfterRestore: a Restore brings a record back in its first status (Draft, Created), an Undo as it was.
func StatusAfterRestore[S comparable](rc RestoreContext, status, first S) (S, bool) {
	if rc.Undo || status == first {
		return status, false
	}
	return first, true
}
