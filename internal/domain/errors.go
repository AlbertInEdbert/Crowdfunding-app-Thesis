package domain

import "errors"

var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
	ErrForbidden     = errors.New("forbidden")
	
	ErrPhoneNumberRequired = errors.New("phone number is required, please update your profile first")
)
