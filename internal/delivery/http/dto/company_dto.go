package dto

import "github.com/SamuelLazuardy/investment/internal/domain"

type CreateCompanyRequest struct {
	Name        string `json:"name" form:"name" binding:"required"`
	Description string `json:"description" form:"description"`
	CategoryID  uint32 `json:"categoryId" form:"categoryId"`
}

type UpdateCompanyStatusRequest struct {
	Status domain.CompanyStatus `json:"status" binding:"required"`
}

type UpdateCompanyRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	CategoryID  uint32 `json:"categoryId"`
}

type CompanyFilterRequest struct {
    Status *domain.CompanyStatus `form:"status"`
    SortBy string                 `form:"sort_by"`
    Category string               `form:"category"`
    Search string                 `form:"search"`
    Limit  int                    `form:"limit"`
    Offset int                    `form:"offset"`
}

type CompanyPaginatedResponse[T any] struct {
    Data  []T   `json:"data"`
    Total int64 `json:"total"`
}