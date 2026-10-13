package domain

import (
	"time"
)

type UserAuthentication struct {
	ID             uint32    `gorm:"primaryKey;column:id;type:integer"`
	Provider       string    `gorm:"type:varchar(255);not null"`
	ProviderUserID string    `gorm:"column:provider_user_id;type:varchar(255);not null"`
	UserID         uint32    `gorm:"column:userid;type:integer"`
	CreatedAt      time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt      time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (UserAuthentication) TableName() string {
	return "user_authentication"
}

