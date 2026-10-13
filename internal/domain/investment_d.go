package domain

import (
	"time"
)


type InvestmentD struct {
	ID             uint32    `gorm:"primaryKey;column:id;type:integer"`
	InvestmentsHId uint32    `gorm:"column:investments_hid;type:integer"`
	ShareCount     uint32    `gorm:"column:share_count;type:integer"`
	PricePerUnit   int64     `gorm:"column:price_per_unit;type:integer"`
	Subtotal       int64     `gorm:"column:subtotal;type:integer"`
	CreatedAt      time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt      time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (InvestmentD) TableName() string {
	return "investment_d"
}


