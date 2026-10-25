package repository

import (
	"context"
	"time"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/gorm"
)

type watchlistRepository struct {
	DB *gorm.DB
}

func NewWatchlistRepository(db *gorm.DB) WatchlistRepository {
	return &watchlistRepository{DB: db}
}
type WatchlistRepository interface {
	Create(ctx context.Context, userID, campaignID uint32) error
	DeleteByUserAndCampaign(ctx context.Context, userID, campaignID uint32) error
	FindCampaignIDsByUser(ctx context.Context,req dto.WatchlistFilterRequest,userID uint32) ([]dto.CampaignWatchlist, int64, error)
	FindUserIDsByCampaign(ctx context.Context, campaignID uint32) ([]uint32, error)
	Exists(ctx context.Context, userID, campaignID uint32) (bool, error)
}


func (r *watchlistRepository) findEntry(ctx context.Context, userID, campaignID uint32) (*domain.Watchlist, error) {
	var watchlist domain.Watchlist
	err := r.DB.WithContext(ctx).
		Joins("JOIN watchlist_user ON watchlist_user.watchlistid = watchlist.id").
		Where("watchlist_user.useruser_id = ? AND watchlist.campaignid = ?", userID, campaignID).
		First(&watchlist).Error
	if err != nil {
		return nil, translateError(err)
	}
	return &watchlist, nil
}

func (r *watchlistRepository) Create(ctx context.Context, userID, campaignID uint32) error {
	exists, err := r.Exists(ctx, userID, campaignID)
	if err != nil {
		return err
	}
	if exists {
		return domain.ErrAlreadyExists
	}

	return r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		watchlist := domain.Watchlist{
			CampaignID: campaignID,
			AddedAt:    time.Now(),
		}
		if err := tx.Create(&watchlist).Error; err != nil {
			return err
		}
		entry := domain.WatchlistUser{
			WatchlistID: watchlist.ID,
			UserUserID:  userID,
		}
		return tx.Create(&entry).Error
	})
}

func (r *watchlistRepository) DeleteByUserAndCampaign(ctx context.Context, userID, campaignID uint32) error {
	watchlist, err := r.findEntry(ctx, userID, campaignID)
	if err != nil {
		return err
	}

	return r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("watchlistid = ? AND useruser_id = ?", watchlist.ID, userID).
			Delete(&domain.WatchlistUser{}).Error; err != nil {
			return err
		}
		return tx.Delete(&domain.Watchlist{}, watchlist.ID).Error
	})
}

// func (r *watchlistRepository) FindCampaignIDsByUser(ctx context.Context, userID uint32) ([]uint32, error) {
// 	var campaignIDs []uint32
// 	err := r.DB.WithContext(ctx).
// 		Model(&domain.Watchlist{}).
// 		Joins("JOIN watchlist_user ON watchlist_user.watchlistid = watchlist.id").
// 		Where("watchlist_user.useruser_id = ?", userID).
// 		Order("watchlist.added_at DESC").
// 		Pluck("watchlist.campaignid", &campaignIDs).Error
// 	return campaignIDs, err
// }

func (r *watchlistRepository) FindCampaignIDsByUser(ctx context.Context,req dto.WatchlistFilterRequest,userID uint32) ([]dto.CampaignWatchlist, int64, error) {
	
	q := r.DB.WithContext(ctx).
		Model(&domain.Watchlist{}).
		Joins("JOIN watchlist_user ON watchlist_user.watchlistid = watchlist.id").
		Joins("JOIN campaign ON campaign.id = watchlist.campaignid").
		Joins("JOIN company ON company.id = campaign.companyid").
		Joins("JOIN category ON category.id = company.categoryid").
		Where("watchlist_user.useruser_id = ?", userID)

	if req.Status != nil {
		q = q.Where("campaign.status = ?", *req.Status)
	}

	if req.Search != "" {
		q = q.Where("company.name ILIKE ?", "%"+req.Search+"%")
	}

	var total int64
	if err := q.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	q = q.Select(`
		campaign.id             AS id,
		campaign.title          AS title,
		campaign.valuation      AS valuation,
		campaign.funding_amount AS funding_amount,
		campaign.funding_goal   AS funding_goal,
		campaign.status         AS status,
		campaign.start_date     AS start_date,
		campaign.end_date       AS end_date,
		company.name           AS company_name,
		category.name          AS category_name
	`).Order("watchlist.added_at DESC")

	if req.Limit > 0 {
		q = q.Limit(req.Limit)
	}
	if req.Offset > 0 {
		q = q.Offset(req.Offset)
	}

	var result []dto.CampaignWatchlist
	if err := q.Scan(&result).Error; err != nil {
		return nil, 0, err
	}

	return result, total, nil
}


func (r *watchlistRepository) FindUserIDsByCampaign(ctx context.Context, campaignID uint32) ([]uint32, error) {
	var userIDs []uint32
	err := r.DB.WithContext(ctx).
		Model(&domain.Watchlist{}).
		Joins("JOIN watchlist_user ON watchlist_user.watchlistid = watchlist.id").
		Where("watchlist.campaignid = ?", campaignID).
		Pluck("watchlist_user.useruser_id", &userIDs).Error
	return userIDs, err
}

func (r *watchlistRepository) Exists(ctx context.Context, userID, campaignID uint32) (bool, error) {
	var count int64
	err := r.DB.WithContext(ctx).
		Model(&domain.Watchlist{}).
		Joins("JOIN watchlist_user ON watchlist_user.watchlistid = watchlist.id").
		Where("watchlist_user.useruser_id = ? AND watchlist.campaignid = ?", userID, campaignID).
		Count(&count).Error
	return count > 0, err
}
