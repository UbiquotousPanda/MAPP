package postinvestment

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

var currencyCode = regexp.MustCompile(`^[A-Z]{3}$`)

// applied is stored with the fields in sends, and every problem found in them.
func applied(stored Review, in UpdateInput) (Review, errs.Problems) {
	changed := stored
	var problems errs.Problems
	if in.Version == nil {
		problems.Add(fieldVersion, msgEnterVersion)
	}
	if in.BusinessCase != nil {
		changed.BusinessCase = strings.TrimSpace(*in.BusinessCase)
		if utf8.RuneCountInString(changed.BusinessCase) > maxBusinessCase {
			problems.Add(fieldBusinessCase, msgBusinessCaseLength)
		}
	}
	if in.Remarks != nil {
		changed.Remarks = strings.TrimSpace(*in.Remarks)
		if utf8.RuneCountInString(changed.Remarks) > maxRemarks {
			problems.Add(fieldRemarks, msgRemarksLength)
		}
	}
	changed.Currency = currencyOf(stored, in)
	read := amountReader{currency: changed.Currency, problems: &problems}
	changed.AmountSpent = read.amount(in.AmountSpent, stored.AmountSpent, fieldAmountSpent)
	if changed.AmountSpent != nil && changed.AmountSpent.Sign() < 0 {
		problems.Add(fieldAmountSpent, msgSpentNegative)
	}
	changed.Margin = read.amount(in.Margin, stored.Margin, fieldMargin)
	return changed, problems
}

// currencyOf keeps the review's currency once it holds an amount; until then the first amount sent sets it.
func currencyOf(stored Review, in UpdateInput) string {
	if stored.AmountSpent != nil || stored.Margin != nil {
		return stored.Currency
	}
	for _, raw := range []json.RawMessage{in.AmountSpent, in.Margin} {
		var sent money.Input
		if json.Unmarshal(raw, &sent) == nil && currencyCode.MatchString(sent.Currency) {
			return sent.Currency
		}
	}
	return stored.Currency
}

// amountReader reads sent amounts in the review's currency, adding a problem for each wrong one.
type amountReader struct {
	currency string
	problems *errs.Problems
}

// amount reads one: absent keeps current, null clears it, otherwise it must be in the review's currency.
func (r amountReader) amount(raw json.RawMessage, current *money.Amount, field string) *money.Amount {
	if len(raw) == 0 {
		return current
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil
	}
	var in money.Input
	if err := json.Unmarshal(raw, &in); err != nil {
		r.problems.Add(field, msgEnterAmount)
		return current
	}
	if in.Currency != r.currency {
		r.problems.Add(field, fmt.Sprintf(msgWrongCurrency, r.currency))
		return current
	}
	m, err := money.ParseInput(in)
	switch {
	case errors.Is(err, money.ErrTooManyDecimals):
		r.problems.Add(field, msgTooManyDecimals)
	case err != nil:
		r.problems.Add(field, msgEnterAmount)
	default:
		return &m.Amount
	}
	return current
}

// submitProblems lists everything a review lacks to be submitted, all at once.
func submitProblems(r Review) errs.Problems {
	var problems errs.Problems
	if r.BusinessCase == "" {
		problems.Add(fieldBusinessCase, msgBusinessCaseNeeded)
	}
	if r.AmountSpent == nil || r.AmountSpent.Sign() <= 0 {
		problems.Add(fieldAmountSpent, msgSpentNeeded)
	}
	if r.Margin == nil {
		problems.Add(fieldMargin, msgMarginNeeded)
	}
	return problems
}
