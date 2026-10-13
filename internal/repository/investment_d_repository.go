package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type InvestmentDRepository interface {
	Create(ctx context.Context, detail *domain.InvestmentD) error
	FindByID(ctx context.Context, id uint32) (*domain.InvestmentD, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.InvestmentD, error)
	FindByInvestmentsHID(ctx context.Context, investmentsHID uint32) ([]domain.InvestmentD, error)
	Update(ctx context.Context, detail *domain.InvestmentD) error
	Delete(ctx context.Context, id uint32) error
	WithTx(tx *gorm.DB) InvestmentDRepository
}

type investmentDRepository struct {
	*BaseRepository[domain.InvestmentD, uint32]
}

func NewInvestmentDRepository(db *gorm.DB) InvestmentDRepository {
	return &investmentDRepository{BaseRepository: NewBaseRepository[domain.InvestmentD, uint32](db)}
}

func (r *investmentDRepository) WithTx(tx *gorm.DB) InvestmentDRepository {
	return NewInvestmentDRepository(tx)
}

func (r *investmentDRepository) FindByInvestmentsHID(ctx context.Context, investmentsHID uint32) ([]domain.InvestmentD, error) {
	var details []domain.InvestmentD
	err := r.DB.WithContext(ctx).Where("investments_hid = ?", investmentsHID).Find(&details).Error
	return details, err
}
