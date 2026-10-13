package domain

import (
	"errors"
	"time"
)

type CampaignStatus string

const (
	CampaignStatusDraft       CampaignStatus = "DRAFT"
	CampaignStatusRequestDate CampaignStatus = "REQUESTDATE"
	CampaignStatusPending     CampaignStatus = "PENDING"
	CampaignStatusActive      CampaignStatus = "ACTIVE"
	CampaignStatusFunded      CampaignStatus = "FUNDED"
	CampaignStatusCompleted   CampaignStatus = "COMPLETED"
	CampaignStatusFailed      CampaignStatus = "FAILED"
	CampaignStatusRejected    CampaignStatus = "REJECTED"
)

var (
	ErrCampaignNotActive     = errors.New("campaign is not active")
	ErrBelowMinInvestment    = errors.New("amount is below minimum investment")
	ErrExceedsFundingGoal    = errors.New("amount exceeds remaining funding goal")
	ErrInvalidCampaignStatus = errors.New("campaign status is not exist")
)

type Campaign struct {
	ID            uint32         `gorm:"primaryKey;column:id;type:integer"`
	Title         string         `gorm:"type:varchar(255);not null"`
	Description   string         `gorm:"type:text;not null"`
	Valuation     int64          `gorm:"type:decimal(19,0)"`
	FundingAmount int64          `gorm:"column:funding_amount;type:decimal(19,0)"`
	FundingGoal   int64          `gorm:"column:funding_goal;type:decimal(19,0)"`
	MinInvestment int64          `gorm:"column:min_investment;type:decimal(19,0)"`
	SharePrice    int64          `gorm:"column:share_price;type:decimal(19,0)"`
	Status        CampaignStatus `gorm:"column:status;type:varchar(255)"`
	StartDate     time.Time      `gorm:"column:start_date;type:date"`
	EndDate       time.Time      `gorm:"column:end_date;type:date"`
	TotalInvestor int32          `gorm:"column:total_investor;type:integer"`
	CompanyID     uint32         `gorm:"column:companyid;type:integer"`
	CreatedAt     time.Time      `gorm:"column:create_at;type:timestamp"`
	UpdatedAt     time.Time      `gorm:"column:updated_at;type:timestamp"`

	Reviews       []Review        `gorm:"foreignKey:CampaignID"`
	Comment       []Comment       `gorm:"foreignKey:CampaignID"`
	Highlight     []Highlight     `gorm:"foreignKey:CampaignID"`
	Updates       []Updates       `gorm:"foreignKey:CampaignID"`
	EscrowAccount []EscrowAccount `gorm:"foreignKey:CampaignID"`
	CampaignMedia []CampaignMedia `gorm:"foreignKey:CampaignID"`
}

func (Campaign) TableName() string {
	return "campaign"
}

func (c *Campaign) IsFullyFunded() bool {
	return c.FundingAmount >= c.FundingGoal
}

func (c *Campaign) RemainingGoal() int64 {
	remaining := c.FundingGoal - c.FundingAmount
	if remaining < 0 {
		return 0
	}
	return remaining
}

func (c *Campaign) CanAcceptInvestment(amount int64) error {
	if c.Status != CampaignStatusActive {
		return ErrCampaignNotActive
	}
	if amount < c.MinInvestment {
		return ErrBelowMinInvestment
	}
	if amount > c.RemainingGoal() {
		return ErrExceedsFundingGoal
	}
	return nil
}

func (c *Campaign) ApplyInvestment(amount int64) {
	c.FundingAmount += amount
	c.TotalInvestor++
	if c.IsFullyFunded() {
		c.Status = CampaignStatusFunded
	}
}

func (c *Campaign) ReverseInvestment(amount int64) {
	c.FundingAmount -= amount
	if c.FundingAmount < 0 {
		c.FundingAmount = 0
	}
	if c.TotalInvestor > 0 {
		c.TotalInvestor--
	}
	if c.Status == CampaignStatusFunded {
		c.Status = CampaignStatusActive
	}
}

func ParseCampaignStatus(s string) (CampaignStatus, error) {
	switch CampaignStatus(s) {
	case CampaignStatusDraft, CampaignStatusActive, CampaignStatusFunded, CampaignStatusCompleted, CampaignStatusFailed:
		return CampaignStatus(s), nil
	default:
		return "", ErrInvalidCampaignStatus
	}
}
