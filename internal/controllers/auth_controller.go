package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	"github.com/SamuelLazuardy/investment/internal/infra/oauth"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"golang.org/x/oauth2"
)

const accessTokenCookieMaxAge = 86400 * 7

const oauthStateTTL = 10 * time.Minute

type AuthController struct {
	authUsecase usecase.AuthUsecase
	oauthConfig *oauth2.Config
	redis       *redis.Client
	auth        gin.HandlerFunc
}

func NewAuthController(authUsecase usecase.AuthUsecase, oauthConfig *oauth2.Config, redisClient *redis.Client, auth gin.HandlerFunc) *AuthController {
	return &AuthController{authUsecase: authUsecase, oauthConfig: oauthConfig, redis: redisClient, auth: auth}
}

func (ctrl *AuthController) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/register", ctrl.Register)
		auth.POST("/login", ctrl.Login)
		auth.GET("/google", ctrl.GoogleLogin)
		auth.GET("/google/callback", ctrl.GoogleCallback)
		auth.POST("/password", ctrl.auth, ctrl.SetPassword)
		auth.DELETE("/logout", ctrl.Logout)
		auth.GET("/me", ctrl.auth, ctrl.Me)
	}
}

func (ctrl *AuthController) Me(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	c.JSON(http.StatusOK, session)
}

func (ctrl *AuthController) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	user, err := ctrl.authUsecase.Register(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (ctrl *AuthController) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	tokens, err := ctrl.authUsecase.Login(c.Request.Context(), &req)
	if err != nil {
		fmt.Println("login failed:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password",})
		return
	}


	c.SetCookie("access_token", tokens.AccessToken, accessTokenCookieMaxAge, "/", "", cookieSecure(), true)
	c.JSON(http.StatusOK, tokens)
}

func (ctrl *AuthController) Logout(c *gin.Context) {

	token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	if token == "" {
		token, _ = c.Cookie("access_token") 
	}

	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no session currently in the client"})
		return
	}

	if err := ctrl.authUsecase.Logout(c.Request.Context(), token); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
		return
	}

	c.SetCookie("access_token", "", -1, "/", "", cookieSecure(), true)
	c.Status(http.StatusNoContent)
}

func (ctrl *AuthController) GoogleLogin(c *gin.Context) {
	
	state, err := generateState()
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not start google login"})
		return
	}

	if err := ctrl.redis.Set(c.Request.Context(), "oauth_state:"+state, 1, oauthStateTTL).Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not start google login"})
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, ctrl.oauthConfig.AuthCodeURL(state))
}

func (ctrl *AuthController) GoogleCallback(c *gin.Context) {
	frontendURL := os.Getenv("FRONTEND_URL")
	fail := func() {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/sign-in?error=google_auth_failed")
	}

	state := c.Query("state")
	code := c.Query("code")
	if state == "" || code == "" {
		fail()
		return
	}

	consumed, err := ctrl.redis.GetDel(c.Request.Context(), "oauth_state:"+state).Result()
	if err != nil || consumed == "" {
		fail()
		return
	}

	userInfo, err := oauth.GetUserInfo(c.Request.Context(), ctrl.oauthConfig, code)
	if err != nil {
		fail()
		return
	}

	tokens, err := ctrl.authUsecase.GoogleLogin(c.Request.Context(), userInfo)
	if err != nil {
		fail()
		return
	}

	c.SetCookie("access_token", tokens.AccessToken, accessTokenCookieMaxAge, "/", "", cookieSecure(), true)
	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/explore")
}

func (ctrl *AuthController) SetPassword(c *gin.Context) {
	session, ok := middleware.GetUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.SetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := ctrl.authUsecase.SetPassword(c.Request.Context(), session.UserID, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func cookieSecure() bool {
	return os.Getenv("COOKIE_SECURE") == "false"
}