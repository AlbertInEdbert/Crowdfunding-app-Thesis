package router

import (
	"github.com/SamuelLazuardy/investment/internal/controllers"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	"github.com/gin-gonic/gin"
)

func SetupRouter(r *gin.Engine, ctrls ...controllers.Controller) {
	r.RemoveExtraSlash = true
	r.Use(middleware.CORS())

	api := r.Group("/api/v1")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "pong"})
		})

		for _, ctrl := range ctrls {
			ctrl.RegisterRoutes(api)
		}
	}
}
