package attribution

import (
	"cmp"
	"math/big"
	"slices"

	"mapp/internal/platform/money"
)

type Share struct {
	Touch
	Amount money.Amount
}

// Shares gives each step dated on or before the conversion its part, earliest first; a conversion without a
// journey is one share for its own activity, and one whose steps all came later has none.
func Shares(c Conversion, m Model) []Share {
	if !c.Journey {
		return []Share{{Touch: Touch{ActivityID: c.ActivityID, Date: c.Date}, Amount: c.Revenue}}
	}
	steps := sharing(c)
	if len(steps) == 0 {
		return nil
	}
	parts := allocate(c.Revenue.Cents(), weights(m, len(steps)))
	shares := make([]Share, len(steps))
	for i, t := range steps {
		shares[i] = Share{Touch: t, Amount: money.FromCents(parts[i])}
	}
	return shares
}

func sharing(c Conversion) []Touch {
	steps := slices.DeleteFunc(slices.Clone(c.Touches), func(t Touch) bool { return t.Date.After(c.Date) })
	slices.SortFunc(steps, compareTouches)
	return steps
}

// Attribute sums the shares per activity; a journey with no step before its conversion is Unattributed.
func Attribute(c Conversion, m Model) []Credit {
	shares := Shares(c, m)
	if len(shares) == 0 {
		return []Credit{{Amount: c.Revenue}}
	}
	var credits []Credit
	for _, s := range shares {
		at := slices.IndexFunc(credits, func(cr Credit) bool { return cr.ActivityID == s.ActivityID })
		if at < 0 {
			credits, at = append(credits, Credit{ActivityID: s.ActivityID}), len(credits)
		}
		credits[at].Amount = credits[at].Amount.Add(s.Amount)
	}
	if !c.Journey {
		return credits
	}
	return slices.DeleteFunc(credits, func(cr Credit) bool { return cr.Amount.IsZero() && cr.ActivityID != "" })
}

func weights(m Model, n int) []int64 {
	w := make([]int64, n)
	switch {
	case m == FirstTouch:
		w[0] = 1
	case m == LastTouch:
		w[n-1] = 1
	case m == LinearDecay:
		for i := range w {
			w[i] = int64(i + 1)
		}
	case m == UShaped && n > 2:
		for i := range w {
			w[i] = 1
		}
		w[0], w[n-1] = int64(2*(n-2)), int64(2*(n-2))
	default:
		for i := range w {
			w[i] = 1
		}
	}
	return w
}

// allocate splits total cents by the weights, rounding down; the residual goes to the largest weight, the
// latest step on a tie, so nothing is lost or made up.
func allocate(total int64, w []int64) []int64 {
	var sum int64
	for _, x := range w {
		sum += x
	}
	shares := make([]int64, len(w))
	var given int64
	for i, x := range w {
		share := new(big.Int).Mul(big.NewInt(total), big.NewInt(x))
		shares[i] = share.Quo(share, big.NewInt(sum)).Int64()
		given += shares[i]
	}
	largest := 0
	for i, x := range w {
		if cmp.Compare(x, w[largest]) >= 0 {
			largest = i
		}
	}
	shares[largest] += total - given
	return shares
}
