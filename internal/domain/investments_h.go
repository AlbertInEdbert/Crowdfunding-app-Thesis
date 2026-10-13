package domain

import (
	"errors"
	"time"
)

type InvestmentStatus string
const (
	InvestmentStatusPendingPayment InvestmentStatus = "PENDING"
	InvestmentStatusPaid           InvestmentStatus = "PAID"
	InvestmentStatusCancelled      InvestmentStatus = "CANCELLED"
	InvestmentStatusRefunded       InvestmentStatus = "REFUNDED"
)

var (
	ErrInvestmentNotPending = errors.New("investment is not awaiting payment")
	ErrInvestmentNotOwned   = errors.New("investment does not belong to the user")
	ErrInvestmentNotCancellable = errors.New("investment can no longer be cancelled")
	ErrCancelWindowClosed   = errors.New("investment cannot be cancelled within 3 days of the campaign end date")
)

type InvestmentsH struct {
	ID            uint32           `gorm:"primaryKey;column:id;type:integer"`
	TransactionNo string           `gorm:"column:transaction_no;type:varchar(255)"`
	Amount        int64            `gorm:"type:decimal(19,0)"`
	Status        InvestmentStatus `gorm:"type:varchar(255)"`
	PaymentMethod string           `gorm:"column:payment_method;type:varchar(255)"`
	PaidAt        *time.Time       `gorm:"column:paid_at;type:timestamp"`
	UserID        uint32           `gorm:"column:userid;type:integer"`
	CampaignID    uint32           `gorm:"column:campaignid;type:integer"`
	CreatedAt     time.Time        `gorm:"column:created_at;type:timestamp"`
	UpdatedAt     time.Time        `gorm:"column:updated_at;type:timestamp"`
	Details       []InvestmentD    `gorm:"foreignKey:InvestmentsHId"`
}

func (InvestmentsH) TableName() string {
	return "investments_h"
}
