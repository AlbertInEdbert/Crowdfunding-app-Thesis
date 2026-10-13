package usecase

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/repository"
)

type CompanyFileInput struct {
	MediaCode   string 
	Category    string 
	File        io.Reader
	FileName    string
	FileSize    int64
	ContentType string
}


type CompanyUsecase interface {
	FindByUserID(ctx context.Context, id uint32) (*domain.Company, error)
	FindByCompanyId(ctx context.Context, id uint32) (*domain.Company, error)
	RegisterNewCompany(ctx context.Context, req *dto.CreateCompanyRequest, userID uint32, files []CompanyFileInput) (*domain.Company, error)
	UpdateCompany(ctx context.Context, req *dto.UpdateCompanyRequest, companyID uint32, userID uint32) (*domain.Company, error)
	UpdateCompanyStatus(ctx context.Context, status domain.CompanyStatus, coId uint32) error
	FindAllCompany(ctx context.Context, req dto.CompanyFilterRequest) ([]domain.Company,int64, error)
}

type companyUsecase struct {
	companyRepo repository.CompanyRepository
	storageUsecase   StorageUsecase
}

func NewCompanyUsecase(companyRepo repository.CompanyRepository, storageUsecase StorageUsecase) CompanyUsecase {
	return &companyUsecase{
		companyRepo: companyRepo,
		storageUsecase : storageUsecase,
	}
}

func (u *companyUsecase) FindAllCompany(ctx context.Context, req dto.CompanyFilterRequest) ([]domain.Company, int64,error) {
	return u.companyRepo.FindAll(ctx, req)
}

func (u *companyUsecase) FindByUserID(ctx context.Context, id uint32) (*domain.Company, error) {

	company, err := u.companyRepo.FindByUserID(ctx, id)
	if err != nil || company == nil {
		return nil, errors.New("company could not be retrieved")
	}

	return company, nil
}

func (u *companyUsecase) FindByCompanyId(ctx context.Context, id uint32) (*domain.Company, error) {

	company, err := u.companyRepo.FindByID(ctx, id)
	if err != nil || company == nil {
		return nil, errors.New("company could not be retrieved")
	}

	return company, nil
}

func (c *companyUsecase) RegisterNewCompany(ctx context.Context, req *dto.CreateCompanyRequest, userID uint32, files []CompanyFileInput) (*domain.Company, error) {
	existing, _ := c.companyRepo.FindByName(ctx,req.Name)
	if existing != nil {
		return nil, fmt.Errorf("cannot register company with same name")
	}

	company := &domain.Company{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		Status: "PENDING",
		CategoryID: req.CategoryID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := c.companyRepo.Create(ctx, company); err != nil {
		return nil, fmt.Errorf("company could not be created: %w", err)
	}

	for _, f := range files {
		_, err := c.storageUsecase.Upload(ctx, UploadInput{
			UserID:      userID,
			CompanyID:   company.ID,
			MediaCode:   f.MediaCode,
			Category:    f.Category,
			File:        f.File,
			FileName:    f.FileName,
			FileSize:    f.FileSize,
			ContentType: f.ContentType,
		})
		if err != nil {
			return nil, fmt.Errorf("company created but file %q could not be uploaded: %w", f.FileName, err)
		}
	}

	return company, nil
}

func (u *companyUsecase) UpdateCompany(ctx context.Context, req *dto.UpdateCompanyRequest, companyID uint32, userID uint32) (*domain.Company, error) {
	company, err := u.companyRepo.FindByID(ctx, companyID)
	if err != nil || company == nil {
		return nil, errors.New("company could not be retrieved")
	}
	if company.UserID != userID {
		return nil, errors.New("company does not belong to the current user")
	}

	company.Name = req.Name
	company.Description = req.Description
	company.CategoryID = req.CategoryID
	company.UpdatedAt = time.Now()

	if err := u.companyRepo.Update(ctx, company); err != nil {
		return nil, fmt.Errorf("company could not be updated: %w", err)
	}

	return company, nil
}

func (u *companyUsecase) UpdateCompanyStatus(ctx context.Context, status domain.CompanyStatus, companyId uint32) error {
	return u.companyRepo.UpdateStatus(ctx, status, companyId)
}