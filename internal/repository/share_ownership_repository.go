package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type ShareOwnershipRepository interface {
	Create(ctx context.Context, ownership *domain.ShareOwnership) error
	FindByID(ctx context.Context, id uint32) (*domain.ShareOwnership, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.ShareOwnership, error)
	FindByUserID(ctx context.Context, userID uint32) ([]domain.ShareOwnership, error)
	FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.ShareOwnership, error)
	FindByUserAndCampaign(ctx context.Context, userID, campaignID uint32) (*domain.ShareOwnership, error)
	Update(ctx context.Context, ownership *domain.ShareOwnership) error
	Delete(ctx context.Context, id uint32) error
	WithTx(tx *gorm.DB) ShareOwnershipRepository
}

type shareOwnershipRepository struct {
	*BaseRepository[domain.ShareOwnership, uint32]
}

func NewShareOwnershipRepository(db *gorm.DB) ShareOwnershipRepository {
	return &shareOwnershipRepository{BaseRepository: NewBaseRepository[domain.ShareOwnership, uint32](db)}
}

func (r *shareOwnershipRepository) WithTx(tx *gorm.DB) ShareOwnershipRepository {
	return NewShareOwnershipRepository(tx)
}

func (r *shareOwnershipRepository) FindByUserID(ctx context.Context, userID uint32) ([]domain.ShareOwnership, error) {
	var ownerships []domain.ShareOwnership
	err := r.DB.WithContext(ctx).Where("userid = ?", userID).Find(&ownerships).Error
	return ownerships, err
}

func (r *shareOwnershipRepository) FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.ShareOwnership, error) {
	var ownerships []domain.ShareOwnership
	err := r.DB.WithContext(ctx).Where("campaignid = ?", campaignID).Find(&ownerships).Error
	return ownerships, err
}

func (r *shareOwnershipRepository) FindByUserAndCampaign(ctx context.Context, userID, campaignID uint32) (*domain.ShareOwnership, error) {
	var ownership domain.ShareOwnership
	err := r.DB.WithContext(ctx).Where("userid = ? AND campaignid = ?", userID, campaignID).First(&ownership).Error
	if err != nil {
		return nil, translateError(err)
	}
	return &ownership, nil
}
