package domain

import (
	"errors"
	"net/mail"
)

type Email struct {
	From    mail.Address
	To      []mail.Address
	Subject string
	Body    string
	HTML    bool
}

type EmailSender interface {
	Send(email Email) error
}

func (e Email) Validate() error {
	
	if len(e.To) == 0 {
		return errors.New("email must have at least one recipient")
	}
	if e.Subject == "" {
		return errors.New("subject is required")
	}
	return nil
}

