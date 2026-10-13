package domain

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

type EscrowStatus string

const (
	EscrowStatusHolding  EscrowStatus = "HOLDING"
	EscrowStatusReleased EscrowStatus = "RELEASED"
	EscrowStatusRefunded EscrowStatus = "REFUNDED"
)

type EscrowAccount struct {
	ID         uint32       `gorm:"primaryKey;column:id;type:integer"`
	CampaignID uint32       `gorm:"column:campaignid;type:integer"`
	Balance    int64        `gorm:"column:balance;type:decimal(19,0)"`
	Currency   string       `gorm:"column:currency;type:varchar(255)"`
	Status     EscrowStatus `gorm:"column:status;type:varchar(255)"`
	CreatedAt  time.Time    `gorm:"column:created_at;type:timestamp"`
	UpdatedAt  time.Time    `gorm:"column:updated_at;type:timestamp"`
}

func (EscrowAccount) TableName() string {
	return "escrow_account"
}

func (e *EscrowAccount) Credit(amount int64) {
	e.Balance += amount
	e.UpdatedAt = time.Now()
}

var ErrInsufficientEscrowBalance = errors.New("escrow balance is insufficient")

func (e *EscrowAccount) Debit(amount int64) error {
	if amount > e.Balance {
		return ErrInsufficientEscrowBalance
	}
	e.Balance -= amount
	e.UpdatedAt = time.Now()
	return nil
}

func (e *EscrowAccount) RefundAll() {
	e.Balance = 0
	e.Status = EscrowStatusRefunded
	e.UpdatedAt = time.Now()
}

func (e *EscrowAccount) Release() {
	e.Status = EscrowStatusReleased
	e.UpdatedAt = time.Now()
}

type EscrowAccountRepository interface {
	Create(ctx context.Context, escrow *EscrowAccount) error
	FindByCampaignID(ctx context.Context, campaignID uint32) (*EscrowAccount, error)
	Update(ctx context.Context, escrow *EscrowAccount) error
	WithTx(tx *gorm.DB) EscrowAccountRepository
}
