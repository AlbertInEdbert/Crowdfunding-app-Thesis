package usecase

import (
	"context"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type DiscussionUsecase interface {
	FindAllDiscussion(ctx context.Context, campaidnId uint32, limit, offset int) ([]domain.Comment, error)
	CreateComment(ctx context.Context, userID uint32, req *dto.CreateCommentRequest) (*domain.Comment, error)
	UpdateComment(ctx context.Context, userID, id uint32, comment string) (*domain.Comment, error)
	DeleteComment(ctx context.Context, userID, id uint32) error
	LikeComment(ctx context.Context, userID, commentID uint32) error
	HasLikedComment(ctx context.Context, userID, commentID uint32) (bool, error)
}

type discussionUsecase struct {
	discussionRepo repository.DiscussionRepository
}

func NewDiscussionUsecase(discussionRepo repository.DiscussionRepository) DiscussionUsecase {
	return &discussionUsecase{discussionRepo: discussionRepo}
}

func (u *discussionUsecase) FindAllDiscussion(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Comment, error) {
	return u.discussionRepo.FindByCampaignID(ctx, campaignID, limit, offset)
}

func (u *discussionUsecase) CreateComment(ctx context.Context, userID uint32, req *dto.CreateCommentRequest) (*domain.Comment, error) {
	if req.DiscussionID != 0 {
		parent, err := u.discussionRepo.FindByID(ctx, req.DiscussionID)
		if err != nil {
			return nil, err
		}
		if parent.CampaignID != req.CampaignID {
			return nil, domain.ErrNotFound
		}
	}

	comment := &domain.Comment{
		CampaignID: req.CampaignID,
		ParentID:   req.DiscussionID,
		UserID:     userID,
		Content:    req.Comment,
	}
	if err := u.discussionRepo.CreateComment(ctx, comment); err != nil {
		return nil, err
	}
	return comment, nil
}

func (u *discussionUsecase) UpdateComment(ctx context.Context, userID, id uint32, comment string) (*domain.Comment, error) {
	existing, err := u.discussionRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.UserID != userID {
		return nil, domain.ErrForbidden
	}
	existing.Content = comment
	if err := u.discussionRepo.UpdateComment(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (u *discussionUsecase) DeleteComment(ctx context.Context, userID, id uint32) error {
	comment, err := u.discussionRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if comment.UserID != userID {
		return domain.ErrForbidden
	}
	return u.discussionRepo.DeleteComment(ctx, id)
}

func (u *discussionUsecase) LikeComment(ctx context.Context, userID, commentID uint32) error {
	if _, err := u.discussionRepo.FindByID(ctx, commentID); err != nil {
		return err
	}
	return u.discussionRepo.AddLike(ctx, &domain.CommentLike{
		CommentID: commentID,
		UserID:    userID,
	})
}

func (u *discussionUsecase) HasLikedComment(ctx context.Context, userID, commentID uint32) (bool, error) {
	return u.discussionRepo.HasLiked(ctx, commentID, userID)
}
