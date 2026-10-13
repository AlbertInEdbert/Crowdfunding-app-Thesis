package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type DiscussionController struct {
	discussionUsecase usecase.DiscussionUsecase
	auth              gin.HandlerFunc
}

func NewDiscussionController(discussionUsecase usecase.DiscussionUsecase, auth gin.HandlerFunc) *DiscussionController {
	return &DiscussionController{discussionUsecase: discussionUsecase, auth: auth}
}

func (ctrl *DiscussionController) RegisterRoutes(rg *gin.RouterGroup) {
	discussions := rg.Group("/discussion")

	discussions.GET("/:id", ctrl.FindAllDiscussionByCampaignId)
	discussions.POST("", ctrl.auth, ctrl.CreateComment)
	discussions.PUT("/:id", ctrl.auth, ctrl.UpdateComment)
	discussions.DELETE("/:id", ctrl.auth, ctrl.DeleteComment)
	discussions.POST("/:id/like", ctrl.auth, ctrl.LikeComment)
	discussions.GET("/:id/like", ctrl.auth, ctrl.CheckLike)
}

func (ctrl *DiscussionController) FindAllDiscussionByCampaignId(c *gin.Context) {

	campaignId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	discussions, err := ctrl.discussionUsecase.FindAllDiscussion(c.Request.Context(), campaignId, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve discussion"})
		return
	}

	c.JSON(http.StatusOK, discussions)
}

func (ctrl *DiscussionController) CreateComment(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	discussion, err := ctrl.discussionUsecase.CreateComment(c.Request.Context(), session.UserID, &req)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "parent comment not found"})
			return
		}
		fmt.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create comment"})
		return
	}

	c.JSON(http.StatusCreated, discussion)
}

func (ctrl *DiscussionController) UpdateComment(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	var req dto.UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	discussion, err := ctrl.discussionUsecase.UpdateComment(c.Request.Context(), session.UserID, id, req.Comment)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only edit your own comments"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update comment"})
		return
	}

	c.JSON(http.StatusOK, discussion)
}

func (ctrl *DiscussionController) DeleteComment(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	if err := ctrl.discussionUsecase.DeleteComment(c.Request.Context(), session.UserID, id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own comments"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "comment deleted"})
}

func (ctrl *DiscussionController) LikeComment(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	if err := ctrl.discussionUsecase.LikeComment(c.Request.Context(), session.UserID, id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		if errors.Is(err, domain.ErrAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "you already liked this comment"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not like comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "comment liked"})
}

func (ctrl *DiscussionController) CheckLike(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	liked, err := ctrl.discussionUsecase.HasLikedComment(c.Request.Context(), session.UserID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not check like"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked})
}
