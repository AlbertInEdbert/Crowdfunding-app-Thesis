package usecase

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type UploadInput struct {
	UserID      uint32
	CampaignID  uint32 
	CompanyID   uint32 
	MediaCode   string 
	Category    string 
	Folder      string 
	File        io.Reader
	FileName    string
	FileSize    int64
	ContentType string
}

type StorageUsecase interface {

	Upload(ctx context.Context, input UploadInput) (*domain.CampaignMedia, error)
	GetDownloadURL(ctx context.Context, key string) (string, error)
	GetMediaByCampaign(ctx context.Context, campaignID uint32) ([]CampaignMediaFile, error)
	GetMediaByCompany(ctx context.Context, companyID uint32) ([]CampaignMediaFile, error)
	Delete(ctx context.Context, key string) error
}

type CampaignMediaFile struct {
	domain.CampaignMedia
	URL string
}

type storageUsecase struct {
	storage    repository.StorageRepository
	objectRepo repository.CampaignMediaRepository
}

func NewStorageUsecase(storage repository.StorageRepository, objectRepo repository.CampaignMediaRepository) StorageUsecase {
	return &storageUsecase{storage: storage, objectRepo: objectRepo}
}

func (s *storageUsecase) Upload(ctx context.Context, input UploadInput) (*domain.CampaignMedia, error) {
	category := input.Category
	if category == "" {
		category = domain.ObjectCategoryDocument
	}
	folder := input.Folder
	if folder == "" {
		folder = category
	}

	ext := strings.ToLower(filepath.Ext(input.FileName))
	key := fmt.Sprintf("%s/%d/%d%s", folder, input.UserID, time.Now().UnixNano(), ext)

	if err := s.storage.Upload(ctx, key, input.File, input.FileSize, input.ContentType); err != nil {
		return nil, fmt.Errorf("could not store file: %w", err)
	}

	object := &domain.CampaignMedia{
		UserID:      input.UserID,
		MediaCode:   input.MediaCode,
		Category:    category,
		ObjectKey:   key,
		FileName:    input.FileName,
		ContentType: input.ContentType,
		Size:        input.FileSize,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if input.CampaignID != 0 {
		object.CampaignID = &input.CampaignID
	}
	if input.CompanyID != 0 {
		object.CompanyID = &input.CompanyID
	}
	if err := s.objectRepo.Create(ctx, object); err != nil {
		_ = s.storage.Delete(ctx, key)
		return nil, fmt.Errorf("could not register object: %w", err)
	}

	return object, nil
}

func (s *storageUsecase) GetDownloadURL(ctx context.Context, key string) (string, error) {
	return s.storage.GetPresignedURL(ctx, key, 15*time.Minute)
}

func (s *storageUsecase) GetMediaByCampaign(ctx context.Context, campaignID uint32) ([]CampaignMediaFile, error) {
	objects, err := s.objectRepo.FindByCampaignID(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	return s.withPresignedURLs(ctx, objects)
}

func (s *storageUsecase) GetMediaByCompany(ctx context.Context, companyID uint32) ([]CampaignMediaFile, error) {
	objects, err := s.objectRepo.FindByCompanyID(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return s.withPresignedURLs(ctx, objects)
}

func (s *storageUsecase) withPresignedURLs(ctx context.Context, objects []domain.CampaignMedia) ([]CampaignMediaFile, error) {
	files := make([]CampaignMediaFile, 0, len(objects))
	for i := range objects {
		url, err := s.storage.GetPresignedURL(ctx, objects[i].ObjectKey, 15*time.Minute)
		if err != nil {
			return nil, fmt.Errorf("download url could not be generated for %q: %w", objects[i].ObjectKey, err)
		}
		files = append(files, CampaignMediaFile{CampaignMedia: objects[i], URL: url})
	}
	return files, nil
}

func (s *storageUsecase) Delete(ctx context.Context, key string) error {
	return s.storage.Delete(ctx, key)
}
