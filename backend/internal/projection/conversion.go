package projection

import "math/big"

// ConversionRate is actual ÷ previous in per cent, half up to one decimal in whole numbers; ok is false without a previous.
func ConversionRate(actual, previous int64) (float64, bool) {
	if previous <= 0 || actual < 0 {
		return 0, false
	}
	numerator := new(big.Int).Mul(big.NewInt(actual), big.NewInt(2000))
	numerator.Add(numerator, big.NewInt(previous))
	tenths := numerator.Quo(numerator, new(big.Int).Mul(big.NewInt(previous), big.NewInt(2)))
	if !tenths.IsInt64() {
		return 0, false
	}
	return float64(tenths.Int64()) / 10, true
}
