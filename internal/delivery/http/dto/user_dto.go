package dto

type UpdateProfileRequest struct {
	Name        string `json:"name" binding:"required"`
	PhoneNumber string `json:"phone_number"`
}
