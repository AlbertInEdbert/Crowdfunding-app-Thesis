package domain

import (
	"time"
)

type Review struct {
	ID         uint32    `gorm:"primaryKey;column:id;type:integer"`
	Comment    string    `gorm:"type:text"`
	UserID     uint32    `gorm:"column:userid;type:integer"`    
	CampaignID uint32    `gorm:"column:campaignid;type:integer"`
	CreatedAt  time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt  time.Time `gorm:"column:updated_at;type:timestamp"`

	User *User `gorm:"foreignKey:UserID"`
}

func (Review) TableName() string {
	return "review"
}
