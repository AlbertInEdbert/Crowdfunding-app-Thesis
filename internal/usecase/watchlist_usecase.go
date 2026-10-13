package usecase

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type WatchlistUsecase interface {
	Add(ctx context.Context, userID, campaignID uint32) error
	Remove(ctx context.Context, userID, campaignID uint32) error
	List(ctx context.Context, userID uint32) ([]domain.Campaign, error)
	IsWatchlisted(ctx context.Context, userID, campaignID uint32) (bool, error)
}

type watchlistUsecase struct {
	watchlistRepo repository.WatchlistRepository
	campaignRepo  repository.CampaignRepository
}

func NewWatchlistUsecase(watchlistRepo repository.WatchlistRepository, campaignRepo repository.CampaignRepository) WatchlistUsecase {
	return &watchlistUsecase{watchlistRepo: watchlistRepo, campaignRepo: campaignRepo}
}

func (u *watchlistUsecase) Add(ctx context.Context, userID, campaignID uint32) error {
	if _, err := u.campaignRepo.FindByID(ctx, campaignID); err != nil {
		return err
	}
	return u.watchlistRepo.Create(ctx, userID, campaignID)
}

func (u *watchlistUsecase) Remove(ctx context.Context, userID, campaignID uint32) error {
	return u.watchlistRepo.DeleteByUserAndCampaign(ctx, userID, campaignID)
}

func (u *watchlistUsecase) List(ctx context.Context, userID uint32) ([]domain.Campaign, error) {
	campaignIDs, err := u.watchlistRepo.FindCampaignIDsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	campaigns := make([]domain.Campaign, 0, len(campaignIDs))
	for _, campaignID := range campaignIDs {
		campaign, err := u.campaignRepo.FindByID(ctx, campaignID)
		if err != nil {
			continue
		}
		campaigns = append(campaigns, *campaign)
	}
	return campaigns, nil
}

func (u *watchlistUsecase) IsWatchlisted(ctx context.Context, userID, campaignID uint32) (bool, error) {
	return u.watchlistRepo.Exists(ctx, userID, campaignID)
}
