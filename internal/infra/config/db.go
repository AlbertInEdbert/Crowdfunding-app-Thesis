package config

import (
	"fmt"
	"log"
	"os"

	domain "github.com/SamuelLazuardy/investment/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect() (*gorm.DB, error) {
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	DB, err := gorm.Open(postgres.Open(connString), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	return DB, nil
}

func Migrate(database *gorm.DB) error {
	log.Println("Running database migrations via GORM...")

	return database.AutoMigrate(
		&domain.Role{},
		&domain.UserAuthentication{},
		&domain.User{},
		&domain.Company{},
		&domain.Category{},
		&domain.Campaign{},
		&domain.Review{},
		&domain.Comment{},
		&domain.CommentLike{},
		&domain.CampaignMedia{},
		&domain.Highlight{},
		&domain.Updates{},
		&domain.InvestmentsH{},
		&domain.InvestmentD{},
		&domain.ShareOwnership{},
		&domain.Watchlist{},
		&domain.WatchlistUser{},
		&domain.EscrowAccount{},
	)
}
