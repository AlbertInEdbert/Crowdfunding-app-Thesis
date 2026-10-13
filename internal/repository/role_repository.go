package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type RoleRepository interface {
	Create(ctx context.Context, role *domain.Role) error
	FindByID(ctx context.Context, id uint32) (*domain.Role, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.Role, error)
	FindByName(ctx context.Context, name string) (*domain.Role, error)
	Update(ctx context.Context, role *domain.Role) error
	Delete(ctx context.Context, id uint32) error
}

type roleRepository struct {
	*BaseRepository[domain.Role, uint32]
}

func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{BaseRepository: NewBaseRepository[domain.Role, uint32](db)}
}

func (r *roleRepository) FindByName(ctx context.Context, name string) (*domain.Role, error) {
	var role domain.Role
	if err := r.DB.WithContext(ctx).Where("name = ?", name).First(&role).Error; err != nil {
		return nil, translateError(err)
	}
	return &role, nil
}
