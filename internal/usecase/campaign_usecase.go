package usecase

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/mail"
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
	CreateCampaign(ctx context.Context, req *dto.CreateCampaignRequest, companyID, userID uint32, files []CampaignFileInput,highlights []dto.CreateHighlightRequest) (*domain.Campaign, error)
	UpdateCampaign(ctx context.Context, campaign *domain.Campaign) error
	UpdateCampaignDetails(ctx context.Context, req *dto.UpdateCampaignRequest, campaignID, userID uint32) (*domain.Campaign, error)
	UpdateCampaignStatus(ctx context.Context, status domain.CampaignStatus, campaignId uint32) error
	DeleteCampaign(ctx context.Context, id uint32) error
	CloseCampaign(ctx context.Context, campaignID uint32) error
	CloseEndedCampaigns(ctx context.Context) (closed int, errs []error)
	NotifyEndingSoonCampaigns(ctx context.Context) (notified int, errs []error)
	StartCampaign(ctx context.Context) error
	SetCampaignDate(ctx context.Context,  req dto.CampaignDateRequest,campaignID uint32) error
	GetCampaignHighlight(ctx context.Context,campaignID uint32) ([]domain.Highlight,error)
}

type campaignUsecase struct {
	db               *gorm.DB
	campaignRepo     repository.CampaignRepository
	highlightRepo    repository.HighlightRepository
	mediaRepo        repository.CampaignMediaRepository
	companyRepo      repository.CompanyRepository
	userRepo         repository.UserRepository
	investmentsHRepo repository.InvestmentsHRepository
	escrowRepo       domain.EscrowAccountRepository
	watchlistRepo    repository.WatchlistRepository
	storageUsecase   StorageUsecase
	emailUsecase     SendEmailUsecase
}

