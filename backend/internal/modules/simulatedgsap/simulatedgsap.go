// Package simulatedgsap is the published contract of the simulatedgsap module: the types, ports and
// constructors that cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package simulatedgsap

import (
	"mapp/internal/modules/simulatedgsap/internal/core"
	"mapp/internal/platform/clock"
)

type (
	BookedOrder          = core.BookedOrder
	Ledger               = core.Ledger
	Numbers              = core.Numbers
	Orders               = core.Orders
	PurchaseOrderHandler = core.PurchaseOrderHandler
	PurchaseRequests     = core.PurchaseRequests
)

func NewOrders(numbers Numbers, ledger Ledger, now clock.Clock) *Orders {
	return core.NewOrders(numbers, ledger, now)
}

func NewPurchaseOrderHandler(prs PurchaseRequests) *PurchaseOrderHandler {
	return core.NewPurchaseOrderHandler(prs)
}
