package stores

import "mapp/internal/measure/attribution"

// AttributionStore keeps the designated attribution model and reads 046's facts for crediting (feature 050).
type AttributionStore interface {
	attribution.Store
	attribution.FactStore
}
