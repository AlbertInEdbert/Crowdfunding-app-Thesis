package domain

import (
	"time"
)

type Watchlist struct {
	ID         uint32    `gorm:"primaryKey;column:id;type:integer"`
	AddedAt    time.Time `gorm:"column:added_at;type:timestamp"`
	CampaignID uint32    `gorm:"column:campaignid;type:integer"`
	CreatedAt  time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt  time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (Watchlist) TableName() string {
	return "watchlist"
}


