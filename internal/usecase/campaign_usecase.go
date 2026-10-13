package usecase

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
	"gorm.io/gorm"
)

type CampaignFileInput struct {
	MediaCode   string 
	Category    string 
	File        io.Reader
	FileName    string
	FileSize    int64
	ContentType string
}

type CampaignUsecase interface {
	FindByID(ctx context.Context, id uint32) (*domain.Campaign, error)
	FindByIDWithRelations(ctx context.Context, id uint32, relations ...string) (*domain.Campaign, error)
	FindAllCampaign(ctx context.Context, req dto.CampaignFilterRequest) ([]domain.Campaign, int64, error)
	FindAllCampaignAndCover(ctx context.Context, req dto.CampaignFilterRequest) ([]dto.CampaignSummary, int64, error)
	FindByCompanyID(ctx context.Context, companyID uint32) ([]domain.Campaign, error)
	FindByStatus(ctx context.Context, status domain.CampaignStatus) ([]domain.Campaign, error)
	CreateCampaign(ctx context.Context, req *dto.CreateCampaignRequest, companyID, userID uint32, files []CampaignFileInput) (*domain.Campaign, error)
	UpdateCampaign(ctx context.Context, campaign *domain.Campaign) error
	UpdateCampaignDetails(ctx context.Context, req *dto.UpdateCampaignRequest, campaignID, userID uint32) (*domain.Campaign, error)
	UpdateCampaignStatus(ctx context.Context, status domain.CampaignStatus, campaignId uint32) error
	DeleteCampaign(ctx context.Context, id uint32) error
	CloseCampaign(ctx context.Context, campaignID uint32) error
	StartCampaign(ctx context.Context) error
	SetCampaignDate(ctx context.Context,  req dto.CampaignDateRequest,campaignID uint32) error
}

type campaignUsecase struct {
	db               *gorm.DB
	campaignRepo     repository.CampaignRepository
	highlightRepo    repository.HighlightRepository
	mediaRepo        repository.CampaignMediaRepository
	companyRepo      repository.CompanyRepository
	investmentsHRepo repository.InvestmentsHRepository
	escrowRepo       domain.EscrowAccountRepository
	storageUsecase   StorageUsecase
}

func NewCampaignUsecase(db *gorm.DB, campaignRepo repository.CampaignRepository, highlightRepo repository.HighlightRepository,mediaRepo repository.CampaignMediaRepository, companyRepo repository.CompanyRepository, investmentsHRepo repository.InvestmentsHRepository, escrowRepo domain.EscrowAccountRepository, storageUsecase StorageUsecase) CampaignUsecase {
	return &campaignUsecase{
		db:               db,
		campaignRepo:     campaignRepo,
		highlightRepo: highlightRepo,
		mediaRepo:        mediaRepo,
		companyRepo:      companyRepo,
		investmentsHRepo: investmentsHRepo,
		escrowRepo:       escrowRepo,
		storageUsecase:   storageUsecase,
	}
}

func (u *campaignUsecase) FindByID(ctx context.Context, id uint32) (*domain.Campaign, error) {
	campaign, err := u.campaignRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("campaign could not be retrieved: %w", err)
	}
	return campaign, nil
}

func (u *campaignUsecase) FindByIDWithRelations(ctx context.Context, id uint32, relations ...string) (*domain.Campaign, error) {
	campaign, err := u.campaignRepo.FindByIDWithRelations(ctx, id, relations...)
	if err != nil {
		return nil, fmt.Errorf("campaign with relations could not be retrieved: %w", err)
	}
	return campaign, nil
}

func (u *campaignUsecase) FindAllCampaign(ctx context.Context, req dto.CampaignFilterRequest) ([]domain.Campaign, int64,error) {
	return u.campaignRepo.FindAll(ctx,req)
}

