package controllers

import (
	"errors"
	"net/http"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type WatchlistController struct {
	watchlistUsecase usecase.WatchlistUsecase
	auth             gin.HandlerFunc
}

func NewWatchlistController(watchlistUsecase usecase.WatchlistUsecase, auth gin.HandlerFunc) *WatchlistController {
	return &WatchlistController{watchlistUsecase: watchlistUsecase, auth: auth}
}

func (ctrl *WatchlistController) RegisterRoutes(rg *gin.RouterGroup) {
	watchlist := rg.Group("/watchlist", ctrl.auth)

	watchlist.GET("", ctrl.ListWatchlist)
	watchlist.POST("/:campaignId", ctrl.AddToWatchlist)
	watchlist.DELETE("/:campaignId", ctrl.RemoveFromWatchlist)
	watchlist.GET("/check/:campaignId", ctrl.CheckWatchlist)
}

func (ctrl *WatchlistController) ListWatchlist(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	campaigns, err := ctrl.watchlistUsecase.List(c.Request.Context(), session.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve watchlist"})
		return
	}

	c.JSON(http.StatusOK, campaigns)
}

func (ctrl *WatchlistController) AddToWatchlist(c *gin.Context) {
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

	if err := ctrl.watchlistUsecase.Add(c.Request.Context(), session.UserID, campaignId); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
			return
		}
		if errors.Is(err, domain.ErrAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "campaign is already in your watchlist"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add to watchlist"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "campaign added to watchlist"})
}

func (ctrl *WatchlistController) RemoveFromWatchlist(c *gin.Context) {
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

	if err := ctrl.watchlistUsecase.Remove(c.Request.Context(), session.UserID, campaignId); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "campaign is not in your watchlist"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not remove from watchlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "campaign removed from watchlist"})
}

func (ctrl *WatchlistController) CheckWatchlist(c *gin.Context) {
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

	watchlisted, err := ctrl.watchlistUsecase.IsWatchlisted(c.Request.Context(), session.UserID, campaignId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not check watchlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"watchlisted": watchlisted})
}
