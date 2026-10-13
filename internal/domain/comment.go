package domain

import (
	"time"
)

type Comment struct {
	ID           uint32    `gorm:"primaryKey;column:id;type:integer"`
	CampaignID   uint32    `gorm:"column:campaignid;type:integer"`    
	ParentID 		uint32    `gorm:"column:parentid;type:integer"`
	UserID       uint32 `gorm:"column:userid;type:integer"`
	Content      string `gorm:"column:comment;type:text"`
	Like      int32 `gorm:"column:like;type:integer"`
	CreatedAt    time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt    time.Time `gorm:"column:updated_at;type:timestamp"`

    User   *User    `gorm:"foreignKey:UserID"`
}

func (Comment) TableName() string {
	return "comment"
}