func (u *campaignUsecase) FindAllCampaignAndCover(ctx context.Context, req dto.CampaignFilterRequest) ([]dto.CampaignSummary, int64, error) {
	campaigns, total, err := u.campaignRepo.FindAll(ctx, req)
	if err != nil {
		return nil, 0, err
	}

	summaries := make([]dto.CampaignSummary, 0, len(campaigns))
	if len(campaigns) == 0 {
		return summaries, total, nil
	}

	ids := make([]uint32, 0, len(campaigns))
	for i := range campaigns {
		ids = append(ids, campaigns[i].ID)
	}

	covers, err := u.mediaRepo.FindCoversByCampaignIDs(ctx, ids)
	if err != nil {
		return nil, 0, fmt.Errorf("campaign covers could not be retrieved: %w", err)
	}

	coverURLs := make(map[uint32]string, len(covers))
	for i := range covers {
		if covers[i].CampaignID == nil {
			continue
		}
		if _, exists := coverURLs[*covers[i].CampaignID]; exists {
			continue
		}
		url, err := u.storageUsecase.GetDownloadURL(ctx, covers[i].ObjectKey)
		if err != nil {
			return nil, 0, fmt.Errorf("download url could not be generated for %q: %w", covers[i].ObjectKey, err)
		}
		coverURLs[*covers[i].CampaignID] = url
	}

	for i := range campaigns {
		c := &campaigns[i]
		summaries = append(summaries, dto.CampaignSummary{
			ID:            c.ID,
			Title:         c.Title,
			Valuation:     c.Valuation,
			FundingAmount: c.FundingAmount,
			FundingGoal:   c.FundingGoal,
			MinInvestment: c.MinInvestment,
			SharePrice:    c.SharePrice,
			Status:        c.Status,
			StartDate:     c.StartDate,
			EndDate:       c.EndDate,
			TotalInvestor: c.TotalInvestor,
			CompanyID:     c.CompanyID,
			CoverURL:      coverURLs[c.ID],
		})
	}

	return summaries, total, nil
}

func (u *campaignUsecase) FindByCompanyID(ctx context.Context, companyID uint32) ([]domain.Campaign, error) {
	return u.campaignRepo.FindByCompanyID(ctx, companyID)
}

func (u *campaignUsecase) FindByStatus(ctx context.Context, status domain.CampaignStatus) ([]domain.Campaign, error) {
	return u.campaignRepo.FindByStatus(ctx, status)
}

