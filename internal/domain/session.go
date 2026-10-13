package domain

import (
	"context"
	"errors"
	"time"
)

var (
	ErrSessionNotFound = errors.New("session not found")
	ErrSessionExpired  = errors.New("session expired")
)

type Session struct {
	UserID    uint32
	RoleID uint32
	ExpiresAt time.Time
	CreatedAt time.Time
}

func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

type SessionRepository interface {
	Create(ctx context.Context, session *Session) error
	GetByID(ctx context.Context, id string) (*Session, error)
	Delete(ctx context.Context, id string) error
	Update(ctx context.Context, session *Session) error
}

