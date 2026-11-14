package stores

import "mapp/internal/modules/purchaserequest"

// PurchaseRequestStore is the purchase requests store as the wiring and the seed use it (feature 032).
type PurchaseRequestStore interface {
	purchaserequest.Store
}
