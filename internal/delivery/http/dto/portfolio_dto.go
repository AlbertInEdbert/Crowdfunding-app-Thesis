package dto

import "time"

type PortfolioInvestment struct {
	ID            uint32    `json:"id"`
	TransactionNo string    `json:"transaction_no"`
	Amount        int64     `json:"amount"`
	Status        string    `json:"status"`
	ShareCount    uint32    `json:"share_count"`
	CreatedAt     time.Time `json:"created_at"`
}

type PortfolioItem struct {
	CampaignID      uint32               `json:"campaign_id"`
	CampaignTitle   string               `json:"campaign_title"`
	CampaignStatus  string               `json:"campaign_status"`
	CampaignEndDate time.Time            `json:"campaign_end_date"`
	CompanyID       uint32               `json:"company_id"`
	CompanyName     string               `json:"company_name"`
	TotalShares     uint32               `json:"total_shares"`
	TotalInvested   int64                `json:"total_invested"`
	PendingAmount   int64                `json:"pending_amount"`
	Investments     []PortfolioInvestment `json:"investments"`
}
