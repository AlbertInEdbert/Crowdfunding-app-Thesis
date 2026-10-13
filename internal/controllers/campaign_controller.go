package controllers

import (
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type CampaignController struct {
	campaignUsecase usecase.CampaignUsecase
	auth            gin.HandlerFunc
}

func NewCampaignController(campaignUsecase usecase.CampaignUsecase, auth gin.HandlerFunc) *CampaignController {
	return &CampaignController{campaignUsecase: campaignUsecase, auth: auth}
}

func (ctrl *CampaignController) RegisterRoutes(rg *gin.RouterGroup) {
	campaigns := rg.Group("/campaign")

	campaigns.GET("", ctrl.FindAllCampaign)
	campaigns.GET("explore", ctrl.FindAllCampaignAndCover)
	campaigns.GET("/:id", ctrl.GetByID)
	campaigns.GET("/status/:status", ctrl.GetByStatus)
	campaigns.GET("/company/:company-id", ctrl.GetByCompanyID)

	protected := campaigns.Group("", ctrl.auth)
	{
		protected.POST("/:id", ctrl.Create)
		protected.POST("/:id/close", ctrl.Close)
		protected.PUT("/:id", ctrl.UpdateCampaignDetails)
		protected.PATCH("/:id", ctrl.UpdateCampaignStatus)
		protected.PATCH("/date/:id", ctrl.SetCampaignDate)
		// protected.PATCH("/:id", ctrl.Update)
		protected.DELETE("/:id", ctrl.Delete)
	}
}

func (ctrl *CampaignController) GetByID(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	campaign, err := ctrl.campaignUsecase.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

func (ctrl *CampaignController) GetByIDWithRelations(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	relations := c.QueryArray("relations")

	campaign, err := ctrl.campaignUsecase.FindByIDWithRelations(c.Request.Context(), id, relations...)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

func (ctrl *CampaignController) FindAllCampaign(c *gin.Context) {

	var filter dto.CampaignFilterRequest

	if err := c.ShouldBindQuery(&filter); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid query parameters: " + err.Error()})
        return
    }

    if filter.Limit <= 0 {
        filter.Limit = 10
    }

	campaigns, total,err := ctrl.campaignUsecase.FindAllCampaign(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve campaigns"})
		return
	}

    c.JSON(http.StatusOK, dto.CampaignPaginatedResponse[domain.Campaign]{
        Data:   campaigns,
        Total:  total,
    })
}

func (ctrl *CampaignController) FindAllCampaignAndCover(c *gin.Context) {

	var filter dto.CampaignFilterRequest

	if err := c.ShouldBindQuery(&filter); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid query parameters: " + err.Error()})
        return
    }

    if filter.Limit <= 0 {
        filter.Limit = 10
    }

	campaigns, total,err := ctrl.campaignUsecase.FindAllCampaignAndCover(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve campaigns"})
		return
	}

    c.JSON(http.StatusOK, dto.CampaignPaginatedResponse[dto.CampaignSummary]{
        Data:   campaigns,
        Total:  total,
    })
}

func (ctrl *CampaignController) GetByCompanyID(c *gin.Context) {
	companyID, err := parseUint32Param(c, "company-id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid company id"})
		return
	}

	campaigns, err := ctrl.campaignUsecase.FindByCompanyID(c.Request.Context(), companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve campaigns"})
		return
	}

	c.JSON(http.StatusOK, campaigns)
}

