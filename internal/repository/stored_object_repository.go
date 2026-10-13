package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type CampaignMediaRepository interface {
	Create(ctx context.Context, object *domain.CampaignMedia) error
	FindByID(ctx context.Context, id uint32) (*domain.CampaignMedia, error)
	FindByUserID(ctx context.Context, userID uint32) ([]domain.CampaignMedia, error)
	FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.CampaignMedia, error)
	FindCoversByCampaignIDs(ctx context.Context, campaignIDs []uint32) ([]domain.CampaignMedia, error)
	FindByCompanyID(ctx context.Context, companyID uint32) ([]domain.CampaignMedia, error)
	FindByCategory(ctx context.Context, category string) ([]domain.CampaignMedia, error)
	Update(ctx context.Context, object *domain.CampaignMedia) error
	Delete(ctx context.Context, id uint32) error
}

type campaignMediaRepository struct {
	*BaseRepository[domain.CampaignMedia, uint32]
}

var _ CampaignMediaRepository = (*campaignMediaRepository)(nil)

func NewCampaignMediaRepository(db *gorm.DB) CampaignMediaRepository {
	return &campaignMediaRepository{BaseRepository: NewBaseRepository[domain.CampaignMedia, uint32](db)}
}

func (r *campaignMediaRepository) FindByUserID(ctx context.Context, userID uint32) ([]domain.CampaignMedia, error) {
	var objects []domain.CampaignMedia
	err := r.DB.WithContext(ctx).Where("userid = ?", userID).Find(&objects).Error
	return objects, err
}

func (r *campaignMediaRepository) FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.CampaignMedia, error) {
	var objects []domain.CampaignMedia
	err := r.DB.WithContext(ctx).Where("campaignid = ?", campaignID).Find(&objects).Error
	return objects, err
}

func (r *campaignMediaRepository) FindCoversByCampaignIDs(ctx context.Context, campaignIDs []uint32) ([]domain.CampaignMedia, error) {
	var objects []domain.CampaignMedia
	err := r.DB.WithContext(ctx).
		Where("campaignid IN ? AND media_code = ?", campaignIDs, domain.MediaCodeCover).
		Find(&objects).Error
	return objects, err
}

func (r *campaignMediaRepository) FindByCompanyID(ctx context.Context, companyID uint32) ([]domain.CampaignMedia, error) {
	var objects []domain.CampaignMedia
	err := r.DB.WithContext(ctx).Where("companyid = ?", companyID).Find(&objects).Error
	return objects, err
}

func (r *campaignMediaRepository) FindByCategory(ctx context.Context, category string) ([]domain.CampaignMedia, error) {
	var objects []domain.CampaignMedia
	err := r.DB.WithContext(ctx).Where("category = ?", category).Find(&objects).Error
	return objects, err
}
