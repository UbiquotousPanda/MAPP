package purchasereporttest

import (
	"fmt"

	"mapp/internal/measure/purchasereport"
)

// Spread is one approved request of one vendor with a line due on each of the dates, 100.00 each.
func Spread(first, last string) []purchasereport.Request {
	r := request(requestSpec{"pr-s", "Spread", "Solo", purchasereport.StatusApproved, PlanWithFinance, Alice().ID},
		line(lineSpec{id: "s1", item: item1, amount: 100, delivery: first}),
		line(lineSpec{id: "s2", item: item2, amount: 100, delivery: last}))
	return []purchasereport.Request{r}
}

// Vendors is n approved requests, each of its own vendor, V01 with 10.00, V02 with 20.00 and so on.
func Vendors(n int) []purchasereport.Request {
	list := make([]purchasereport.Request, 0, n)
	for i := 1; i <= n; i++ {
		spec := requestSpec{fmt.Sprintf("pr-v%02d", i), fmt.Sprintf("Request %02d", i), fmt.Sprintf("V%02d", i),
			purchasereport.StatusApproved, PlanWithFinance, Alice().ID}
		list = append(list, request(spec, line(lineSpec{id: fmt.Sprintf("v%02d", i), item: item1, amount: int64(i) * 10, delivery: march10})))
	}
	return list
}

// Hidden is one Created request in the plan without finance.view: it commits nothing and has no invoices.
func Hidden() []purchasereport.Request {
	spec := requestSpec{"pr-h", "Hidden", acme, purchasereport.StatusCreated, PlanWithoutFinance, Alice().ID}
	return []purchasereport.Request{request(spec, line(lineSpec{id: "h1", item: item6, amount: 200, delivery: march10}))}
}
