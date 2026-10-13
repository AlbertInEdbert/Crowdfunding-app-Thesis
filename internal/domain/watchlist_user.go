package domain

import (
	"time"
)

type WatchlistUser struct {
	WatchlistID uint32    `gorm:"primaryKey;column:watchlistid;type:integer"`
	UserUserID  uint32    `gorm:"primaryKey;column:useruser_id;type:integer"`
	CreatedAt   time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt   time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (WatchlistUser) TableName() string {
	return "watchlist_user"
}

