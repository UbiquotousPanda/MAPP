// Package widgetdata is the published contract of the widgetdata module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package widgetdata

import (
	"mapp/internal/modules/widgetdata/internal/core"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

type (
	Cell          = core.Cell
	Data          = core.Data
	DatasetColumn = core.DatasetColumn
	DatasetInfo   = core.DatasetInfo
	DatasetTables = core.DatasetTables
	Deps          = core.Deps
	Field         = core.Field
	FieldKind     = core.FieldKind
	Filter        = core.Filter
	Filters       = core.Filters
	GroupBy       = core.GroupBy
	Handler       = core.Handler
	Measure       = core.Measure
	Number        = core.Number
	Prefilter     = core.Prefilter
	Query         = core.Query
	Request       = core.Request
	Row           = core.Row
	Rows          = core.Rows
	Service       = core.Service
	Sort          = core.Sort
	SourceReader  = core.SourceReader
	Table         = core.Table
	Transactor    = core.Transactor
	Value         = core.Value
)

const (
	KindDate   = core.KindDate
	KindMoney  = core.KindMoney
	KindNumber = core.KindNumber
	KindText   = core.KindText
)

func BuiltInFields(key string) []Field {
	return core.BuiltInFields(key)
}

func DateValue(d *date.Date) Value {
	return core.DateValue(d)
}

func FinanceNote(seen, of int) string {
	return core.FinanceNote(seen, of)
}

func MoneyValue(a *money.Amount) Value {
	return core.MoneyValue(a)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewService(tx Transactor, deps Deps) *Service {
	return core.NewService(tx, deps)
}

func NumberOfUnits(units int64) Number {
	return core.NumberOfUnits(units)
}

func NumberValue(n *Number) Value {
	return core.NumberValue(n)
}

func ParseNumber(s string) (Number, error) {
	return core.ParseNumber(s)
}

func RowOf(fields []Field, values map[string]Value) Row {
	return core.RowOf(fields, values)
}

func TextValue(s string) Value {
	return core.TextValue(s)
}

func TextsValue(texts []string) Value {
	return core.TextsValue(texts)
}

func WholeValue(n int64) Value {
	return core.WholeValue(n)
}

func YesNo(yes bool) Value {
	return core.YesNo(yes)
}
