package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type HighlightRepository interface {
	Create(ctx context.Context, Highlight *domain.Highlight) error
	FindByID(ctx context.Context, id uint32) (*domain.Highlight, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.Highlight, error)
	FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.Highlight, error)
	Update(ctx context.Context, highlight *domain.Highlight) error
	Delete(ctx context.Context, id uint32) error
	WithTx(tx *gorm.DB) HighlightRepository
}

type highlightRepository struct {
	*BaseRepository[domain.Highlight, uint32]
}

func NewHighlightRepository(db *gorm.DB) HighlightRepository {
	return &highlightRepository{BaseRepository: NewBaseRepository[domain.Highlight, uint32](db)}
}

func (r *highlightRepository) WithTx(tx *gorm.DB) HighlightRepository {
	return NewHighlightRepository(tx)
}

func (r *highlightRepository) FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.Highlight, error) {
	var Highlight []domain.Highlight
	err := r.DB.WithContext(ctx).Where("campaignid = ?", campaignID).Find(&Highlight).Error
	return Highlight, err
}
