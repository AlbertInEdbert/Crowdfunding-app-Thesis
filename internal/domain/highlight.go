package domain

import (
	"time"
)

type Highlight struct {
	ID          uint32    `gorm:"primaryKey;column:id;type:integer"`
	CampaignID  uint32    `gorm:"column:campaignid;type:integer"`
	SeqNo       uint32    `gorm:"column:seqno;type:integer"`
	Title       string    `gorm:"column:title;type:text"`
	Description string    `gorm:"column:description;type:text"`
	CreatedAt   time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt   time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (Highlight) TableName() string {
	return "highlight"
}
