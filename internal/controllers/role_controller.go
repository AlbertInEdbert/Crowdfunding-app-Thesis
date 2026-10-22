package controllers

import (
	"net/http"

	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
)

type RoleController struct {
	roleUsecase usecase.RoleUsecase
	auth          gin.HandlerFunc
}

func NewRoleController(roleUsecase usecase.RoleUsecase, auth gin.HandlerFunc) *RoleController {
	return &RoleController{roleUsecase: roleUsecase, auth: auth}
}

func (ctrl *RoleController) RegisterRoutes(rg *gin.RouterGroup) {
	Roles := rg.Group("/role")

	Roles.GET("/:id", ctrl.FindRoleById)
}

func (ctrl *RoleController) FindRoleById(c *gin.Context) {

	roleId, err := parseUint32Param(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role id"})
		return
	}

	role, err := ctrl.roleUsecase.FindRoleById(c.Request.Context(), roleId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve reviews"})
		return
	}

	c.JSON(http.StatusOK, role)
}
