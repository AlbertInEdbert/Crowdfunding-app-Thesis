package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/util"
	"github.com/gin-gonic/gin"
)

const ContextKeyUserID = "userID"

func NewAuth(tokenUtil *util.TokenUtil) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		token := strings.TrimPrefix(ctx.GetHeader("Authorization"), "Bearer ")
		if token == "" {
			token, _ = ctx.Cookie("access_token")
		}

		auth, err := tokenUtil.GetSession(ctx.Request.Context(), token)
		if err != nil {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "unauthorized",
			})
			return
		}
		ctx.Set("auth", auth)
		ctx.Next()
	}
}

func GetUser(ctx *gin.Context) (*domain.Session, bool) {
    auth, exists := ctx.Get("auth")
	fmt.Println(auth)
    if !exists {
        return nil, false
    }

    session, ok := auth.(*domain.Session)
	fmt.Println(session)
    if !ok {
        return nil, false
    }

    return session, true
}