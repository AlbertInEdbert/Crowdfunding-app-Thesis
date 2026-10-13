package domain

import (
	"time"
)

type CompanyStatus string

const (
	CompanyStatusPending   CompanyStatus = "PENDING"
	CompanyStatusRejected  CompanyStatus = "REJECTED"
	CompanyStatusActive    CompanyStatus = "ACTIVE"
	CompanyStatusSuspended CompanyStatus = "SUSPENDED"
)

type Company struct {
	ID          uint32        `gorm:"primaryKey;column:id;type:integer"`
	UserID      uint32        `gorm:"column:userid;type:integer"`
	Name        string        `gorm:"type:varchar(225);not null"`
	Description string        `gorm:"type:varchar(255)"`
	CategoryID  uint32        `gorm:"column:categoryid;type:integer"`
	Status      CompanyStatus `gorm:"column:status;type:varchar(255)"`

	CreatedAt time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt time.Time `gorm:"column:updated_at;type:timestamp"`

	Campaigns     []Campaign      `gorm:"foreignKey:CompanyID"`
	CampaignMedia []CampaignMedia `gorm:"foreignKey:CompanyID"`
}

func (Company) TableName() string {
	return "company"
}
