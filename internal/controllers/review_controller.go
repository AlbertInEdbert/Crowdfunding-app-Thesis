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

type ReviewController struct {
	reviewUsecase usecase.ReviewUsecase
	auth            gin.HandlerFunc
}

func NewReviewController(reviewUsecase usecase.ReviewUsecase, auth gin.HandlerFunc) *ReviewController {
	return &ReviewController{reviewUsecase: reviewUsecase, auth: auth}
}

func (ctrl *ReviewController) RegisterRoutes(rg *gin.RouterGroup) {
	reviews := rg.Group("/review")

	reviews.GET("/:id", ctrl.FindAllReviewByCampaignId)
	reviews.POST("", ctrl.auth, ctrl.CreateReview)
	reviews.PUT("/:id", ctrl.auth, ctrl.UpdateReview)
	reviews.DELETE("/:id", ctrl.auth, ctrl.DeleteReview)
}

func (ctrl *ReviewController) FindAllReviewByCampaignId(c *gin.Context) {

	campaignId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	reviews, err := ctrl.reviewUsecase.FindAllReview(c.Request.Context(), campaignId, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve reviews"})
		return
	}

	c.JSON(http.StatusOK, reviews)
}

func (ctrl *ReviewController) CreateReview(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	review := domain.Review{
		CampaignID: req.CampaignID,
		Comment:    req.Comment,
	}

	if err := ctrl.reviewUsecase.CreateReview(c.Request.Context(), session.UserID, &review); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create review"})
		return
	}

	c.JSON(http.StatusCreated, review)
}

func (ctrl *ReviewController) UpdateReview(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid review id"})
		return
	}

	var req dto.UpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	review, err := ctrl.reviewUsecase.UpdateReview(c.Request.Context(), session.UserID, id, req.Comment)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "review not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only edit your own reviews"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update review"})
		return
	}

	c.JSON(http.StatusOK, review)
}

func (ctrl *ReviewController) DeleteReview(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid review id"})
		return
	}

	if err := ctrl.reviewUsecase.DeleteReview(c.Request.Context(), session.UserID, id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "review not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own reviews"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete review"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "review deleted"})
}

