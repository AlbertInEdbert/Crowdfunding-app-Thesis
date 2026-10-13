package domain

import (
	"time"
)

type Updates struct {
	ID         uint32    `gorm:"primaryKey;column:id;type:integer"`
	CampaignID uint32    `gorm:"column:campaignid;type:integer"`
	Title      string    `gorm:"type:varchar(255)"`
	Content    string    `gorm:"type:text"`
	CreatedAt  time.Time `gorm:"column:created_at;type:timestamp"`
	UpdateAt   time.Time `gorm:"column:update_at;type:timestamp"`
}

func (Updates) TableName() string {
	return "updates"
}


