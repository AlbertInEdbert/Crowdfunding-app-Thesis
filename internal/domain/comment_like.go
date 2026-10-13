package domain

import (
	"time"
)

type CommentLike struct {
	ID           uint32    `gorm:"primaryKey;column:id;type:integer"`
	CommentID uint32    `gorm:"column:commentid;type:integer;uniqueIndex:idx_commentlike_user_comment"`
	UserID       uint32    `gorm:"column:userid;type:integer;uniqueIndex:idx_commentlike_user_comment"`
	CreatedAt    time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt    time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (CommentLike) TableName() string {
	return "commentlike"
}
