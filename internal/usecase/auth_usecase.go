package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/SamuelLazuardy/investment/internal/delivery/http/dto"
	"github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/infra/oauth"
	"github.com/SamuelLazuardy/investment/internal/repository"
	"github.com/SamuelLazuardy/investment/internal/util"
)

type AuthUsecase interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*domain.User, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.TokenPair, error)
	Logout(ctx context.Context, token string) (error)
	GoogleLogin(ctx context.Context, userInfo *oauth.GoogleUserInfo) (*dto.TokenPair, error)
	SetPassword(ctx context.Context, userID uint32, req *dto.SetPasswordRequest) error
}

type authUsecase struct {
	userRepo     repository.UserRepository
	tokenUtil    *util.TokenUtil
	userAuthRepo repository.UserAuthenticationRepository
}

func NewAuthUsecase(userRepo repository.UserRepository, userAuthRepo repository.UserAuthenticationRepository, tokenUtil *util.TokenUtil) AuthUsecase {
	return &authUsecase{
		userRepo:     userRepo,
		tokenUtil:    tokenUtil,
		userAuthRepo: userAuthRepo,
	}
}

func (u *authUsecase) Register(ctx context.Context, req *dto.RegisterRequest) (*domain.User, error) {
	existing, _ := u.userRepo.FindByEmail(ctx, req.Email)
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("could not hash password: %w", err)
	}

	user := &domain.User{
		Email:     req.Email,
		Password:  string(hashed),
		Name:      req.Name,
		RoleID:    7,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("user could not be created: %w", err)
	}

	return user, nil
}

func (u *authUsecase) Login(ctx context.Context, req *dto.LoginRequest) (*dto.TokenPair, error) {
	user, err := u.userRepo.FindByEmail(ctx, req.Email)
	if err != nil || user == nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if user.Password == "" {
		return nil, fmt.Errorf("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	accessToken, err := u.tokenUtil.CreateToken(ctx, &domain.Session{UserID: user.ID,RoleID: user.RoleID})
	if err != nil {
		return nil, fmt.Errorf("Failed to create token : %+v", err)
	}

	return &dto.TokenPair{AccessToken: accessToken}, nil
}

func (u *authUsecase) Logout(ctx context.Context, token string) (error){


	err := u.tokenUtil.DeleteSession(ctx, token)

	if(err != nil){
		return err
	}

	return  nil
}

func (u *authUsecase) SetPassword(ctx context.Context, userID uint32, req *dto.SetPasswordRequest) error {
	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user could not be loaded: %w", err)
	}

	if user.Password != "" {
		return fmt.Errorf("password already set")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("could not hash password: %w", err)
	}

	user.Password = string(hashed)
	user.UpdatedAt = time.Now()
	if err := u.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("password could not be set: %w", err)
	}

	return nil
}

func (u *authUsecase) GoogleLogin(ctx context.Context, info *oauth.GoogleUserInfo) (*dto.TokenPair, error) {
	if !info.VerifiedEmail {
		return nil, fmt.Errorf("google email is not verified")
	}

	user, err := u.findOrCreateGoogleUser(ctx, info)
	if err != nil {
		return nil, err
	}

	session := &domain.Session{
		UserID: user.ID,
		RoleID: user.RoleID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(72 * time.Hour),
	}

	accessToken, err := u.tokenUtil.CreateToken(ctx,session )
	if err != nil {
		return nil, fmt.Errorf("failed to create token: %w", err)
	}

	return &dto.TokenPair{AccessToken: accessToken}, nil
}

func (u *authUsecase) findOrCreateGoogleUser(ctx context.Context, info *oauth.GoogleUserInfo) (*domain.User, error) {
	link, err := u.userAuthRepo.FindByProviderIdentity(ctx, "google", info.ID)
	if err == nil {
		user, err := u.userRepo.FindByID(ctx, link.UserID)
		if err != nil {
			return nil, fmt.Errorf("linked user could not be loaded: %w", err)
		}
		return user, nil
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("could not look up google identity: %w", err)
	}

	user, err := u.userRepo.FindByEmail(ctx, info.Email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("could not look up user by email: %w", err)
	}

	if user == nil {
		user = &domain.User{
			Email:      info.Email,
			Name:       info.Name,
			Password:   "",
			RoleID:     7,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if err := u.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("user could not be created: %w", err)
		}
	}

	link = &domain.UserAuthentication{
		Provider:       "google",
		ProviderUserID: info.ID,
		UserID:         user.ID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	if err := u.userAuthRepo.Create(ctx, link); err != nil {
		return nil, fmt.Errorf("google identity could not be linked: %w", err)
	}

	return user, nil
}