func (u *campaignUsecase) CreateCampaign(ctx context.Context, req *dto.CreateCampaignRequest, companyID, userID uint32, files []CampaignFileInput) (*domain.Campaign, error) {
	
	campaign := &domain.Campaign{
		Title:         req.Title,
		Description:   req.Description,
		Valuation:     req.Valuation,
		FundingAmount: 0,
		FundingGoal:   req.FundingGoal,
		MinInvestment: req.MinInvestment,
		SharePrice:    req.SharePrice,
		Status:        "DRAFT",
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		TotalInvestor: 0,
		CompanyID:     companyID,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}



	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		campaignTx := u.campaignRepo.WithTx(tx)
		highlightTx := u.highlightRepo.WithTx(tx)
	
		if err := campaignTx.Create(ctx, campaign); err != nil {
			return fmt.Errorf("campaign could not be created: %w", err)
		}
		for _, item := range req.Highlight { 
			highlight := domain.Highlight{
				CampaignID: campaign.ID,
				SeqNo: item.SeqNo,
				Title: item.Title,
				Description: item.Description,
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
			if err := highlightTx.Create(ctx, &highlight); err != nil {
				return fmt.Errorf("highlight could not be created: %w", err)
			}
			campaign.Highlight = append(campaign.Highlight, highlight)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	for _, f := range files {
		_, err := u.storageUsecase.Upload(ctx, UploadInput{
			UserID:      userID,
			CampaignID:  campaign.ID,
			MediaCode:   f.MediaCode,
			Category:    f.Category,
			File:        f.File,
			FileName:    f.FileName,
			FileSize:    f.FileSize,
			ContentType: f.ContentType,
		})
		if err != nil {
			return nil, fmt.Errorf("campaign created but file %q could not be uploaded: %w", f.FileName, err)
		}
	}

	return campaign, nil
}

func (u *campaignUsecase) UpdateCampaign(ctx context.Context, campaign *domain.Campaign) error {
	return u.campaignRepo.Update(ctx, campaign)
}

func (u *campaignUsecase) UpdateCampaignDetails(ctx context.Context, req *dto.UpdateCampaignRequest, campaignID, userID uint32) (*domain.Campaign, error) {
	campaign, err := u.campaignRepo.FindByID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("campaign could not be retrieved: %w", err)
	}

	company, err := u.companyRepo.FindByID(ctx, campaign.CompanyID)
	if err != nil || company == nil {
		return nil, errors.New("company could not be retrieved")
	}
	if company.UserID != userID {
		return nil, errors.New("campaign does not belong to the current user")
	}

	if campaign.Status != domain.CampaignStatusDraft {
		return nil, fmt.Errorf("only draft campaigns can be edited (current status: %s)", campaign.Status)
	}

	campaign.Title = req.Title
	campaign.Description = req.Description
	campaign.Valuation = req.Valuation
	campaign.FundingGoal = req.FundingGoal
	campaign.MinInvestment = req.MinInvestment
	campaign.SharePrice = req.SharePrice
	campaign.StartDate = req.StartDate
	campaign.EndDate = req.EndDate
	campaign.UpdatedAt = time.Now()

	if err := u.campaignRepo.Update(ctx, campaign); err != nil {
		return nil, fmt.Errorf("campaign could not be updated: %w", err)
	}

	return campaign, nil
}

func (u *campaignUsecase) DeleteCampaign(ctx context.Context, id uint32) error {
	return u.campaignRepo.Delete(ctx, id)
}

func (u *campaignUsecase) UpdateCampaignStatus(ctx context.Context, status domain.CampaignStatus, campaignId uint32) error {
	return u.campaignRepo.UpdateStatus(ctx, status, campaignId)
}

func (u *campaignUsecase) StartCampaign(ctx context.Context) error {
	return u.campaignRepo.CheckCampaignDateAndUpdateStatus(ctx,"ACTIVE")
}

func (u *campaignUsecase) CloseCampaign(ctx context.Context, campaignID uint32) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		campaignTx := u.campaignRepo.WithTx(tx)
		investmentsHTx := u.investmentsHRepo.WithTx(tx)
		escrowTx := u.escrowRepo.WithTx(tx)

		campaign, err := campaignTx.FindByIDForUpdate(ctx, campaignID)
		if err != nil {
			return fmt.Errorf("campaign could not be retrieved: %w", err)
		}
		if campaign.Status != domain.CampaignStatusActive && campaign.Status != domain.CampaignStatusFunded {
			return fmt.Errorf("campaign cannot be closed from status %s", campaign.Status)
		}
		if time.Now().Before(campaign.EndDate) {
			return errors.New("campaign has not ended yet")
		}

		now := time.Now()
		if campaign.IsFullyFunded() {
			escrow, err := escrowTx.FindByCampaignID(ctx, campaign.ID)
			if err != nil && !errors.Is(err, domain.ErrNotFound) {
				return fmt.Errorf("escrow account could not be retrieved: %w", err)
			}
			if escrow != nil {
				escrow.Release()
				if err := escrowTx.Update(ctx, escrow); err != nil {
					return fmt.Errorf("escrow account could not be released: %w", err)
				}
			}
			campaign.Status = domain.CampaignStatusCompleted
		} else {
			paid, err := investmentsHTx.FindPaidByCampaignID(ctx, campaign.ID)
			if err != nil {
				return fmt.Errorf("paid investments could not be retrieved: %w", err)
			}
			for i := range paid {
				paid[i].Status = domain.InvestmentStatusRefunded
				paid[i].UpdatedAt = now
				if err := investmentsHTx.Update(ctx, &paid[i]); err != nil {
					return fmt.Errorf("investment %d could not be refunded: %w", paid[i].ID, err)
				}
			}

			escrow, err := escrowTx.FindByCampaignID(ctx, campaign.ID)
			if err != nil && !errors.Is(err, domain.ErrNotFound) {
				return fmt.Errorf("escrow account could not be retrieved: %w", err)
			}
			if escrow != nil {
				escrow.RefundAll()
				if err := escrowTx.Update(ctx, escrow); err != nil {
					return fmt.Errorf("escrow account could not be refunded: %w", err)
				}
			}
			campaign.Status = domain.CampaignStatusFailed
		}

		campaign.UpdatedAt = now
		if err := campaignTx.Update(ctx, campaign); err != nil {
			return fmt.Errorf("campaign could not be closed: %w", err)
		}
		return nil
	})
}

func (u *campaignUsecase)SetCampaignDate(ctx context.Context,  req dto.CampaignDateRequest,campaignID uint32) error{
	return u.campaignRepo.SetCampaignDate(ctx, req, campaignID)
}