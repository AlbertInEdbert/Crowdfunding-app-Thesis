package util

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/redis/go-redis/v9"
)

var ErrUnauthorized = errors.New("unauthorized")

type TokenUtil struct {
	Redis *redis.Client
}

func NewTokenUtil(redisClient *redis.Client) *TokenUtil {
	return &TokenUtil{Redis: redisClient}
}

func generateOpaqueToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (t TokenUtil) CreateToken(ctx context.Context, session *domain.Session) (string, error) {
	ttl := time.Hour * 72 * 30
	session.ExpiresAt = time.Now().Add(ttl)

	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return "", fmt.Errorf("failed to marshal session: %w", err)
	}

	userKey := fmt.Sprintf("session:user:%d", session.UserID)
	existingToken, err := t.Redis.Get(ctx, userKey).Result()

	if err == nil && existingToken != "" {
		redisKey := fmt.Sprintf("session:%s", existingToken)
		if err := t.Redis.Set(ctx, redisKey, sessionJSON, ttl).Err(); err != nil {
			return "", fmt.Errorf("failed to update session in redis: %w", err)
		}
		if err := t.Redis.Expire(ctx, userKey, ttl).Err(); err != nil {
			return "", fmt.Errorf("failed to refresh session expiry in redis: %w", err)
		}
		return existingToken, nil
	}

	if !errors.Is(err, redis.Nil) {
		return "", fmt.Errorf("failed to check session in redis: %w", err)
	}

	token, err := generateOpaqueToken()
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}

	redisKey := fmt.Sprintf("session:%s", token)
	if err := t.Redis.Set(ctx, redisKey, sessionJSON, ttl).Err(); err != nil {
		return "", fmt.Errorf("failed to save session to redis: %w", err)
	}
	if err := t.Redis.Set(ctx, userKey, token, ttl).Err(); err != nil {
		return "", fmt.Errorf("failed to save user session index to redis: %w", err)
	}

	return token, nil
}

func (t TokenUtil) GetSession(ctx context.Context, token string) (*domain.Session, error) {
	if token == "" {
		return nil, ErrUnauthorized
	}

	redisKey := fmt.Sprintf("session:%s", token)
	sessionJSON, err := t.Redis.Get(ctx, redisKey).Result()
	if errors.Is(err, redis.Nil) {
		return nil, ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}

	var session domain.Session
	if err := json.Unmarshal([]byte(sessionJSON), &session); err != nil {
		return nil, ErrUnauthorized
	}
	if session.IsExpired() {
		return nil, ErrUnauthorized
	}
	return &session, nil
}

func (t TokenUtil) DeleteSession(ctx context.Context, token string) error {
	session, err := t.GetSession(ctx, token)
	if err != nil {
		return err
	}

	redisKey := fmt.Sprintf("session:%s", token)
	userKey := fmt.Sprintf("session:user:%d", session.UserID)
	if err := t.Redis.Del(ctx, redisKey, userKey).Err(); err != nil {
		return fmt.Errorf("failed to delete session from redis: %w", err)
	}
	return nil
}
