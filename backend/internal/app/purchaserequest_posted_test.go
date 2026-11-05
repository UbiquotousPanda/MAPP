package app

import (
	"context"
	"testing"
	"time"

	"mapp/internal/financials"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/purchaserequest"
	"mapp/internal/stores"
)

type postedTransactions struct {
	stores.FinancialsStore
	list []financials.Transaction
}

func (s postedTransactions) ListTransactions(context.Context) ([]financials.Transaction, error) {
	return s.list, nil
}

func TestFirstPostedOn_032Timeline_ACreditNoteBeforeTheFirstInvoiceIsNotTheInvoicedDate(t *testing.T) {
	t.Parallel()
	ref := purchaserequest.POLineRef{PONumber: "4500", Line: "10"}
	posting := func(kind financials.Type, cents int64, on date.Date) financials.Transaction {
		return financials.Transaction{Fields: financials.Fields{
			Type: kind, PONumber: ref.PONumber, POLineNumber: ref.Line, PostingDate: on,
			Amount: money.FromCents(cents), Currency: "USD",
		}}
	}
	credit, invoice := date.New(2026, time.November, 3), date.New(2026, time.November, 10)
	reversal, payment := date.New(2026, time.November, 12), date.New(2026, time.November, 24)
	x := prInvoices{repo: postedTransactions{list: []financials.Transaction{
		posting(financials.TypeInvoice, -5000, credit),
		posting(financials.TypeInvoice, 20000, invoice),
		posting(financials.TypePayment, -1000, reversal),
		posting(financials.TypePayment, 15000, payment),
	}}}

	posted, err := x.FirstPostedOn(context.Background(), []purchaserequest.POLineRef{ref})
	if err != nil {
		t.Fatalf("FirstPostedOn() error = %v", err)
	}
	got := posted[ref]
	if got.Invoice == nil || *got.Invoice != invoice || got.Payment == nil || *got.Payment != payment {
		t.Errorf("FirstPostedOn() = invoice %v, payment %v, want %v, %v", got.Invoice, got.Payment, invoice, payment)
	}
}
