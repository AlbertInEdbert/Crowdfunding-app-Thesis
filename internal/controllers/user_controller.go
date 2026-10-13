package controllers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type UserController struct {
	userUsecase usecase.UserUsecase
	auth        gin.HandlerFunc
}

func NewUserController(userUsecase usecase.UserUsecase, auth gin.HandlerFunc) *UserController {
	return &UserController{userUsecase: userUsecase, auth: auth}
}

func (ctrl *UserController) RegisterRoutes(rg *gin.RouterGroup) {
	users := rg.Group("/users", ctrl.auth)
	{
		users.GET("/:id", ctrl.GetByID)
		users.POST("", ctrl.Create)
		users.PUT("", ctrl.UpdateProfile)
	}
}

func (ctrl *UserController) UpdateProfile(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	user, err := ctrl.userUsecase.UpdateProfile(c.Request.Context(), session.UserID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (ctrl *UserController) GetByID(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := ctrl.userUsecase.GetUserProfile(c.Request.Context(), uint32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (ctrl *UserController) Create(c *gin.Context) {
	var user domain.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := ctrl.userUsecase.RegisterNewUser(c.Request.Context(), &user); err != nil {
		log.Printf("[UserController.Create] Business logic error: %v", err)
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}
