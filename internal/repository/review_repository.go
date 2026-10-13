package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type ReviewRepository interface {
	Create(ctx context.Context, review *domain.Review) error
	FindByID(ctx context.Context, id uint32) (*domain.Review, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.Review, error)
	FindByCampaignID(ctx context.Context, campaignID uint32,limit,offset int) ([]domain.Review, error)
	Update(ctx context.Context, review *domain.Review) error
	Delete(ctx context.Context, id uint32) error
}

type reviewRepository struct {
	*BaseRepository[domain.Review, uint32]
}

func NewReviewRepository(db *gorm.DB) ReviewRepository {
	return &reviewRepository{BaseRepository: NewBaseRepository[domain.Review, uint32](db)}
}

func (r *reviewRepository) FindByCampaignID(ctx context.Context, campaignID uint32,limit,offset int) ([]domain.Review, error) {
	var reviews []domain.Review
	err := r.DB.WithContext(ctx).
		Preload("User", func(db *gorm.DB) *gorm.DB { return db.Select("id", "name") }).
		Where("campaignid = ?", campaignID).Limit(limit).Offset(offset).Find(&reviews).Error
	return reviews, err
}
