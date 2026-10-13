package mockpay

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SamuelLazuardy/investment/internal/domain"
)

type Gateway struct{}

func NewGateway() domain.PaymentGateway {
	return &Gateway{}
}

var _ domain.PaymentGateway = (*Gateway)(nil)

func (g *Gateway) Pay(ctx context.Context, investment *domain.InvestmentsH, method string) (string, error) {
	if investment == nil || investment.Amount <= 0 {
		return "", errors.New("payment amount must be greater than zero")
	}
	if method == "" {
		return "", errors.New("payment method is required")
	}
	return fmt.Sprintf("PAY-%d", time.Now().UnixNano()), nil
}
