package config

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)
func ConnectRedis() (*redis.Client, error) {
	ctx := context.Background()

	rdb := redis.NewClient(&redis.Options{
		Addr:     "impulse-pet-jocund-69613.db.redis.io:14642",
		Username: "default",
		Password: "FccV0MwozcU1ElrCY1xMoGsKJHZHopSw",
		DB:       0,
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	if err := rdb.Set(ctx, "foo", "bar", 0).Err(); err != nil {
		return nil, fmt.Errorf("failed to set key: %w", err)
	}

	result, err := rdb.Get(ctx, "foo").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get key: %w", err)
	}

	fmt.Println(result)
	return rdb, nil
}


