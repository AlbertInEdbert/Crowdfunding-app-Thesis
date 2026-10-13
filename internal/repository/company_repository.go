package repository

import (
	"context"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type CompanyRepository interface {
	Create(ctx context.Context, company *domain.Company) error
	FindByID(ctx context.Context, id uint32) (*domain.Company, error)
	FindByIDWithCampaigns(ctx context.Context, id uint32) (*domain.Company, error)
	FindAll(ctx context.Context, req dto.CompanyFilterRequest) ([]domain.Company,int64, error)
	FindByUserID(ctx context.Context, userID uint32) (*domain.Company, error)
	Update(ctx context.Context, company *domain.Company) error
	Delete(ctx context.Context, id uint32) error
	FindByName(ctx context.Context, name string) (*domain.Company, error)
	UpdateStatus(ctx context.Context, status domain.CompanyStatus, companyId uint32) error
}

type companyRepository struct {
	*BaseRepository[domain.Company, uint32]
}

func NewCompanyRepository(db *gorm.DB) CompanyRepository {
	return &companyRepository{BaseRepository: NewBaseRepository[domain.Company, uint32](db)}
}

func (r *companyRepository) FindByIDWithCampaigns(ctx context.Context, id uint32) (*domain.Company, error) {
	var company domain.Company
	if err := r.DB.WithContext(ctx).Preload("Campaigns").First(&company, id).Error; err != nil {
		return nil, translateError(err)
	}
	return &company, nil
}

func (r *companyRepository) FindByUserID(ctx context.Context, userID uint32) (*domain.Company, error) {
	var company domain.Company
	if err := r.DB.WithContext(ctx).Where("userid = ?", userID).First(&company).Error; err != nil {
		return nil, translateError(err)
	}
	return &company, nil
}

func (r *companyRepository) FindByName(ctx context.Context, name string) (*domain.Company, error) {
	var company domain.Company
	if err := r.DB.WithContext(ctx).Where("name = ?", name).First(&company).Error; err != nil {
		return nil, translateError(err)
	}
	return &company, nil
}

func (r *companyRepository) UpdateStatus(ctx context.Context, status domain.CompanyStatus, companyId uint32) error {
	result := r.DB.WithContext(ctx).
		Model(&domain.Company{}).
		Where("id = ?", companyId).
		Update("status", status)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *companyRepository) FindAll(ctx context.Context, req dto.CompanyFilterRequest) ([]domain.Company, int64,error) {
    var companies []domain.Company
    q := r.DB.WithContext(ctx).Model(&domain.Company{})

    if req.Status != nil {
        q = q.Where("company.status = ?", *req.Status)
    }

    if req.Search != "" {
        q = q.Where("company.name ILIKE ?", "%"+req.Search+"%")
    }

	if req.Category != "" {
		q = q.
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
    return companies, total,q.Find(&companies).Error
}