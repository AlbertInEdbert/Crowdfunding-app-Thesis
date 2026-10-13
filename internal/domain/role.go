package domain

import (
	"time"
)

type Role struct {
	ID        uint32    `gorm:"primaryKey;column:id;type:integer"`
	Name      string    `gorm:"type:varchar(255);not null"`
	CreatedAt time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (Role) TableName() string {
	return "role"
}

