package controllers

import (
	"net/http"
	"strconv"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type StorageController struct {
	storageUsecase usecase.StorageUsecase
	auth           gin.HandlerFunc
}

func NewStorageController(storageUsecase usecase.StorageUsecase, auth gin.HandlerFunc) *StorageController {
	return &StorageController{storageUsecase: storageUsecase, auth: auth}
}

func (ctrl *StorageController) RegisterRoutes(rg *gin.RouterGroup) {
	storage := rg.Group("/storage")
	storage.GET("/url", ctrl.GetURL)
	storage.GET("/media", ctrl.GetMedia)

	protected := storage.Group("", ctrl.auth)
	{
		protected.POST("/upload",  ctrl.Upload)
		protected.DELETE("",  ctrl.Delete)
	}
}

func (ctrl *StorageController) Upload(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read file"})
		return
	}
	defer file.Close()

	folder := c.DefaultPostForm("folder", "")
	category := c.DefaultPostForm("category", "document")
	mediaCode := c.PostForm("media_code")
	contentType := fileHeader.Header.Get("Content-Type")

	var campaignID uint32
	if raw := c.PostForm("campaign_id"); raw != "" {
		id, err := strconv.ParseUint(raw, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign_id"})
			return
		}
		campaignID = uint32(id)
	}

	object, err := ctrl.storageUsecase.Upload(
		c.Request.Context(),
		usecase.UploadInput{
			UserID:      session.UserID,
			CampaignID:  campaignID,
			MediaCode:   mediaCode,
			Category:    category,
			Folder:      folder,
			File:        file,
			FileName:    fileHeader.Filename,
			FileSize:    fileHeader.Size,
			ContentType: contentType,
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, object)
}

func (ctrl *StorageController) GetMedia(c *gin.Context) {
	if raw := c.Query("company_id"); raw != "" {
		id, err := strconv.ParseUint(raw, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid company_id"})
			return
		}

		objects, err := ctrl.storageUsecase.GetMediaByCompany(c.Request.Context(), uint32(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, objects)
		return
	}

	id, err := strconv.ParseUint(c.Query("campaign_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign_id"})
		return
	}

	objects, err := ctrl.storageUsecase.GetMediaByCampaign(c.Request.Context(), uint32(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, objects)
}

func (ctrl *StorageController) GetURL(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key is required"})
		return
	}

	url, err := ctrl.storageUsecase.GetDownloadURL(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (ctrl *StorageController) Delete(c *gin.Context) {
	key := c.Query("key")

	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "key is required",
		})
		return
	}

	if err := ctrl.storageUsecase.Delete(c.Request.Context(), key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}
