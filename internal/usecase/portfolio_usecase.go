package usecase

import (
	"context"
	"errors"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type PortfolioUsecase interface {
	GetUserPortfolio(ctx context.Context, userID uint32) ([]dto.PortfolioItem, error)
}

type portfolioUsecase struct {
	investmentsHRepo   repository.InvestmentsHRepository
	shareOwnershipRepo repository.ShareOwnershipRepository
	campaignRepo       repository.CampaignRepository
	companyRepo        repository.CompanyRepository
}

func NewPortfolioUsecase(
	investmentsHRepo repository.InvestmentsHRepository,
	shareOwnershipRepo repository.ShareOwnershipRepository,
	campaignRepo repository.CampaignRepository,
	companyRepo repository.CompanyRepository,
) PortfolioUsecase {
	return &portfolioUsecase{
		investmentsHRepo:   investmentsHRepo,
		shareOwnershipRepo: shareOwnershipRepo,
		campaignRepo:       campaignRepo,
		companyRepo:        companyRepo,
	}
}

func (u *portfolioUsecase) GetUserPortfolio(ctx context.Context, userID uint32) ([]dto.PortfolioItem, error) {
	investments, err := u.investmentsHRepo.FindByUserID(ctx, userID, 1000, 0)
	if err != nil {
		return nil, errors.New("transactions could not be retrieved")
	}

	ownerships, err := u.shareOwnershipRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, errors.New("share ownerships could not be retrieved")
	}
	sharesByCampaign := make(map[uint32]uint32, len(ownerships))
	for _, o := range ownerships {
		sharesByCampaign[o.CampaignID] = o.TotalShares
	}

	itemsByCampaign := make(map[uint32]*dto.PortfolioItem)
	order := make([]uint32, 0)
	for _, inv := range investments {
		item, ok := itemsByCampaign[inv.CampaignID]
		if !ok {
			campaign, err := u.campaignRepo.FindByID(ctx, inv.CampaignID)
			if err != nil {
				continue
			}
			item = &dto.PortfolioItem{
				CampaignID:      inv.CampaignID,
				CampaignTitle:   campaign.Title,
				CampaignStatus:  string(campaign.Status),
				CampaignEndDate: campaign.EndDate,
				CompanyID:       campaign.CompanyID,
				TotalShares:     sharesByCampaign[inv.CampaignID],
				Investments:     []dto.PortfolioInvestment{},
			}
			if company, err := u.companyRepo.FindByID(ctx, campaign.CompanyID); err == nil {
				item.CompanyName = company.Name
			}
			itemsByCampaign[inv.CampaignID] = item
			order = append(order, inv.CampaignID)
		}

		var shareCount uint32
		if len(inv.Details) > 0 {
			shareCount = inv.Details[0].ShareCount
		}
		item.Investments = append(item.Investments, dto.PortfolioInvestment{
			ID:            inv.ID,
			TransactionNo: inv.TransactionNo,
			Amount:        inv.Amount,
			Status:        string(inv.Status),
			ShareCount:    shareCount,
			CreatedAt:     inv.CreatedAt,
		})

		switch inv.Status {
		case domain.InvestmentStatusPaid:
			item.TotalInvested += inv.Amount
		case domain.InvestmentStatusPendingPayment:
			item.PendingAmount += inv.Amount
		}
	}

	items := make([]dto.PortfolioItem, 0, len(order))
	for _, campaignID := range order {
		items = append(items, *itemsByCampaign[campaignID])
	}
	return items, nil
}
