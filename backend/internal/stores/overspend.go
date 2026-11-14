package stores

import "mapp/internal/modules/overspend"

// OverspendStore reads every budget with its planned cost and keeps Settings › Overspend control (feature 037).
type OverspendStore interface {
	overspend.Store
}
