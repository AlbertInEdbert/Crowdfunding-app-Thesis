package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type escrowAccountRepository struct {
	*BaseRepository[domain.EscrowAccount, uint32]
}

func NewEscrowAccountRepository(db *gorm.DB) domain.EscrowAccountRepository {
	return &escrowAccountRepository{BaseRepository: NewBaseRepository[domain.EscrowAccount, uint32](db)}
}

var _ domain.EscrowAccountRepository = (*escrowAccountRepository)(nil)

func (r *escrowAccountRepository) WithTx(tx *gorm.DB) domain.EscrowAccountRepository {
	return NewEscrowAccountRepository(tx)
}

func (r *escrowAccountRepository) FindByCampaignID(ctx context.Context, campaignID uint32) (*domain.EscrowAccount, error) {
	var escrow domain.EscrowAccount
	if err := r.DB.WithContext(ctx).Where("campaignid = ?", campaignID).First(&escrow).Error; err != nil {
		return nil, translateError(err)
	}
	return &escrow, nil
}
