package repository

// import (
// 	"context"
// 	"encoding/json"
// 	"fmt"
// 	"time"

// 	"github.com/SamuelLazuardy/investment/internal/domain"
// 	"github.com/go-redis/redis/v8"
// )

// const (
// 	sessionKeyPrefix   = "session:"        
// 	userSessionsSetFmt = "session:user:%d" 
// )

// type sessionRepository struct {
// 	client *redis.Client
// }

// func NewSessionRepository(client *redis.Client) *sessionRepository {
// 	return &sessionRepository{client: client}
// }

// func sessionKey(id uint32) string {
//     return fmt.Sprintf("%s%d", sessionKeyPrefix, id)
// }

// func userSessionsKey(userID uint32) string {
// 	return fmt.Sprintf(userSessionsSetFmt, userID)
// }

// func (r *sessionRepository) Save(ctx context.Context, session *domain.Session, ttl time.Duration) error {
// 	payload, err := json.Marshal(session)
// 	if err != nil {
// 		return fmt.Errorf("marshal session: %w", err)
// 	}

// 	pipe := r.client.TxPipeline()
// 	pipe.Set(ctx, sessionKey(session.ID), payload, ttl)
// 	pipe.SAdd(ctx, userSessionsKey(session.UserID), session.ID)
// 	pipe.Expire(ctx, userSessionsKey(session.UserID), ttl)

// 	if _, err := pipe.Exec(ctx); err != nil {
// 		return fmt.Errorf("save session: %w", err)
// 	}
// 	return nil
// }

// func (r *sessionRepository) FindByID(ctx context.Context, id uint32) (*domain.Session, error) {
// 	payload, err := r.client.Get(ctx, sessionKey(id)).Bytes()
// 	if err != nil {
// 		if err == redis.Nil {
// 			return nil, domain.ErrSessionNotFound
// 		}
// 		return nil, fmt.Errorf("get session: %w", err)
// 	}

// 	var session domain.Session
// 	if err := json.Unmarshal(payload, &session); err != nil {
// 		return nil, fmt.Errorf("unmarshal session: %w", err)
// 	}

// 	if session.IsExpired() {
// 		return nil, domain.ErrSessionExpired
// 	}
// 	return &session, nil
// }

// func (r *sessionRepository) Delete(ctx context.Context, id uint32) error {
// 	session, err := r.FindByID(ctx, id)
// 	if err != nil && err != domain.ErrSessionNotFound && err != domain.ErrSessionExpired {
// 		return err
// 	}

// 	pipe := r.client.TxPipeline()
// 	pipe.Del(ctx, sessionKey(id))
// 	if session != nil {
// 		pipe.SRem(ctx, userSessionsKey(session.UserID), id)
// 	}
// 	_, err = pipe.Exec(ctx)
// 	if err != nil {
// 		return fmt.Errorf("delete session: %w", err)
// 	}
// 	return nil
// }


// // func (r *sessionRepository) Refresh(ctx context.Context, id string, ttl time.Duration) error {
// // 	session, err := r.FindByID(ctx, id)
// // 	if err != nil {
// // 		return err
// // 	}
// // 	session.Touch(ttl)
// // 	return r.Save(ctx, session, ttl)
// // }

