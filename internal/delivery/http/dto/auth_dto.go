package dto

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type SetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=8"`
}

type TokenPair struct {
	AccessToken string `json:"access_token"`
}
