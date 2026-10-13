package repository

import (
	"context"
	"time"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)


type updatesRepository struct {
	*BaseRepository[domain.Updates, uint32]
}
type UpdatesRepository interface {
	Create(ctx context.Context, update *domain.Updates) error
	FindByID(ctx context.Context, id uint32) (*domain.Updates, error)
	FindByCampaignID(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Updates, error)
	Update(ctx context.Context, update *domain.Updates) error
	Delete(ctx context.Context, id uint32) error
	FindByUserID(ctx context.Context, userId uint32, limit, offset int) ([]domain.Updates, error)
}

func NewUpdatesRepository(db *gorm.DB) UpdatesRepository {
	return &updatesRepository{BaseRepository: NewBaseRepository[domain.Updates, uint32](db)}
}


func (r *updatesRepository) Create(ctx context.Context, update *domain.Updates) error {
	now := time.Now()
	update.CreatedAt = now
	update.UpdateAt = now
	return r.DB.WithContext(ctx).Create(update).Error
}

func (r *updatesRepository) Update(ctx context.Context, update *domain.Updates) error {
	update.UpdateAt = time.Now()
	return r.DB.WithContext(ctx).Save(update).Error
}

func (r *updatesRepository) FindByCampaignID(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Updates, error) {
	var updates []domain.Updates
	err := r.DB.WithContext(ctx).
		Where("campaignid = ?", campaignID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).Find(&updates).Error
	return updates, err
}

func (r *updatesRepository) FindByUserID(ctx context.Context, userId uint32, limit, offset int) ([]domain.Updates, error) {
	var updates []domain.Updates
	err := r.DB.WithContext(ctx).
		Model(&domain.Updates{}).
		Joins("JOIN investment_h ih ON ih.campaignid = updates.campaignid").
		Where("ih.userid = ?", userId).
		Order("updates.created_at DESC").
		Limit(limit).Offset(offset).
		Find(&updates).Error
	return updates, err
}