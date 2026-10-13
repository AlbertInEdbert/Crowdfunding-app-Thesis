package domain

import "context"


type PaymentGateway interface {

	Pay(ctx context.Context, investment *InvestmentsH, method string) (referenceID string, err error)
}
