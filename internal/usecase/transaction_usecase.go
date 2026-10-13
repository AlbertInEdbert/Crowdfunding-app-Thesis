package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
	"gorm.io/gorm"
)

type TransactionUsecase interface {
	FindByID(ctx context.Context, id uint32) (*domain.InvestmentsH, error)
	FindByUserID(ctx context.Context, userID uint32, limit, offset int) ([]domain.InvestmentsH, error)
	SumByUserId(ctx context.Context, userID uint32) (int64, error)
	CountByUserID(ctx context.Context, userID uint32) (int64, error)
	FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error)
	CreateInvestment(ctx context.Context, userID uint32, campaignID uint32,req *dto.CreateInvestmentRequest) (*domain.InvestmentsH, error)
	PayInvestment(ctx context.Context, userID, investmentID uint32, method string) (*domain.InvestmentsH, error)
	CancelInvestment(ctx context.Context, userID, investmentID uint32) (*domain.InvestmentsH, error)
}

type transactionUsecase struct {
	db                 *gorm.DB
	investmentsHRepo   repository.InvestmentsHRepository
	investmentDRepo    repository.InvestmentDRepository
	campaignRepo       repository.CampaignRepository
	escrowRepo         domain.EscrowAccountRepository
	shareOwnershipRepo repository.ShareOwnershipRepository
	userRepo           repository.UserRepository
	gateway            domain.PaymentGateway
}

func NewTransactionUsecase(
	db *gorm.DB,
	investmentsHRepo repository.InvestmentsHRepository,
	investmentDRepo repository.InvestmentDRepository,
	campaignRepo repository.CampaignRepository,
	escrowRepo domain.EscrowAccountRepository,
	shareOwnershipRepo repository.ShareOwnershipRepository,
	userRepo repository.UserRepository,
	gateway domain.PaymentGateway,
) TransactionUsecase {
	return &transactionUsecase{
		db:                 db,
		investmentsHRepo:   investmentsHRepo,
		investmentDRepo:    investmentDRepo,
		campaignRepo:       campaignRepo,
		escrowRepo:         escrowRepo,
		shareOwnershipRepo: shareOwnershipRepo,
		userRepo:           userRepo,
		gateway:            gateway,
	}
}

func (u *transactionUsecase) FindByID(ctx context.Context, id uint32) (*domain.InvestmentsH, error) {
	transaction, err := u.investmentsHRepo.FindByIDWithDetails(ctx, id)
	if err != nil {
		return nil, errors.New("transaction could not be retrieved")
	}
	return transaction, nil
}

func (u *transactionUsecase) FindByUserID(ctx context.Context, userID uint32, limit, offset int) ([]domain.InvestmentsH, error) {
	transactions, err := u.investmentsHRepo.FindByUserID(ctx, userID,limit,offset)
	if err != nil {
		return nil, errors.New("transactions could not be retrieved")
	}
	return transactions, nil
}

func (u *transactionUsecase) SumByUserId(ctx context.Context, userID uint32) (int64, error) {
	count, err := u.investmentsHRepo.SumByUserId(ctx, userID)
	if err != nil {
		return 0, errors.New("transactions could not be counted")
	}
	return count, nil
}

func (u *transactionUsecase) CountByUserID(ctx context.Context, userID uint32) (int64, error) {
	count, err := u.investmentsHRepo.CountByUserID(ctx, userID)
	if err != nil {
		return 0, errors.New("transactions could not be counted")
	}
	return count, nil
}

func (u *transactionUsecase) FindByCampaignID(ctx context.Context, campaignID uint32) ([]domain.InvestmentsH, error) {
	transactions, err := u.investmentsHRepo.FindByCampaignID(ctx, campaignID)
	if err != nil {
		return nil, errors.New("transactions could not be retrieved")
	}
	return transactions, nil
}

