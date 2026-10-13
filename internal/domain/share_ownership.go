package domain

import (
	"time"
)

type ShareOwnership struct {
	ID          uint32    `gorm:"primaryKey;column:id;type:integer"`
	TotalShares uint32    `gorm:"column:total_shares;type:integer"`
	UserID      uint32    `gorm:"column:userid;type:integer"`
	CampaignID  uint32    `gorm:"column:campaignid;type:integer"`
	CreatedAt   time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt   time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (ShareOwnership) TableName() string {
	return "share_ownership"
}
