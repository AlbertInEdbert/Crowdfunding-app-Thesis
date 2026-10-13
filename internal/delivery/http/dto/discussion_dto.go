package dto

type CreateCommentRequest struct {
	CampaignID   uint32 `json:"campaign_id" binding:"required"`
	DiscussionID uint32 `json:"discussion_id"`
	Comment      string `json:"comment" binding:"required"`
}

type UpdateCommentRequest struct {
	Comment string `json:"comment" binding:"required"`
}
