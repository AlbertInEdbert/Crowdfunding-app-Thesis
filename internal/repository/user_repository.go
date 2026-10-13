package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	FindByID(ctx context.Context, id uint32) (*domain.User, error)
	FindByIDWithRelations(ctx context.Context, id uint32, relations ...string) (*domain.User, error)
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.User, error)
	Update(ctx context.Context, user *domain.User) error
	Delete(ctx context.Context, id uint32) error
	IncrementTxCounter(ctx context.Context, id uint32) (int64, error)
	WithTx(tx *gorm.DB) UserRepository
}

type userRepository struct {
	*BaseRepository[domain.User, uint32]
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{BaseRepository: NewBaseRepository[domain.User, uint32](db)}
}

func (r *userRepository) WithTx(tx *gorm.DB) UserRepository {
	return NewUserRepository(tx)
}

func (r *userRepository) IncrementTxCounter(ctx context.Context, id uint32) (int64, error) {
	var counter int64

	res := r.DB.WithContext(ctx).Raw(
		`UPDATE "user" SET tx_counter = tx_counter + 1 WHERE id = ? RETURNING tx_counter`, id,
	).Scan(&counter)
	if res.Error != nil {
		return 0, res.Error
	}
	if res.RowsAffected == 0 {
		return 0, domain.ErrNotFound
	}
	return counter, nil
}

func (r *userRepository) FindByIDWithRelations(ctx context.Context, id uint32, relations ...string) (*domain.User, error) {
	var user domain.User
	q := r.DB.WithContext(ctx)
	for _, rel := range relations {
		q = q.Preload(rel)
	}
	if err := q.First(&user, id).Error; err != nil {
		return nil, translateError(err)
	}
	return &user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	if err := r.DB.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		return nil, translateError(err)
	}
	return &user, nil
}
