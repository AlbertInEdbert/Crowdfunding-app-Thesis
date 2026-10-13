package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const googleUserInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	VerifiedEmail bool   `json:"verified_email"`
}

func NewGoogleConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func GetUserInfo(ctx context.Context, cfg *oauth2.Config, code string) (*GoogleUserInfo, error) {
	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("could not exchange authorization code: %w", err)
	}

	resp, err := cfg.Client(ctx, token).Get(googleUserInfoURL)
	if err != nil {
		return nil, fmt.Errorf("could not fetch Google user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google user info request failed with status %d", resp.StatusCode)
	}

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("could not decode Google user info: %w", err)
	}

	if info.ID == "" || info.Email == "" {
		return nil, fmt.Errorf("Google user info response is missing id or email")
	}

	return &info, nil
}
