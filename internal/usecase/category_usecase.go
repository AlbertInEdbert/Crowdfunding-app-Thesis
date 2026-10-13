package usecase

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type CategoryUsecase interface {
	FindAllCategory(ctx context.Context, limit, offset int) ([]domain.Category, error)
}

type categoryUsecase struct {
	categoryRepo repository.CategoryRepository
}

func NewCategoryUsecase(categoryRepo repository.CategoryRepository) CategoryUsecase {
	return &categoryUsecase{categoryRepo: categoryRepo}
}

func (u *categoryUsecase) FindAllCategory(ctx context.Context, limit, offset int) ([]domain.Category, error){
	return u.categoryRepo.FindAll(ctx, limit, offset)
}


