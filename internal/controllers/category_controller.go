package controllers

import (
	"net/http"
	"strconv"

	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type CategoryController struct {
	categoryUsecase usecase.CategoryUsecase
	auth            gin.HandlerFunc
}

func NewCategoryController(categoryUsecase usecase.CategoryUsecase, auth gin.HandlerFunc) *CategoryController {
	return &CategoryController{categoryUsecase: categoryUsecase, auth: auth}
}

func (ctrl *CategoryController) RegisterRoutes(rg *gin.RouterGroup) {
	campaigns := rg.Group("/category")

	campaigns.GET("", ctrl.FindAllCategory)

}

func (ctrl *CategoryController) FindAllCategory(c *gin.Context) {

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	categories, err := ctrl.categoryUsecase.FindAllCategory(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve categories"})
		return
	}

	c.JSON(http.StatusOK, categories)
}