func NewCampaignUsecase(db *gorm.DB, campaignRepo repository.CampaignRepository, highlightRepo repository.HighlightRepository,mediaRepo repository.CampaignMediaRepository, companyRepo repository.CompanyRepository, userRepo repository.UserRepository, investmentsHRepo repository.InvestmentsHRepository, escrowRepo domain.EscrowAccountRepository, watchlistRepo repository.WatchlistRepository, storageUsecase StorageUsecase, emailUsecase SendEmailUsecase) CampaignUsecase {
	return &campaignUsecase{
		db:               db,
		campaignRepo:     campaignRepo,
		highlightRepo: highlightRepo,
		mediaRepo:        mediaRepo,
		companyRepo:      companyRepo,
		userRepo:         userRepo,
		investmentsHRepo: investmentsHRepo,
		escrowRepo:       escrowRepo,
		watchlistRepo:    watchlistRepo,
		storageUsecase:   storageUsecase,
		emailUsecase:     emailUsecase,
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

func (u *campaignUsecase) CreateCampaign(ctx context.Context, req *dto.CreateCampaignRequest, companyID, userID uint32, files []CampaignFileInput, highlights []dto.CreateHighlightRequest) (*domain.Campaign, error) {

	if err := requirePhoneNumber(ctx, u.userRepo, userID); err != nil {
		return nil, err
	}

	campaign := &domain.Campaign{
		Title:         req.Title,
		Description:   req.Description,
		Overview:   req.Overview,
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
		for _, item := range highlights { 
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
	investments, err := u.investmentsHRepo.FindPaidByCampaignID(ctx, campaignID)
	if err != nil {
		log.Printf("campaign %d: paid investments could not be retrieved for closure emails: %v", campaignID, err)
		investments = nil
	}

	var closed *domain.Campaign
	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
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
		closed = campaign
		return nil
	})
	if err != nil {
		return err
	}

	u.sendCampaignClosedEmails(ctx, closed, investments)
	return nil
}

func (u *campaignUsecase) sendCampaignClosedEmails(ctx context.Context, campaign *domain.Campaign, investments []domain.InvestmentsH) {
	funded := campaign.Status == domain.CampaignStatusCompleted

	totals := make(map[uint32]int64)
	order := make([]uint32, 0, len(investments))
	for _, inv := range investments {
		if _, ok := totals[inv.UserID]; !ok {
			order = append(order, inv.UserID)
		}
		totals[inv.UserID] += inv.Amount
	}

	for _, userID := range order {
		user, err := u.userRepo.FindByID(ctx, userID)
		if err != nil {
			log.Printf("campaign %d: investor %d could not be retrieved for closure email: %v", campaign.ID, userID, err)
			continue
		}

		var subject, body string
		if funded {
			subject = "Campaign fully funded: " + campaign.Title
			body = fmt.Sprintf(
				"Hi %s,\n\nGood news — the campaign %q you invested in has reached its funding goal and is now complete.\n\nThank you for your investment!",
				user.Name, campaign.Title,
			)
		} else {
			subject = "Campaign ended: " + campaign.Title
			body = fmt.Sprintf(
				"Hi %s,\n\nThe campaign %q has ended without reaching its funding goal. Your investment of %d will be refunded.\n\nThank you for your support!",
				user.Name, campaign.Title, totals[userID],
			)
		}

		if err := u.emailUsecase.Send(domain.Email{
			To:      []mail.Address{{Name: user.Name, Address: user.Email}},
			Subject: subject,
			Body:    body,
		}); err != nil {
			log.Printf("campaign %d: closure email to %s failed: %v", campaign.ID, user.Email, err)
		}
	}
}

func (u *campaignUsecase) CloseEndedCampaigns(ctx context.Context) (closed int, errs []error) {
	campaigns, err := u.campaignRepo.FindEndedCampaigns(ctx)
	if err != nil {
		return 0, []error{fmt.Errorf("ended campaigns could not be retrieved: %w", err)}
	}

	for i := range campaigns {
		if err := u.CloseCampaign(ctx, campaigns[i].ID); err != nil {
			errs = append(errs, fmt.Errorf("campaign %d: %w", campaigns[i].ID, err))
			continue
		}
		closed++

	}



	return closed, errs
}

func (u *campaignUsecase) NotifyEndingSoonCampaigns(ctx context.Context) (notified int, errs []error) {
	from := time.Now().Add(72 * time.Hour)
	to := from.Add(24 * time.Hour)

	campaigns, err := u.campaignRepo.FindEndingSoonCampaigns(ctx, from, to)
	if err != nil {
		return 0, []error{fmt.Errorf("ending-soon campaigns could not be retrieved: %w", err)}
	}

	for i := range campaigns {
		campaign := &campaigns[i]

		investments, err := u.investmentsHRepo.FindPaidByCampaignID(ctx, campaign.ID)
		if err != nil {
			errs = append(errs, fmt.Errorf("campaign %d: paid investments could not be retrieved: %w", campaign.ID, err))
			continue
		}

		seen := make(map[uint32]bool)
		failed := false
		notify := func(userID uint32, body func(name string) string) {
			if seen[userID] {
				return
			}
			seen[userID] = true

			user, err := u.userRepo.FindByID(ctx, userID)
			if err != nil {
				errs = append(errs, fmt.Errorf("campaign %d: user %d could not be retrieved: %w", campaign.ID, userID, err))
				failed = true
				return
			}

			err = u.emailUsecase.Send(domain.Email{
				To:      []mail.Address{{Name: user.Name, Address: user.Email}},
				Subject: "Only 3 days left: " + campaign.Title,
				Body:    body(user.Name),
			})
			if err != nil {
				errs = append(errs, fmt.Errorf("campaign %d: H-3 email to %s failed: %w", campaign.ID, user.Email, err))
				failed = true
			}
		}

		for _, inv := range investments {
			notify(inv.UserID, func(name string) string {
				return fmt.Sprintf(
					"Hi %s,\n\nThe campaign %q you invested in ends on %s — only 3 days left.\n\nThank you for your support!",
					name, campaign.Title, campaign.EndDate.Format("2006-01-02"),
				)
			})
		}

		watcherIDs, err := u.watchlistRepo.FindUserIDsByCampaign(ctx, campaign.ID)
		if err != nil {
			errs = append(errs, fmt.Errorf("campaign %d: watchlist could not be retrieved: %w", campaign.ID, err))
			failed = true
		} else {
			for _, userID := range watcherIDs {
				notify(userID, func(name string) string {
					return fmt.Sprintf(
						"Hi %s,\n\nThe campaign %q on your watchlist ends on %s — only 3 days left to invest.\n\nDon't miss out!",
						name, campaign.Title, campaign.EndDate.Format("2006-01-02"),
					)
				})
			}
		}

		if failed {
			continue 
		}

		campaign.H3Notified = true
		campaign.UpdatedAt = time.Now()
		if err := u.campaignRepo.Update(ctx, campaign); err != nil {
			errs = append(errs, fmt.Errorf("campaign %d could not be marked as notified: %w", campaign.ID, err))
			continue
		}
		notified++
	}
	return notified, errs
}

func (u *campaignUsecase)SetCampaignDate(ctx context.Context,  req dto.CampaignDateRequest,campaignID uint32) error{
	return u.campaignRepo.SetCampaignDate(ctx, req, campaignID)
}

func (u *campaignUsecase)GetCampaignHighlight(ctx context.Context,campaignID uint32) ([]domain.Highlight,error){
	return u.highlightRepo.FindByCampaignID(ctx, campaignID)
}