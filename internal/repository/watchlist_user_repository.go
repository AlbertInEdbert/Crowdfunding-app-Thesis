package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type WatchlistUserRepository interface {
	Create(ctx context.Context, entry *domain.WatchlistUser) error
	FindByKeys(ctx context.Context, watchlistID, userID uint32) (*domain.WatchlistUser, error)
	FindByWatchlistID(ctx context.Context, watchlistID uint32) ([]domain.WatchlistUser, error)
	FindByUserID(ctx context.Context, userID uint32) ([]domain.WatchlistUser, error)
	Delete(ctx context.Context, watchlistID, userID uint32) error
}

type watchlistUserRepository struct {
	DB *gorm.DB
}

func NewWatchlistUserRepository(db *gorm.DB) WatchlistUserRepository {
	return &watchlistUserRepository{DB: db}
}

func (r *watchlistUserRepository) Create(ctx context.Context, entry *domain.WatchlistUser) error {
	return r.DB.WithContext(ctx).Create(entry).Error
}

func (r *watchlistUserRepository) FindByKeys(ctx context.Context, watchlistID, userID uint32) (*domain.WatchlistUser, error) {
	var entry domain.WatchlistUser
	err := r.DB.WithContext(ctx).Where("watchlistid = ? AND useruser_id = ?", watchlistID, userID).First(&entry).Error
	if err != nil {
		return nil, translateError(err)
	}
	return &entry, nil
}

func (r *watchlistUserRepository) FindByWatchlistID(ctx context.Context, watchlistID uint32) ([]domain.WatchlistUser, error) {
	var entries []domain.WatchlistUser
	err := r.DB.WithContext(ctx).Where("watchlistid = ?", watchlistID).Find(&entries).Error
	return entries, err
}

func (r *watchlistUserRepository) FindByUserID(ctx context.Context, userID uint32) ([]domain.WatchlistUser, error) {
	var entries []domain.WatchlistUser
	err := r.DB.WithContext(ctx).Where("useruser_id = ?", userID).Find(&entries).Error
	return entries, err
}

func (r *watchlistUserRepository) Delete(ctx context.Context, watchlistID, userID uint32) error {
	return r.DB.WithContext(ctx).
		Where("watchlistid = ? AND useruser_id = ?", watchlistID, userID).
		Delete(&domain.WatchlistUser{}).Error
}
