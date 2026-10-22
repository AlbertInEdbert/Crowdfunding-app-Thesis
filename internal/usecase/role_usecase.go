package usecase

import (
	"context"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type RoleUsecase interface {
	FindRoleById(ctx context.Context, roleId uint32) (*domain.Role, error)
}

type roleUsecase struct {
	roleRepo repository.RoleRepository
}

func NewRoleUsecase(roleRepo repository.RoleRepository) RoleUsecase {
	return &roleUsecase{roleRepo: roleRepo}
}

func (u *roleUsecase) FindRoleById(ctx context.Context, roleId uint32) (*domain.Role, error) {
	return u.roleRepo.FindByID(ctx, roleId)
}
