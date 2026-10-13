package dto

type CreateInvestmentRequest struct {
	ShareCount uint32 `json:"share_count" binding:"required,gt=0"`
	PaymentMethod string `json:"payment_method" binding:"required"`
}

type PayInvestmentRequest struct {
	PaymentMethod string `json:"payment_method" binding:"required"`
}
