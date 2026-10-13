package usecase

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type ReviewUsecase interface {
	FindAllReview(ctx context.Context, campaignId uint32, limit, offset int) ([]domain.Review, error)
	CreateReview(ctx context.Context, userID uint32, review *domain.Review) error
	UpdateReview(ctx context.Context, userID, id uint32, comment string) (*domain.Review, error)
	DeleteReview(ctx context.Context, userID, id uint32) error
}

type reviewUsecase struct {
	reviewRepo repository.ReviewRepository
}

func NewReviewUsecase(reviewRepo repository.ReviewRepository) ReviewUsecase {
	return &reviewUsecase{reviewRepo: reviewRepo}
}

func (u *reviewUsecase) FindAllReview(ctx context.Context, campaignId uint32, limit, offset int) ([]domain.Review, error) {
	return u.reviewRepo.FindByCampaignID(ctx, campaignId, limit, offset)
}

func (u *reviewUsecase) CreateReview(ctx context.Context, userID uint32, review *domain.Review) error {
	review.UserID = userID
	return u.reviewRepo.Create(ctx, review)
}

func (u *reviewUsecase) UpdateReview(ctx context.Context, userID, id uint32, comment string) (*domain.Review, error) {
	review, err := u.reviewRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if review.UserID != userID {
		return nil, domain.ErrForbidden
	}
	review.Comment = comment
	if err := u.reviewRepo.Update(ctx, review); err != nil {
		return nil, err
	}
	return review, nil
}

func (u *reviewUsecase) DeleteReview(ctx context.Context, userID, id uint32) error {
	review, err := u.reviewRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if review.UserID != userID {
		return domain.ErrForbidden
	}
	return u.reviewRepo.Delete(ctx, id)
}


