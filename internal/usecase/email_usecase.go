package usecase

import (
	"fmt"

	"github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type SendEmailUseCase struct {
	userRepo repository.UserRepository
}

func NewSendEmailUseCase(userRepo repository.UserRepository) *SendEmailUseCase {
	return &SendEmailUseCase{userRepo: userRepo}
}

type SendEmailUsecase interface {
	Send(email domain.Email) error
}

func (uc *SendEmailUseCase) Execute(email domain.Email) error {
	if err := email.Validate(); err != nil {
		return fmt.Errorf("invalid email: %w", err)
	}
	// if err := uc.sender.Send(email); err != nil {
	// 	return fmt.Errorf("send email: %w", err)
	// }
	return nil
}