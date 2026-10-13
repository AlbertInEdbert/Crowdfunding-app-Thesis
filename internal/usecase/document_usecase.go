package usecase

// import (
// 	"bytes"
// 	"context"
// 	"errors"
// 	"fmt"
// 	"io"
// 	"path/filepath"
// 	"strings"
// 	"time"

// 	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
// 	domain "github.com/SamuelLazuardy/investment/internal/domain"
// 	"github.com/SamuelLazuardy/investment/internal/repository"
// 	"github.com/gabriel-vasile/mimetype"
// )

// var allowedDocumentExtensions = map[string]bool{
// 	".pdf":  true,
// }
// var allowedDocumentMIMETypes = map[string]bool{
//     "application/pdf":                  true,
// }
// var maxDocumentSize uint32 = 10 * 1024 * 1024

// type DocumentUsecase interface {
// 	SubmitDocument(ctx context.Context, userID uint32, campaignId uint32,req *dto.CreateDocumentRequest, file io.Reader, fileName string, fileSize uint32) (*domain.Document, error)
// 	DocumentApproval(ctx context.Context, req *domain.Document,status string) (*domain.Document, error)
// 	GetDocumentByCampaignId(ctx context.Context, id uint32) ([]domain.Document, error)
// 	GetDocumentByDocumentId(ctx context.Context, id uint32) (*domain.Document, error)
// }

// type documentUsecase struct {
// 	documentRepo repository.DocumentRepository
// }

// func NewDocumentUsecase(documentRepo repository.DocumentRepository) DocumentUsecase {
// 	return &documentUsecase{documentRepo: documentRepo}
// }

// func (d *documentUsecase) GetDocumentByCampaignId(ctx context.Context, id uint32) ([]domain.Document, error) {

// 	document, err := d.documentRepo.FindByCampaignID(ctx, id)
// 	if err != nil || document == nil {
// 		return nil, errors.New("document could not be retrieved")
// 	}

// 	return document, nil
// }

// func (d *documentUsecase) SubmitDocument(ctx context.Context, userID uint32, campaignId uint32,req *dto.CreateDocumentRequest, file io.Reader, fileName string, fileSize uint32) (*domain.Document, error) {
// 	if err := validateDocumentFile(fileName, fileSize); err != nil {
// 		return nil, fmt.Errorf("invalid file: %w", err)
// 	}

// 	file, err := validateDocumentMIMEType(file)
// 	if err != nil {
// 		return nil, fmt.Errorf("invalid file: %w", err)
// 	}
	
// 	existing, _ := d.documentRepo.FindByCampaignIDAndName(ctx,campaignId,req.Name)
// 	if existing != nil {
// 		return nil, fmt.Errorf("cannot register document with same name")
// 	}

// 	// fileURL, err := d.fileStorage.Save(ctx, userID, fileName, file)
// 	// if err != nil {
// 	// 	return nil, fmt.Errorf("could not store file: %w", err)
// 	// }

// 	document := &domain.Document{
// 		UserID:     userID,
// 		CampaignID: campaignId,
// 		Name:       req.Name,
// 		DocumentType:      	req.DocumentType,
// 		// FileURL:    fileURL,           
// 		FileSize:   fileSize,           
// 		Status:     "OPEN",
// 		CreatedAt:   time.Now(),
// 		UpdatedAt:   time.Now(),
// 	}

// 	if err := d.documentRepo.Create(ctx, document); err != nil {
// 		return nil, fmt.Errorf("document could not be created: %w", err)
// 	}

// 	return document, nil
// }

// func (d *documentUsecase) GetDocumentByDocumentId(ctx context.Context, id uint32) (*domain.Document, error) {

// 	document, err := d.documentRepo.FindByID(ctx, id)
// 	if err != nil || document == nil {
// 		return nil, errors.New("document could not be retrieved")
// 	}

// 	return document, nil
// }

// func (d *documentUsecase) DocumentApproval(ctx context.Context, req *domain.Document,status string) (*domain.Document, error){
// 	return nil,nil
// }

// func validateDocumentFile(fileName string, fileSize uint32) error {
// 	ext := strings.ToLower(filepath.Ext(fileName))
// 	if ext == "" {
// 		return errors.New("file has no extension")
// 	}
// 	if !allowedDocumentExtensions[ext] {
// 		return fmt.Errorf("file type %s is not allowed", ext)
// 	}
// 	if fileSize > maxDocumentSize {
// 		return fmt.Errorf("file size exceeds %d bytes limit", maxDocumentSize)
// 	}
// 	return nil
// }

// func validateDocumentMIMEType(file io.Reader) (io.Reader, error) {
// 	buf := new(bytes.Buffer)
// 	if _, err := buf.ReadFrom(file); err != nil {
// 		return nil,  fmt.Errorf("could not read file: %w", err)
// 	}

// 	mtype, err := mimetype.DetectReader(bytes.NewReader(buf.Bytes()))
// 	if err != nil {
// 		return nil,  fmt.Errorf("could not detect file type: %w", err)
// 	}

// 	if !allowedDocumentMIMETypes[mtype.String()] {
// 		return nil, fmt.Errorf("file content type %s is not allowed", mtype.String())
// 	}

// 	return bytes.NewReader(buf.Bytes()), nil
// }