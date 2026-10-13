package dto

import (
	"time"

	"github.com/SamuelLazuardy/investment/internal/domain"
)

type CreateCampaignRequest struct {
	Title         string             `json:"title" form:"title" binding:"required"`
	Description   string             `json:"description" form:"description"`
	Valuation     int64              `json:"valuation" form:"valuation" binding:"required,gt=0"`
	FundingGoal   int64              `json:"funding_goal" form:"funding_goal" binding:"required,gt=0"`
	MinInvestment int64              `json:"min_investment" form:"min_investment" binding:"required,gt=0"`
	SharePrice    int64              `json:"share_price" form:"share_price" binding:"required,gt=0"`
	Highlight     []domain.Highlight `json:"highlights" form:"highlights" binding:"required"`
	StartDate     time.Time          `json:"start_date" form:"start_date" time_format:"2006-01-02T15:04:05Z07:00"`
	EndDate       time.Time          `json:"end_date" form:"end_date" binding:"omitempty,gtfield=StartDate" time_format:"2006-01-02T15:04:05Z07:00"`
}

type UpdateCampaignRequest struct {
	Title         string    `json:"title" binding:"required"`
	Description   string    `json:"description"`
	Valuation     int64     `json:"valuation" binding:"required,gt=0"`
	FundingGoal   int64     `json:"funding_goal" binding:"required,gt=0"`
	MinInvestment int64     `json:"min_investment" binding:"required,gt=0"`
	SharePrice    int64     `json:"share_price" binding:"required,gt=0"`
	StartDate     time.Time `json:"start_date" binding:"required"`
	EndDate       time.Time `json:"end_date" binding:"required,gtfield=StartDate"`
}

type UpdateCampaignStatusRequest struct {
	Status domain.CampaignStatus `json:"status" binding:"required"`
}

type CampaignDateRequest struct {
	StartDate time.Time `json:"start_date" binding:"required"`
	EndDate   time.Time `json:"end_date" binding:"required,gtfield=StartDate"`
}

type CampaignFilterRequest struct {
	Status   *domain.CampaignStatus `form:"status"`
	SortBy   string                 `form:"sort_by"`
	Category string                 `form:"category"`
	Search   string                 `form:"search"`
	Limit    int                    `form:"limit"`
	Offset   int                    `form:"offset"`
}

type CampaignPaginatedResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int64 `json:"total"`
}

type CampaignSummary struct {
	ID            uint32                `json:"id"`
	Title         string                `json:"title"`
	Valuation     int64                 `json:"valuation"`
	FundingAmount int64                 `json:"funding_amount"`
	FundingGoal   int64                 `json:"funding_goal"`
	MinInvestment int64                 `json:"min_investment"`
	SharePrice    int64                 `json:"share_price"`
	Status        domain.CampaignStatus `json:"status"`
	StartDate     time.Time             `json:"start_date"`
	EndDate       time.Time             `json:"end_date"`
	TotalInvestor int32                 `json:"total_investor"`
	CompanyID     uint32                `json:"company_id"`
	CoverURL      string                `json:"cover_url"`
}
