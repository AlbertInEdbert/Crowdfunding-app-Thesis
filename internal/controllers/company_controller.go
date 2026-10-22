package controllers

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	"github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type CompanyController struct {
	companyUsecase usecase.CompanyUsecase
	auth           gin.HandlerFunc
}

func NewCompanyController(companyUsecase usecase.CompanyUsecase, auth gin.HandlerFunc) *CompanyController {
	return &CompanyController{companyUsecase: companyUsecase, auth: auth}
}

func (ctrl *CompanyController) RegisterRoutes(rg *gin.RouterGroup) {
	
	companies := rg.Group("/company")
	
	companies.GET("", ctrl.FindAllCompanies)

	protected := companies.Group("", ctrl.auth)
	{
		protected.GET("/user/:id", ctrl.FindByUserID)
		protected.GET("/:id",  ctrl.FindByCompanyId)
		protected.POST("",  ctrl.RegisterNewCompany)
		protected.PUT("/:id", ctrl.UpdateCompany)
		protected.PATCH("/:id", ctrl.UpdateCompanyStatus)
	}
}

func (ctrl *CompanyController) FindAllCompanies(c *gin.Context) {

	var filter dto.CompanyFilterRequest

	if err := c.ShouldBindQuery(&filter); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid query parameters: " + err.Error()})
        return
    }

    if filter.Limit <= 0 {
        filter.Limit = 10
    }

	companies,total, err := ctrl.companyUsecase.FindAllCompany(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve campaigns"})
		return
	}

    c.JSON(http.StatusOK, dto.CompanyPaginatedResponse[domain.Company]{
        Data:   companies,
        Total:  total,
    })
}


func (ctrl *CompanyController) FindByUserID(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := ctrl.companyUsecase.FindByUserID(c.Request.Context(), uint32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (ctrl *CompanyController) FindByCompanyId(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid company id"})
		return
	}

	user, err := ctrl.companyUsecase.FindByCompanyId(c.Request.Context(), uint32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (ctrl *CompanyController) RegisterNewCompany(c *gin.Context) {
	var company dto.CreateCompanyRequest

	if err := c.ShouldBind(&company); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	files, closers, err := collectCompanyFiles(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read uploaded files"})
		return
	}
	defer func() {
		for _, closer := range closers {
			closer.Close()
		}
	}()

	createdCompany, err := ctrl.companyUsecase.RegisterNewCompany(c.Request.Context(), &company,session.UserID,files)
	if err != nil {
		if errors.Is(err, domain.ErrPhoneNumberRequired) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create company: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, createdCompany)
}

func collectCompanyFiles(c *gin.Context) ([]usecase.CompanyFileInput, []io.Closer, error) {
	var files []usecase.CompanyFileInput
	var closers []io.Closer

	add := func(header *multipart.FileHeader, mediaCode string) error {
		file, err := header.Open()
		if err != nil {
			return err
		}
		closers = append(closers, file)
		files = append(files, usecase.CompanyFileInput{
			MediaCode:   mediaCode,
			Category:    categoryFromContentType(header.Header.Get("Content-Type")),
			File:        file,
			FileName:    header.Filename,
			FileSize:    header.Size,
			ContentType: header.Header.Get("Content-Type"),
		})
		return nil
	}

	form, err := c.MultipartForm()
	if err != nil {
		return files, closers, nil
	}
	for field, headers := range form.File {
		if field == "files" {
			continue
		}
		for _, header := range headers {
			if err := add(header, field); err != nil {
				return nil, closers, err
			}
		}
	}

	return files, closers, nil
}

func (ctrl *CompanyController) UpdateCompany(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	companyID, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid company id"})
		return
	}

	var req dto.UpdateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	updated, err := ctrl.companyUsecase.UpdateCompany(c.Request.Context(), &req, companyID, session.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update company: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (ctrl *CompanyController) UpdateCompanyStatus(c *gin.Context) {
	companyId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid company id"})
		return
	}


	var req dto.UpdateCompanyStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := ctrl.companyUsecase.UpdateCompanyStatus(c.Request.Context(), req.Status,companyId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update companies"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "status updated", "status": req.Status})
}