package usecase

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type UpdatesUsecase interface {
	FindCampaignUpdates(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Updates, error)
	FindCampaignUpdatesByUserId(ctx context.Context, userId uint32, limit, offset int) ([]domain.Updates, error)
	CreateUpdate(ctx context.Context, userID, campaignID uint32, title, content string) (*domain.Updates, error)
	UpdateUpdate(ctx context.Context, userID, id uint32, title, content string) (*domain.Updates, error)
	DeleteUpdate(ctx context.Context, userID, id uint32) error
}

type updatesUsecase struct {
	updatesRepo  repository.UpdatesRepository
	campaignRepo repository.CampaignRepository
	companyRepo  repository.CompanyRepository
}

func NewUpdatesUsecase(updatesRepo repository.UpdatesRepository, campaignRepo repository.CampaignRepository, companyRepo repository.CompanyRepository) UpdatesUsecase {
	return &updatesUsecase{updatesRepo: updatesRepo, campaignRepo: campaignRepo, companyRepo: companyRepo}
}

func (u *updatesUsecase) checkCampaignOwnership(ctx context.Context, userID, campaignID uint32) error {
	campaign, err := u.campaignRepo.FindByID(ctx, campaignID)
	if err != nil {
		return err
	}
	company, err := u.companyRepo.FindByID(ctx, campaign.CompanyID)
	if err != nil {
		return err
	}
	if company.UserID != userID {
		return domain.ErrForbidden
	}
	return nil
}

func (u *updatesUsecase) FindCampaignUpdates(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Updates, error) {
	return u.updatesRepo.FindByCampaignID(ctx, campaignID, limit, offset)
}

func (u *updatesUsecase) FindCampaignUpdatesByUserId(ctx context.Context, userId uint32, limit, offset int) ([]domain.Updates, error) {
	return u.updatesRepo.FindByCampaignID(ctx, userId, limit, offset)
}

func (u *updatesUsecase) CreateUpdate(ctx context.Context, userID, campaignID uint32, title, content string) (*domain.Updates, error) {
	if err := u.checkCampaignOwnership(ctx, userID, campaignID); err != nil {
		return nil, err
	}
	update := domain.Updates{
		CampaignID: campaignID,
		Title:      title,
		Content:    content,
	}
	if err := u.updatesRepo.Create(ctx, &update); err != nil {
		return nil, err
	}
	return &update, nil
}

func (u *updatesUsecase) UpdateUpdate(ctx context.Context, userID, id uint32, title, content string) (*domain.Updates, error) {
	update, err := u.updatesRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := u.checkCampaignOwnership(ctx, userID, update.CampaignID); err != nil {
		return nil, err
	}
	update.Title = title
	update.Content = content
	if err := u.updatesRepo.Update(ctx, update); err != nil {
		return nil, err
	}
	return update, nil
}

func (u *updatesUsecase) DeleteUpdate(ctx context.Context, userID, id uint32) error {
	update, err := u.updatesRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := u.checkCampaignOwnership(ctx, userID, update.CampaignID); err != nil {
		return err
	}
	return u.updatesRepo.Delete(ctx, id)
}