func (u *transactionUsecase) CreateInvestment(ctx context.Context, userID uint32, campaignID uint32,req *dto.CreateInvestmentRequest) (*domain.InvestmentsH, error) {
	campaign, err := u.campaignRepo.FindByID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("campaign could not be retrieved: %w", err)
	}

	amount := int64(req.ShareCount) * campaign.SharePrice

	if err := campaign.CanAcceptInvestment(amount); err != nil {
		return nil, err
	}

	now := time.Now()
	header := &domain.InvestmentsH{
		Amount:     amount,
		Status:     domain.InvestmentStatusPendingPayment,
		UserID:     userID,
		CampaignID: campaignID,
		PaymentMethod: req.PaymentMethod,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		investmentsHTx := u.investmentsHRepo.WithTx(tx)
		investmentDTx := u.investmentDRepo.WithTx(tx)
		userTx := u.userRepo.WithTx(tx)

		seq, err := userTx.IncrementTxCounter(ctx, userID)
		if err != nil {
			return fmt.Errorf("transaction counter could not be incremented: %w", err)
		}
		header.TransactionNo = fmt.Sprintf("INV-%d-%04d", userID, seq)

		if err := investmentsHTx.Create(ctx, header); err != nil {
			return fmt.Errorf("transaction could not be created: %w", err)
		}

		detail := domain.InvestmentD{
			InvestmentsHId: header.ID,
			ShareCount:     req.ShareCount,
			PricePerUnit:   campaign.SharePrice,
			Subtotal:       amount,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := investmentDTx.Create(ctx, &detail); err != nil {
			return fmt.Errorf("transaction detail could not be created: %w", err)
		}
		header.Details = append(header.Details, detail)
		return nil
	})
	if err != nil {
		return nil, err
	}

	return header, nil
}

