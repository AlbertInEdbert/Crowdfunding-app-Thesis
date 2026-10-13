package dto

type CreateReviewRequest struct {
	CampaignID uint32 `json:"campaign_id" binding:"required"`
	Comment    string `json:"comment" binding:"required"`
}

type UpdateReviewRequest struct {
	Comment string `json:"comment" binding:"required"`
}
