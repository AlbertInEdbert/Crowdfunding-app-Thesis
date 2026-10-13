package repository

import (
	"context"
	"time"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CampaignRepository interface {
	Create(ctx context.Context, campaign *domain.Campaign) error
	FindByID(ctx context.Context, id uint32) (*domain.Campaign, error)
	FindByIDForUpdate(ctx context.Context, id uint32) (*domain.Campaign, error)
	FindByIDWithRelations(ctx context.Context, id uint32, relations ...string) (*domain.Campaign, error)
	FindAll(ctx context.Context, req dto.CampaignFilterRequest) ([]domain.Campaign, int64 ,error)
	FindByCompanyID(ctx context.Context, companyID uint32) ([]domain.Campaign, error)
	FindByStatus(ctx context.Context, status domain.CampaignStatus) ([]domain.Campaign, error)
	Update(ctx context.Context, campaign *domain.Campaign) error
	Delete(ctx context.Context, id uint32) error
	UpdateStatus(ctx context.Context, status domain.CampaignStatus, companyId uint32) error
	WithTx(tx *gorm.DB) CampaignRepository
	SetCampaignDate(ctx context.Context, req dto.CampaignDateRequest, campaignId uint32) error
	CheckCampaignDateAndUpdateStatus(ctx context.Context,status domain.CampaignStatus) error
}

type campaignRepository struct {
	*BaseRepository[domain.Campaign, uint32]
}

func NewCampaignRepository(db *gorm.DB) CampaignRepository {
	return &campaignRepository{BaseRepository: NewBaseRepository[domain.Campaign, uint32](db)}
}

func (r *campaignRepository) WithTx(tx *gorm.DB) CampaignRepository {
	return NewCampaignRepository(tx)
}

func (r *campaignRepository) FindByIDForUpdate(ctx context.Context, id uint32) (*domain.Campaign, error) {
	var campaign domain.Campaign
	if err := r.DB.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&campaign, id).Error; err != nil {
		return nil, translateError(err)
	}
	return &campaign, nil
}

func (r *campaignRepository) FindByIDWithRelations(ctx context.Context, id uint32, relations ...string) (*domain.Campaign, error) {
	var campaign domain.Campaign
	q := r.DB.WithContext(ctx)
	for _, rel := range relations {
		q = q.Preload(rel)
	}
	if err := q.First(&campaign, id).Error; err != nil {
		return nil, translateError(err)
	}
	return &campaign, nil
}

func (r *campaignRepository) FindByCompanyID(ctx context.Context, companyID uint32) ([]domain.Campaign, error) {
	var campaigns []domain.Campaign
	err := r.DB.WithContext(ctx).Where("companyid = ?", companyID).Find(&campaigns).Error
	return campaigns, err
}

func (r *campaignRepository) FindByStatus(ctx context.Context, status domain.CampaignStatus) ([]domain.Campaign, error) {
	var campaigns []domain.Campaign
	err := r.DB.WithContext(ctx).Where("status = ?", status).Find(&campaigns).Error
	return campaigns, err
}

func (r *campaignRepository) UpdateStatus(ctx context.Context, status domain.CampaignStatus, campaignId uint32) error {
	result := r.DB.WithContext(ctx).
		Model(&domain.Campaign{}).
		Where("id = ?", campaignId).
		Update("status", status)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *campaignRepository) FindAll(ctx context.Context, req dto.CampaignFilterRequest) ([]domain.Campaign, int64 ,error) {
    var campaigns []domain.Campaign
    q := r.DB.WithContext(ctx).Model(&domain.Campaign{})

    if req.Status != nil {
        q = q.Where("campaign.status = ?", *req.Status)
    }

    if req.Search != "" {
        q = q.Where("campaign.title ILIKE ?", "%"+req.Search+"%")
    }

	if req.Category != "" {
		q = q.
			Joins("JOIN company ON company.id = campaign.companyid").
			Joins("JOIN category ON category.category_id = company.categoryid").
			Where("category.name ILIKE ?", "%"+req.Category+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

    if req.Limit > 0 {
        q = q.Limit(req.Limit)
    }
    if req.Offset > 0 {
        q = q.Offset(req.Offset)
    }
    return campaigns, total,q.Find(&campaigns).Error
}

func (r *campaignRepository)SetCampaignDate(ctx context.Context, req dto.CampaignDateRequest, campaignId uint32) error{
	
	result := r.DB.WithContext(ctx).
		Model(&domain.Campaign{}).
		Where("id = ?", campaignId).
		Updates(map[string]interface{}{
					"start_date": req.StartDate,
					"end_date":   req.EndDate,
				})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil	
}

func (r *campaignRepository)CheckCampaignDateAndUpdateStatus(ctx context.Context,status domain.CampaignStatus) error{
	result := r.DB.WithContext(ctx).
		Model(&domain.Campaign{}).
		Where("status = ? AND start_date <= ?", "PENDING", time.Now()).
		Update("status", "ACTIVE")

	if result.Error != nil {
		return result.Error
	}	
	
	return nil
}	