func (ctrl *CampaignController) GetByStatus(c *gin.Context) {

	status, err := domain.ParseCampaignStatus(c.Param("status"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign status"})
		return
	}

	campaigns, err := ctrl.campaignUsecase.FindByStatus(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve campaigns"})
		return
	}

	c.JSON(http.StatusOK, campaigns)
}

func (ctrl *CampaignController) Create(c *gin.Context) {

	session, ok := middleware.GetUser(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	companyId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid company id"})
		return
	}

	var campaign dto.CreateCampaignRequest
	
	if err := c.ShouldBind(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	files, closers, err := collectCampaignFiles(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read uploaded files"})
		return
	}
	defer func() {
		for _, closer := range closers {
			closer.Close()
		}
	}()

	created, err := ctrl.campaignUsecase.CreateCampaign(c.Request.Context(), &campaign, companyId, session.UserID, files)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, created)
}

func collectCampaignFiles(c *gin.Context) ([]usecase.CampaignFileInput, []io.Closer, error) {
	var files []usecase.CampaignFileInput
	var closers []io.Closer

	add := func(header *multipart.FileHeader, mediaCode string) error {
		file, err := header.Open()
		if err != nil {
			return err
		}
		closers = append(closers, file)
		files = append(files, usecase.CampaignFileInput{
			MediaCode:   mediaCode,
			Category:    categoryFromContentType(header.Header.Get("Content-Type")),
			File:        file,
			FileName:    header.Filename,
			FileSize:    header.Size,
			ContentType: header.Header.Get("Content-Type"),
		})
		return nil
	}

	if cover, err := c.FormFile(domain.MediaCodeCover); err == nil {
		if err := add(cover, domain.MediaCodeCover); err != nil {
			return nil, closers, err
		}
	}

	if thumbnail, err := c.FormFile(domain.MediaCodeThumbnail); err == nil {
		if err := add(thumbnail, domain.MediaCodeThumbnail); err != nil {
			return nil, closers, err
		}
	}

	if video, err := c.FormFile(domain.MediaCodeVideo); err == nil {
		if err := add(video, domain.MediaCodeVideo); err != nil {
			return nil, closers, err
		}
	}

	if form, err := c.MultipartForm(); err == nil {
		for field, headers := range form.File {
			if field == domain.MediaCodeCover || field == domain.MediaCodeThumbnail || field == domain.MediaCodeVideo {
				continue
			}
			mediaCode := field
			if field == "files" {
				mediaCode = domain.MediaCodeGallery
			}
			for _, header := range headers {
				if err := add(header, mediaCode); err != nil {
					return nil, closers, err
				}
			}
		}
	}

	return files, closers, nil
}

func categoryFromContentType(contentType string) string {
	switch {
	case strings.HasPrefix(contentType, "image/"):
		return domain.ObjectCategoryImage
	case strings.HasPrefix(contentType, "video/"):
		return domain.ObjectCategoryVideo
	default:
		return domain.ObjectCategoryDocument
	}
}

func (ctrl *CampaignController) Update(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var campaign domain.Campaign
	if err := c.ShouldBindJSON(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	campaign.ID = id
	if err := ctrl.campaignUsecase.UpdateCampaign(c.Request.Context(), &campaign); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update campaign"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

func (ctrl *CampaignController) UpdateCampaignDetails(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req dto.UpdateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	updated, err := ctrl.campaignUsecase.UpdateCampaignDetails(c.Request.Context(), &req, id, session.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update campaign: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (ctrl *CampaignController) UpdateCampaignStatus(c *gin.Context) {
	campaignId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}


	var req dto.UpdateCampaignStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := ctrl.campaignUsecase.UpdateCampaignStatus(c.Request.Context(), req.Status,campaignId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update campaign"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "status updated", "status": req.Status})
}

func (ctrl *CampaignController) Delete(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	if err := ctrl.campaignUsecase.DeleteCampaign(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete campaign"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func parseUint32Param(c *gin.Context, name string) (uint32, error) {
	v, err := strconv.ParseUint(c.Param(name), 10, 32)
	if err != nil {
		return 0, err
	}
	return uint32(v), nil
}

func (ctrl *CampaignController) Close(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	if err := ctrl.campaignUsecase.CloseCampaign(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "campaign closed"})
}

func (ctrl *CampaignController) SetCampaignDate(c *gin.Context) {
	campaignId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req dto.CampaignDateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := ctrl.campaignUsecase.SetCampaignDate(c.Request.Context(), req,campaignId); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "campaign date",
		"start_date": req.StartDate,
		"end_date":   req.EndDate,
	})
}
