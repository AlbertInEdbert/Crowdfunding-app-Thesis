package usecase

import (
	"context"
	"errors"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type UserUsecase interface {
	GetUserProfile(ctx context.Context, id uint32) (*domain.User, error)
	UpdateProfile(ctx context.Context, id uint32, req *dto.UpdateProfileRequest) (*domain.User, error)
	RegisterNewUser(ctx context.Context, user *domain.User) error
}

type userUsecase struct {
	userRepo repository.UserRepository
}

func NewUserUsecase(userRepo repository.UserRepository) UserUsecase {
	return &userUsecase{userRepo: userRepo}
}

func (u *userUsecase) GetUserProfile(ctx context.Context, id uint32) (*domain.User, error) {
	user, err := u.userRepo.FindByIDWithRelations(ctx, id)
	if err != nil {
		return nil, errors.New("user profiles could not be retrieved")
	}
	return user, nil
}

func (u *userUsecase) UpdateProfile(ctx context.Context, id uint32, req *dto.UpdateProfileRequest) (*domain.User, error) {
	user, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("user profiles could not be retrieved")
	}

	user.Name = req.Name
	user.PhoneNumber = req.PhoneNumber

	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, errors.New("profile could not be updated")
	}

	user.Password = ""
	return user, nil
}

func (u *userUsecase) RegisterNewUser(ctx context.Context, user *domain.User) error {
	existing, _ := u.userRepo.FindByEmail(ctx, user.Email)
	if existing != nil {
		return errors.New("email is already registered")
	}

	return u.userRepo.Create(ctx, user)
}
