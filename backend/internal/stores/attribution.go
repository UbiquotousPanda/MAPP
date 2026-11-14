package stores

import "mapp/internal/measure/attribution"

// AttributionStore keeps the designated model and reads 046's facts for crediting (050) and the deals panel (058).
type AttributionStore interface {
	attribution.Store
	attribution.DealStore
}
