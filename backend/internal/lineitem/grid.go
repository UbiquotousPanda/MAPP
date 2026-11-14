package lineitem

import (
	"slices"
	"strconv"

	"mapp/internal/platform/money"
)

// Grid builds the activity's spread grid in the plan currency: a column per activity month and per custom month,
// sorted and marked when outside the dates, then "No dates yet" when a line item is not spread (D-032); a row
// per line item in creation order; and the column totals.
func Grid(f ActivityFacts, items []View) SpreadGrid {
	months, _ := ActivityMonths(f)
	notSpread := false
	for _, item := range items {
		for _, m := range item.Spread.Months {
			if !slices.Contains(months, m.Month) {
				months = append(months, m.Month)
			}
		}
		notSpread = notSpread || item.Spread.State == StateNotSpread
	}
	slices.Sort(months)

	columns := make([]SpreadGridColumn, 0, len(months)+1)
	for _, m := range months {
		month := m
		columns = append(columns, SpreadGridColumn{Key: m, Month: &month, OutsideActivityDates: OutsideActivityDates(m, f)})
	}
	if notSpread {
		columns = append(columns, SpreadGridColumn{Key: NoDatesColumn})
	}

	grid := SpreadGrid{Columns: columns, Rows: []SpreadGridRow{}, Totals: make([]*money.Money, len(columns))}
	var total money.Amount
	for _, item := range items {
		row := SpreadGridRow{LineItemID: item.ID, Name: item.Name, Cells: make([]*money.Money, len(columns))}
		var rowTotal money.Amount
		put := func(column int, cell money.Money) {
			row.Cells[column] = &cell
			rowTotal = rowTotal.Add(cell.Amount)
			if grid.Totals[column] == nil {
				grid.Totals[column] = &money.Money{Currency: f.planCurrency()}
			}
			grid.Totals[column].Amount = grid.Totals[column].Amount.Add(cell.Amount)
		}
		for _, m := range item.Spread.Months {
			put(slices.Index(months, m.Month), m.AmountPlan)
		}
		if item.Spread.State == StateNotSpread {
			put(len(columns)-1, item.PlannedCostPlan)
		}
		row.Total = money.Money{Amount: rowTotal, Currency: f.planCurrency()}
		total = total.Add(rowTotal)
		grid.Rows = append(grid.Rows, row)
	}
	grid.Total = money.Money{Amount: total, Currency: f.planCurrency()}
	return grid
}

// Quarterly adds up the months of g by calendar quarter, "2026-Q1", in the plan currency it is built in; a
// quarter lies outside the activity's dates when all its months do, and "No dates yet" stays as it is.
func Quarterly(g SpreadGrid) SpreadGrid {
	var columns []SpreadGridColumn
	index := make([]int, len(g.Columns))
	for i, c := range g.Columns {
		key := c.Key
		if c.Month != nil {
			key = quarterOf(*c.Month)
		}
		at := slices.IndexFunc(columns, func(q SpreadGridColumn) bool { return q.Key == key })
		if at < 0 {
			q := SpreadGridColumn{Key: key, OutsideActivityDates: true}
			if c.Month != nil {
				q.Quarter = &key
			}
			columns, at = append(columns, q), len(columns)
		}
		columns[at].OutsideActivityDates = columns[at].OutsideActivityDates && c.OutsideActivityDates
		index[i] = at
	}
	q := SpreadGrid{Columns: orEmpty(columns), Rows: make([]SpreadGridRow, 0, len(g.Rows)), Total: g.Total}
	q.Totals = addUp(g.Totals, index, len(columns))
	for _, row := range g.Rows {
		q.Rows = append(q.Rows, SpreadGridRow{LineItemID: row.LineItemID, Name: row.Name,
			Cells: addUp(row.Cells, index, len(columns)), Total: row.Total})
	}
	return q
}

func addUp(cells []*money.Money, index []int, n int) []*money.Money {
	sums := make([]*money.Money, n)
	for i, cell := range cells {
		if cell == nil {
			continue
		}
		if sums[index[i]] == nil {
			sums[index[i]] = &money.Money{Currency: cell.Currency}
		}
		sums[index[i]].Amount = sums[index[i]].Amount.Add(cell.Amount)
	}
	return sums
}

func quarterOf(month string) string {
	m, _ := strconv.Atoi(month[5:7])
	return month[:4] + "-Q" + strconv.Itoa((m+2)/3)
}
