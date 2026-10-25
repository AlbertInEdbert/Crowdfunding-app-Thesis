package repository

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type InvestmentsHRepository interface {
	Create(ctx context.Context, investment *domain.InvestmentsH) error
	FindByID(ctx context.Context, id uint32) (*domain.InvestmentsH, error)
	FindByIDWithDetails(ctx context.Context, id uint32) (*domain.InvestmentsH, error)
	FindAll(ctx context.Context, limit, offset int) ([]domain.InvestmentsH, error)
	FindByUserID(ctx context.Context, userID uint32, limit, offset int) ([]domain.InvestmentsH, error)
	FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error)
	FindPaidByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error)
	// FindPaidOrWatchlistByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error)
	FindByTransactionNo(ctx context.Context, transactionNo string) (*domain.InvestmentsH, error)
	Update(ctx context.Context, investment *domain.InvestmentsH) error
	Delete(ctx context.Context, id uint32) error
	WithTx(tx *gorm.DB) InvestmentsHRepository
	SumByUserId(ctx context.Context,id uint32) (int64,error)
	CountByUserID(ctx context.Context, userID uint32) (int64, error)
}

type investmentsHRepository struct {
	*BaseRepository[domain.InvestmentsH, uint32]
}

func NewInvestmentsHRepository(db *gorm.DB) InvestmentsHRepository {
	return &investmentsHRepository{BaseRepository: NewBaseRepository[domain.InvestmentsH, uint32](db)}
}

func (r *investmentsHRepository) WithTx(tx *gorm.DB) InvestmentsHRepository {
	return NewInvestmentsHRepository(tx)
}

func (r *investmentsHRepository) FindByIDWithDetails(ctx context.Context, id uint32) (*domain.InvestmentsH, error) {
	var investment domain.InvestmentsH
	if err := r.DB.WithContext(ctx).Preload("Details").First(&investment, id).Error; err != nil {
		return nil, translateError(err)
	}
	return &investment, nil
}

func (r *investmentsHRepository) FindByUserID(ctx context.Context, userID uint32, limit, offset int) ([]domain.InvestmentsH, error) {
	var investments []domain.InvestmentsH
	err := r.DB.WithContext(ctx).
		Preload("Details").
		Where("userid = ?", userID).
		Limit(limit).
		Offset(offset).
		Find(&investments).Error
	return investments, err
}

func (r *investmentsHRepository) FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error) {
	var investments []domain.InvestmentsH
	err := r.DB.WithContext(ctx).Where("campaignid = ?", campaignID).Find(&investments).Error
	return investments, err
}

func (r *investmentsHRepository) FindPaidByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error) {
	var investments []domain.InvestmentsH
	err := r.DB.WithContext(ctx).Where("campaignid = ? AND status = ?", campaignID, domain.InvestmentStatusPaid).Find(&investments).Error	
	return investments, err
}

// func (r *investmentsHRepository) FindPaidOrWatchlistByCampaignID(ctx context.Context, campaignID uint32) ([]domain.Campaign, error) {
// 	var campaigns []domain.Campaign
// 	err := r.DB.WithContext(ctx).
// 	Table("campaign a").
// 	Joins("LEFT JOIN watchlist b on b.a = campaign.id").
// 	Joins("JOIN watchlist_user c on c.watchlistid = b.id").
// 	Joins("LEFT JOIN investment_h b on b.a = campaign.id").
// 	Where("(a.id = ? AND a.status = ?)",
// 	 campaignID, domain.InvestmentStatusPaid).Find(&campaigns).Error
// 	return campaigns, err
// }

func (r *investmentsHRepository) FindByTransactionNo(ctx context.Context, transactionNo string) (*domain.InvestmentsH, error) {
	var investment domain.InvestmentsH
	err := r.DB.WithContext(ctx).Where("transaction_no = ?", transactionNo).First(&investment).Error
	if err != nil {
		return nil, translateError(err)
	}
	return &investment, nil
}

func (r *investmentsHRepository) SumByUserId(ctx context.Context, id uint32) (int64, error) {
    var total int64
    err := r.DB.WithContext(ctx).
        Model(&domain.InvestmentsH{}).
        Where("userid = ?", id).
        Select("COALESCE(sum(amount), 0)").
        Scan(&total).Error

    return total, err
}

func (r *investmentsHRepository) CountByUserID(ctx context.Context, userID uint32) (int64, error) {
	var count int64
	err := r.DB.WithContext(ctx).
		Model(&domain.InvestmentsH{}).
		Where("userid = ?", userID).
		Count(&count).Error
	return count, err
}