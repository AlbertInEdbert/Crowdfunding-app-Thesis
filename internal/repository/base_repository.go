package repository

import (
	"context"

	"gorm.io/gorm"
)

type BaseRepository[T any, ID any] struct {
	DB *gorm.DB
}

func NewBaseRepository[T any, ID any](db *gorm.DB) *BaseRepository[T, ID] {
	return &BaseRepository[T, ID]{DB: db}
}

func (r *BaseRepository[T, ID]) Create(ctx context.Context, entity *T) error {
	return r.DB.WithContext(ctx).Create(entity).Error
}

func (r *BaseRepository[T, ID]) FindByID(ctx context.Context, id ID) (*T, error) {
	var entity T
	if err := r.DB.WithContext(ctx).First(&entity, id).Error; err != nil {
		return nil, translateError(err)
	}
	return &entity, nil
}

func (r *BaseRepository[T, ID]) FindAll(ctx context.Context, limit, offset int) ([]T, error) {
	var entities []T
	q := r.DB.WithContext(ctx)
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	err := q.Find(&entities).Error
	return entities, err
}

func (r *BaseRepository[T, ID]) Update(ctx context.Context, entity *T) error {
	return r.DB.WithContext(ctx).Save(entity).Error
}

func (r *BaseRepository[T, ID]) Delete(ctx context.Context, id ID) error {
	var entity T
	return r.DB.WithContext(ctx).Delete(&entity, id).Error
}

func (r *BaseRepository[T, ID]) Count(ctx context.Context) (int64, error) {
	var count int64
	var model T
	err := r.DB.WithContext(ctx).Model(&model).Count(&count).Error
	return count, err
}
