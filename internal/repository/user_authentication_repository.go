package repository

import (
	"context"

	"github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type UserAuthenticationRepository interface {
	Create(ctx context.Context, ua *domain.UserAuthentication) error
	FindByProviderIdentity(ctx context.Context, provider, providerUserID string) (*domain.UserAuthentication, error)
}


type userAuthenticationRepository struct {
	*BaseRepository[domain.UserAuthentication, uint32]
}

var _ UserAuthenticationRepository = (*userAuthenticationRepository)(nil)

func NewUserAuthenticationRepository(db *gorm.DB) UserAuthenticationRepository {
	return &userAuthenticationRepository{BaseRepository: NewBaseRepository[domain.UserAuthentication, uint32](db)}
}

func (r *userAuthenticationRepository) FindByProviderIdentity(ctx context.Context, provider, providerUserID string) (*domain.UserAuthentication, error) {
	var ua domain.UserAuthentication
	if err := r.DB.WithContext(ctx).
		Where("provider = ? AND provider_user_id = ?", provider, providerUserID).
		First(&ua).Error; err != nil {
		return nil, translateError(err)
	}
	return &ua, nil
}
