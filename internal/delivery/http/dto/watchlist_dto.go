package dto

import (
	"time"

	"github.com/SamuelLazuardy/investment/internal/domain"
)

type CampaignWatchlist struct {
	ID            uint32                `json:"id" binding:"required"`
	Title         string                `json:"title" binding:"required"`
	Valuation     int64                 `json:"valuation" binding:"required"`
	FundingAmount int64                 `json:"fundingAmount" binding:"required"`
	FundingGoal   int64                 `json:"fundingGoal" binding:"required"`
	Status        domain.CampaignStatus `json:"status" binding:"required"`
	StartDate     time.Time           `json:"startDate" binding:"required"`
	EndDate       time.Time                `json:"endDate" binding:"required"`
	CompanyName   string                `json:"companyName" binding:"required"`
	CategoryName  string                `json:"categoryName" binding:"required"`
}

type WatchlistPaginatedResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int64 `json:"total"`
}

type WatchlistFilterRequest struct {
    Status *domain.CampaignStatus `form:"status"`
    SortBy string                 `form:"sort_by"`
    Category string               `form:"category"`
    Search string                 `form:"search"`
    Limit  int                    `form:"limit"`
    Offset int                    `form:"offset"`
}