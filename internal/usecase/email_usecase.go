package usecase

import (
	"fmt"

	"github.com/SamuelLazuardy/investment/internal/domain"
)

type SendEmailUsecase interface {
	Send(email domain.Email) error
}

type sendEmailUsecase struct {
	sender domain.EmailSender
}

var _ SendEmailUsecase = (*sendEmailUsecase)(nil)

func NewSendEmailUsecase(sender domain.EmailSender) SendEmailUsecase {
	return &sendEmailUsecase{sender: sender}
}

func (uc *sendEmailUsecase) Send(email domain.Email) error {
	if err := email.Validate(); err != nil {
		return fmt.Errorf("invalid email: %w", err)
	}
	if err := uc.sender.Send(email); err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	return nil
}
