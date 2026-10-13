package domain

import (
	"time"
)

const (

	ObjectCategoryDocument = "document"
	ObjectCategoryImage    = "image"
	ObjectCategoryVideo    = "video"

	MediaCodeCover     = "COVER"
	MediaCodeThumbnail = "THUMBNAIL"
	MediaCodeVideo     = "VIDEO"
	MediaCodeGallery   = "GALLERY"
)

type CampaignMedia struct {
	ID          uint32    `gorm:"primaryKey;column:id;type:integer"`
	UserID      uint32    `gorm:"column:userid;type:integer"`
	CampaignID  *uint32   `gorm:"column:campaignid;type:integer"`
	CompanyID   *uint32   `gorm:"column:companyid;type:integer"`
	MediaCode   string    `gorm:"column:media_code;type:varchar(50)"`
	Category    string    `gorm:"column:category;type:varchar(50)"`
	ObjectKey   string    `gorm:"column:object_key;type:varchar(500)"`
	FileName    string    `gorm:"column:file_name;type:varchar(255)"`
	ContentType string    `gorm:"column:content_type;type:varchar(255)"`
	Size        int64     `gorm:"column:size;type:bigint"`
	CreatedAt   time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt   time.Time `gorm:"column:updated_at;type:timestamp"`
}

func (CampaignMedia) TableName() string {
	return "campaign_media"
}


