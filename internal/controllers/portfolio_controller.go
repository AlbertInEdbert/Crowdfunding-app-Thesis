package controllers

import (
	"net/http"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type PortfolioController struct {
	portfolioUsecase usecase.PortfolioUsecase
	auth             gin.HandlerFunc
}

func NewPortfolioController(portfolioUsecase usecase.PortfolioUsecase, auth gin.HandlerFunc) *PortfolioController {
	return &PortfolioController{portfolioUsecase: portfolioUsecase, auth: auth}
}

func (ctrl *PortfolioController) RegisterRoutes(rg *gin.RouterGroup) {
	portfolio := rg.Group("/portfolio")

	portfolio.GET("", ctrl.auth, ctrl.GetPortfolio)
}

func (ctrl *PortfolioController) GetPortfolio(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	items, err := ctrl.portfolioUsecase.GetUserPortfolio(c.Request.Context(), session.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve portfolio"})
		return
	}

	c.JSON(http.StatusOK, items)
}
