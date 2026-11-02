package sheet

import (
	"bytes"
	"encoding/csv"
	"errors"
	"io"
	"strings"
	"unicode/utf8"
)

// ReadCSV reads UTF-8 CSV (byte-order mark optional) separated by whichever of comma, semicolon or tab the first
// line holds most of. More than maxRows rows holding text is ErrTooManyRows; text not in UTF-8 is ErrUnreadable.
func ReadCSV(data []byte, maxRows int) (Table, error) {
	data = bytes.TrimPrefix(data, []byte(byteOrderMark))
	if !utf8.Valid(data) || bytes.IndexByte(data, 0) >= 0 {
		return Table{}, ErrUnreadable
	}
	r := csv.NewReader(bytes.NewReader(data))
	r.Comma = DelimiterOf(data)
	r.FieldsPerRecord = -1
	r.LazyQuotes = true
	table := Table{Rows: []Row{}}
	lines := lineCounter{}
	for {
		record, err := r.Read()
		if errors.Is(err, io.EOF) {
			return table, nil
		}
		if err != nil {
			return Table{}, ErrUnreadable
		}
		number := lines.rowOf(r, record)
		cells := make([]string, 0, min(len(record), maxColumns))
		for _, field := range record[:min(len(record), maxColumns)] {
			cells = append(cells, strings.TrimSpace(field))
		}
		if !hasText(cells) {
			continue
		}
		if len(table.Rows) == maxRows {
			return Table{}, ErrTooManyRows
		}
		table.Rows = append(table.Rows, Row{Number: number, Cells: cells})
	}
}

func DelimiterOf(data []byte) rune {
	first, _, _ := bytes.Cut(data, []byte("\n"))
	best, bestCount := ',', bytes.Count(first, []byte(","))
	for _, d := range []rune{';', '\t'} {
		if n := bytes.Count(first, []byte(string(d))); n > bestCount {
			best, bestCount = d, n
		}
	}
	return best
}

// lineCounter numbers records as a spreadsheet numbers rows: the reader skips blank lines, which are rows, while
// a quoted cell over several lines is still one row.
type lineCounter struct {
	extraLines int
}

func (c *lineCounter) rowOf(r *csv.Reader, record []string) int {
	first, _ := r.FieldPos(0)
	lastLine, _ := r.FieldPos(len(record) - 1)
	row := first - c.extraLines
	c.extraLines += lastLine + strings.Count(record[len(record)-1], "\n") - first
	return row
}