func (u *transactionUsecase) PayInvestment(ctx context.Context, userID, investmentID uint32, method string) (*domain.InvestmentsH, error) {
	investment, err := u.investmentsHRepo.FindByIDWithDetails(ctx, investmentID)
	if err != nil {
		return nil, fmt.Errorf("transaction could not be retrieved: %w", err)
	}
	if investment.UserID != userID {
		return nil, domain.ErrInvestmentNotOwned
	}
	if investment.Status != domain.InvestmentStatusPendingPayment {
		return nil, domain.ErrInvestmentNotPending
	}
	if len(investment.Details) == 0 {
		return nil, errors.New("transaction has no details")
	}
	shareCount := investment.Details[0].ShareCount

	if _, err := u.gateway.Pay(ctx, investment, method); err != nil {
		return nil, fmt.Errorf("payment failed: %w", err)
	}

	now := time.Now()
	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		campaignTx := u.campaignRepo.WithTx(tx)
		escrowTx := u.escrowRepo.WithTx(tx)
		shareTx := u.shareOwnershipRepo.WithTx(tx)
		investmentsHTx := u.investmentsHRepo.WithTx(tx)

		campaign, err := campaignTx.FindByIDForUpdate(ctx, investment.CampaignID)
		if err != nil {
			return fmt.Errorf("campaign could not be retrieved: %w", err)
		}
		if err := campaign.CanAcceptInvestment(investment.Amount); err != nil {
			return err
		}

		campaign.ApplyInvestment(investment.Amount)
		campaign.UpdatedAt = now
		if err := campaignTx.Update(ctx, campaign); err != nil {
			return fmt.Errorf("campaign funding could not be updated: %w", err)
		}

		escrow, err := escrowTx.FindByCampaignID(ctx, campaign.ID)
		if err != nil {
			if !errors.Is(err, domain.ErrNotFound) {
				return fmt.Errorf("escrow account could not be retrieved: %w", err)
			}
			escrow = &domain.EscrowAccount{
				CampaignID: campaign.ID,
				Balance:    0,
				Currency:   "IDR",
				Status:     domain.EscrowStatusHolding,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			if err := escrowTx.Create(ctx, escrow); err != nil {
				return fmt.Errorf("escrow account could not be created: %w", err)
			}
		}
		escrow.Credit(investment.Amount)
		if err := escrowTx.Update(ctx, escrow); err != nil {
			return fmt.Errorf("escrow balance could not be updated: %w", err)
		}

		ownership, err := shareTx.FindByUserAndCampaign(ctx, userID, campaign.ID)
		if err != nil {
			if !errors.Is(err, domain.ErrNotFound) {
				return fmt.Errorf("share ownership could not be retrieved: %w", err)
			}
			ownership = &domain.ShareOwnership{
				TotalShares: shareCount,
				UserID:      userID,
				CampaignID:  campaign.ID,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			if err := shareTx.Create(ctx, ownership); err != nil {
				return fmt.Errorf("share ownership could not be created: %w", err)
			}
		} else {
			ownership.TotalShares += shareCount
			ownership.UpdatedAt = now
			if err := shareTx.Update(ctx, ownership); err != nil {
				return fmt.Errorf("share ownership could not be updated: %w", err)
			}
		}

		investment.Status = domain.InvestmentStatusPaid
		investment.PaymentMethod = method
		investment.PaidAt = &now
		investment.UpdatedAt = now
		if err := investmentsHTx.Update(ctx, investment); err != nil {
			return fmt.Errorf("transaction status could not be updated: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return investment, nil
}

func (u *transactionUsecase) CancelInvestment(ctx context.Context, userID, investmentID uint32) (*domain.InvestmentsH, error) {
	investment, err := u.investmentsHRepo.FindByIDWithDetails(ctx, investmentID)
	if err != nil {
		return nil, fmt.Errorf("transaction could not be retrieved: %w", err)
	}
	if investment.UserID != userID {
		return nil, domain.ErrInvestmentNotOwned
	}
	if investment.Status != domain.InvestmentStatusPendingPayment && investment.Status != domain.InvestmentStatusPaid {
		return nil, domain.ErrInvestmentNotCancellable
	}

	now := time.Now()
	err = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		campaignTx := u.campaignRepo.WithTx(tx)
		escrowTx := u.escrowRepo.WithTx(tx)
		shareTx := u.shareOwnershipRepo.WithTx(tx)
		investmentsHTx := u.investmentsHRepo.WithTx(tx)

		campaign, err := campaignTx.FindByIDForUpdate(ctx, investment.CampaignID)
		if err != nil {
			return fmt.Errorf("campaign could not be retrieved: %w", err)
		}

		loc, err := time.LoadLocation("Asia/Jakarta")
		if err != nil {
			return fmt.Errorf("time zone could not be loaded: %w", err)
		}
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
		endDay := time.Date(campaign.EndDate.Year(), campaign.EndDate.Month(), campaign.EndDate.Day(), 0, 0, 0, 0, loc)
		if !today.Before(endDay.AddDate(0, 0, -3)) {
			return domain.ErrCancelWindowClosed
		}

		if investment.Status == domain.InvestmentStatusPaid {
			campaign.ReverseInvestment(investment.Amount)
			campaign.UpdatedAt = now
			if err := campaignTx.Update(ctx, campaign); err != nil {
				return fmt.Errorf("campaign funding could not be reversed: %w", err)
			}

			escrow, err := escrowTx.FindByCampaignID(ctx, campaign.ID)
			if err != nil {
				return fmt.Errorf("escrow account could not be retrieved: %w", err)
			}
			if err := escrow.Debit(investment.Amount); err != nil {
				return err
			}
			if err := escrowTx.Update(ctx, escrow); err != nil {
				return fmt.Errorf("escrow balance could not be updated: %w", err)
			}

			if len(investment.Details) > 0 {
				shareCount := investment.Details[0].ShareCount
				ownership, err := shareTx.FindByUserAndCampaign(ctx, userID, campaign.ID)
				if err != nil {
					return fmt.Errorf("share ownership could not be retrieved: %w", err)
				}
				if shareCount > ownership.TotalShares {
					shareCount = ownership.TotalShares
				}
				ownership.TotalShares -= shareCount
				ownership.UpdatedAt = now
				if err := shareTx.Update(ctx, ownership); err != nil {
					return fmt.Errorf("share ownership could not be updated: %w", err)
				}
			}
		}

		investment.Status = domain.InvestmentStatusCancelled
		investment.UpdatedAt = now
		if err := investmentsHTx.Update(ctx, investment); err != nil {
			return fmt.Errorf("transaction could not be cancelled: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return investment, nil
}
