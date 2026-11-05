package postinvestment

import (
	"math/big"
	"strings"

	"mapp/internal/platform/money"
)

// ROI is (margin − amount spent) ÷ amount spent in per cent, half away from zero to 2 decimals; nil without a cost.
func ROI(amountSpent, margin *money.Amount) *string {
	if amountSpent == nil || margin == nil || amountSpent.Sign() <= 0 {
		return nil
	}
	gain := big.NewInt(margin.Sub(*amountSpent).Cents())
	hundredths := roundedDiv(gain.Mul(gain, big.NewInt(10000)), big.NewInt(amountSpent.Cents()))
	text := percentText(hundredths)
	return &text
}

// roundedDiv divides num by a positive den, rounding half away from zero.
func roundedDiv(num, den *big.Int) *big.Int {
	q, r := new(big.Int).QuoRem(num, den, new(big.Int))
	if new(big.Int).Mul(new(big.Int).Abs(r), big.NewInt(2)).Cmp(den) >= 0 {
		q.Add(q, big.NewInt(int64(num.Sign())))
	}
	return q
}

func percentText(hundredths *big.Int) string {
	sign := ""
	if hundredths.Sign() < 0 {
		sign = "-"
	}
	digits := new(big.Int).Abs(hundredths).String()
	if len(digits) < 3 {
		digits = strings.Repeat("0", 3-len(digits)) + digits
	}
	return sign + digits[:len(digits)-2] + "." + digits[len(digits)-2:]
}
