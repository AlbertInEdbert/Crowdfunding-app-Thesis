package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type UpdatesController struct {
	updatesUsecase usecase.UpdatesUsecase
	auth           gin.HandlerFunc
}

func NewUpdatesController(updatesUsecase usecase.UpdatesUsecase, auth gin.HandlerFunc) *UpdatesController {
	return &UpdatesController{updatesUsecase: updatesUsecase, auth: auth}
}

func (ctrl *UpdatesController) RegisterRoutes(rg *gin.RouterGroup) {
	updates := rg.Group("/updates")

	updates.GET("/campaign/:campaignId", ctrl.FindUpdatesByCampaignId)
	updates.GET("", ctrl.auth, ctrl.FindUpdatesByUserId)
	updates.POST("/campaign/:campaignId", ctrl.auth, ctrl.CreateUpdate)
	updates.PUT("/:id", ctrl.auth, ctrl.UpdateUpdate)
	updates.DELETE("/:id", ctrl.auth, ctrl.DeleteUpdate)
}

func (ctrl *UpdatesController) FindUpdatesByCampaignId(c *gin.Context) {
	campaignId, err := parseUint32Param(c, "campaignId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	updates, err := ctrl.updatesUsecase.FindCampaignUpdates(c.Request.Context(), campaignId, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve updates"})
		return
	}
	c.JSON(http.StatusOK, updates)
}

func (ctrl *UpdatesController) FindUpdatesByUserId(c *gin.Context) {

	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	cursor, _ := strconv.ParseUint(c.DefaultQuery("cursor", "0"), 10, 32)

	updates, nextCursor, err := ctrl.updatesUsecase.FindUpdatesByUserIdCursor(c.Request.Context(), session.UserID, uint32(cursor), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve updates"})
		return
	}
	if updates == nil {
		updates = []domain.Updates{}
	}

	c.JSON(http.StatusOK, gin.H{"data": updates, "next_cursor": nextCursor})
}

func (ctrl *UpdatesController) CreateUpdate(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaignId, err := parseUint32Param(c, "campaignId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req dto.CreateUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	update, err := ctrl.updatesUsecase.CreateUpdate(c.Request.Context(), session.UserID, campaignId, req.Title, req.Content)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "only the campaign owner can post updates"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create update"})
		return
	}

	c.JSON(http.StatusCreated, update)
}

func (ctrl *UpdatesController) UpdateUpdate(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid update id"})
		return
	}

	var req dto.UpdateUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	update, err := ctrl.updatesUsecase.UpdateUpdate(c.Request.Context(), session.UserID, id, req.Title, req.Content)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "update not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "only the campaign owner can edit updates"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update update"})
		return
	}

	c.JSON(http.StatusOK, update)
}

func (ctrl *UpdatesController) DeleteUpdate(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid update id"})
		return
	}

	if err := ctrl.updatesUsecase.DeleteUpdate(c.Request.Context(), session.UserID, id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "update not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "only the campaign owner can delete updates"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete update"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "update deleted"})
}
