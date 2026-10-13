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

func (e Email) Validate() error {
	if e.From.Address == "" || len(e.To) == 0 {
		return errors.New("email must have a sender and at least one recipient")
	}
	if e.Subject == "" {
		return errors.New("subject is required")
	}
	return nil
}

