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

type TransactionController struct {
	transactionUsecase usecase.TransactionUsecase
	auth               gin.HandlerFunc
}

func NewTransactionController(transactionUsecase usecase.TransactionUsecase, auth gin.HandlerFunc) *TransactionController {
	return &TransactionController{transactionUsecase: transactionUsecase, auth: auth}
}

func (ctrl *TransactionController) RegisterRoutes(rg *gin.RouterGroup) {
	transactions := rg.Group("/transaction", ctrl.auth)
	{
		transactions.POST("/:id", ctrl.Create)
		transactions.POST("/pay/:id", ctrl.Pay)
		transactions.POST("/cancel/:id", ctrl.Cancel)
		transactions.GET("/:id", ctrl.GetByID)
		transactions.GET("/user/:user_id", ctrl.GetByUserID)
		transactions.GET("/user/:user_id/count", ctrl.SumByUserId)
		transactions.GET("/campaign/:campaign_id", ctrl.GetByCampaignID)
	}
}

func (ctrl *TransactionController) GetByID(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
		return
	}
	
	transaction, err := ctrl.transactionUsecase.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}

func (ctrl *TransactionController) GetByUserID(c *gin.Context) {
	userID, err := parseUint32Param(c, "user_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	transactions, err := ctrl.transactionUsecase.FindByUserID(c.Request.Context(), userID,limit,offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

func (ctrl *TransactionController) SumByUserId(c *gin.Context) {
	userID, err := parseUint32Param(c, "user_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	count, err := ctrl.transactionUsecase.CountByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not count transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (ctrl *TransactionController) GetByCampaignID(c *gin.Context) {
	campaignID, err := parseUint32Param(c, "campaign_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	transactions, err := ctrl.transactionUsecase.FindByCampaignID(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

func (ctrl *TransactionController) Create(c *gin.Context) {
	campaignId, err := parseUint32Param(c, "id")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}
	var req dto.CreateInvestmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	created, err := ctrl.transactionUsecase.CreateInvestment(c.Request.Context(), session.UserID, campaignId,&req)
	if err != nil {
		writeInvestmentError(c, err)
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (ctrl *TransactionController) Pay(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
		return
	}

	var req dto.PayInvestmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	paid, err := ctrl.transactionUsecase.PayInvestment(c.Request.Context(), session.UserID, id, req.PaymentMethod)
	if err != nil {
		writeInvestmentError(c, err)
		return
	}

	c.JSON(http.StatusOK, paid)
}

func (ctrl *TransactionController) Cancel(c *gin.Context) {
	id, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
		return
	}

	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	cancelled, err := ctrl.transactionUsecase.CancelInvestment(c.Request.Context(), session.UserID, id)
	if err != nil {
		writeInvestmentError(c, err)
		return
	}

	c.JSON(http.StatusOK, cancelled)
}

func writeInvestmentError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrInvestmentNotOwned):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrInvestmentNotPending),
		errors.Is(err, domain.ErrInvestmentNotCancellable),
		errors.Is(err, domain.ErrCancelWindowClosed),
		errors.Is(err, domain.ErrCampaignNotActive),
		errors.Is(err, domain.ErrBelowMinInvestment),
		errors.Is(err, domain.ErrExceedsFundingGoal):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
