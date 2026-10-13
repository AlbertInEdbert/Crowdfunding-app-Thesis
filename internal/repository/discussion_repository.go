package repository

import (
	"context"
	"errors"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type DiscussionRepository interface {
	CreateComment(ctx context.Context, comment *domain.Comment) error
	FindByID(ctx context.Context, id uint32) (*domain.Comment, error)
	FindByCampaignID(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Comment, error)
	UpdateComment(ctx context.Context, comment *domain.Comment) error
	DeleteComment(ctx context.Context, id uint32) error
	AddLike(ctx context.Context, like *domain.CommentLike) error
	HasLiked(ctx context.Context, commentID, userID uint32) (bool, error)
}

type discussionRepository struct {
	*BaseRepository[domain.Comment, uint32]
}

func NewDiscussionRepository(db *gorm.DB) DiscussionRepository {
	return &discussionRepository{BaseRepository: NewBaseRepository[domain.Comment, uint32](db)}
}

func (r *discussionRepository) CreateComment(ctx context.Context, comment *domain.Comment) error {
	return r.DB.WithContext(ctx).Create(comment).Error
}

func (r *discussionRepository) FindByID(ctx context.Context, id uint32) (*domain.Comment, error) {
	var comment domain.Comment
	err := r.DB.WithContext(ctx).
		Preload("User", func(db *gorm.DB) *gorm.DB { return db.Select("id", "name") }).
		First(&comment, id).Error
	if err != nil {
		return nil, translateError(err)
	}
	return &comment, nil
}

func (r *discussionRepository) FindByCampaignID(ctx context.Context, campaignID uint32, limit, offset int) ([]domain.Comment, error) {
	var comments []domain.Comment
	err := r.DB.WithContext(ctx).
		Preload("User", func(db *gorm.DB) *gorm.DB { return db.Select("id", "name") }).
		Where("campaignid = ?", campaignID).Limit(limit).Offset(offset).Find(&comments).Error
	return comments, err
}

func (r *discussionRepository) UpdateComment(ctx context.Context, comment *domain.Comment) error {
	return r.DB.WithContext(ctx).Save(comment).Error
}

func (r *discussionRepository) DeleteComment(ctx context.Context, id uint32) error {
	return r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("commentid = ?", id).Delete(&domain.CommentLike{}).Error; err != nil {
			return err
		}
		return tx.Delete(&domain.Comment{}, id).Error
	})
}

func (r *discussionRepository) AddLike(ctx context.Context, like *domain.CommentLike) error {
	return r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(like).Error; err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				return domain.ErrAlreadyExists
			}
			return err
		}

		return tx.Model(&domain.Comment{}).
			Where("id = ?", like.CommentID).
			UpdateColumn("like", gorm.Expr(`"like" + 1`)).Error
	})
}

func (r *discussionRepository) HasLiked(ctx context.Context, commentID, userID uint32) (bool, error) {
	var count int64
	err := r.DB.WithContext(ctx).
		Model(&domain.CommentLike{}).
		Where("commentid = ? AND userid = ?", commentID, userID).
		Count(&count).Error
	return count > 0, err
}
