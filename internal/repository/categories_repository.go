package repository

import (
	"context"

	"github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	Create(ctx context.Context, category *domain.Category) error
	FindByID(ctx context.Context, id uint32) (*domain.Category, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.Category, error)
	FindByName(ctx context.Context, name string) (*domain.Category, error)
	Update(ctx context.Context, category *domain.Category) error
	Delete(ctx context.Context, id uint32) error
}

type categoryRepository struct {
	*BaseRepository[domain.Category, uint32]
}

func NewCategoriesRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{BaseRepository: NewBaseRepository[domain.Category, uint32](db)}
}

func (r *categoryRepository) FindByName(ctx context.Context, name string) (*domain.Category, error) {
	var category domain.Category
	if err := r.DB.WithContext(ctx).Where("name = ?", name).First(&category).Error; err != nil {
		return nil, translateError(err)
	}
	return &category, nil
}
