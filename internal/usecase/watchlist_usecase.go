package usecase

import (
	"context"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type WatchlistUsecase interface {
	Add(ctx context.Context, userID, campaignID uint32) error
	Remove(ctx context.Context, userID, campaignID uint32) error
	List(ctx context.Context,req dto.WatchlistFilterRequest, userID uint32) ([]dto.CampaignWatchlist, int64, error)
	IsWatchlisted(ctx context.Context, userID, campaignID uint32) (bool, error)
}

type watchlistUsecase struct {
	watchlistRepo repository.WatchlistRepository
	campaignRepo  repository.CampaignRepository
	categoryRepo  repository.CategoryRepository
	companyRepo  repository.CompanyRepository
}

func NewWatchlistUsecase(watchlistRepo repository.WatchlistRepository, campaignRepo repository.CampaignRepository, 	categoryRepo  repository.CategoryRepository, companyRepo  repository.CompanyRepository) WatchlistUsecase {
	return &watchlistUsecase{watchlistRepo: watchlistRepo, campaignRepo: campaignRepo, categoryRepo: categoryRepo,companyRepo: companyRepo}
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

func (u *watchlistUsecase) List(ctx context.Context,req dto.WatchlistFilterRequest, userID uint32) ([]dto.CampaignWatchlist, int64, error) {
	campaignWatchlists,total, err := u.watchlistRepo.FindCampaignIDsByUser(ctx, req, userID)
	// if err != nil {
	// 	return nil, err
	// }
	// campaignWatchlists := make([]dto.CampaignWatchlist, 0, len(campaignIDs))
	// for _, campaignID := range campaignIDs {
	// 	campaign, err := u.campaignRepo.FindByID(ctx, campaignID)
	// 	if err != nil {
	// 		continue
	// 	}
	// 	company, err := u.companyRepo.FindByID(ctx, campaign.CompanyID)
	// 	if err != nil {
	// 		continue
	// 	}
	// 	category, err := u.categoryRepo.FindByID(ctx, company.CategoryID)
	// 	if err != nil {
	// 		continue
	// 	}

	// 	campaignWatchlist := &dto.CampaignWatchlist {
	// 		ID: campaignID,
	// 		Title: campaign.Title,
	// 		Valuation: campaign.Valuation,
	// 		FundingAmount: campaign.FundingAmount,
	// 		FundingGoal: campaign.FundingGoal,
	// 		Status: campaign.Status,
	// 		StartDate: campaign.StartDate,
	// 		EndDate: campaign.EndDate,
	// 		CompanyName: company.Name,
	// 		CategoryName: category.Name,
	// 	} 
	// 	campaignWatchlists = append(campaignWatchlists, *campaignWatchlist)
	// }
	
	return campaignWatchlists,total,err
}

func (u *watchlistUsecase) IsWatchlisted(ctx context.Context, userID, campaignID uint32) (bool, error) {
	return u.watchlistRepo.Exists(ctx, userID, campaignID)
}
