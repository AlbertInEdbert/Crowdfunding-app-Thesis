package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/SamuelLazuardy/investment/bootstrap"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/route"
	"github.com/SamuelLazuardy/investment/internal/infra/config"
	"github.com/gin-gonic/gin"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("no .env file found, using existing env vars")
	}

	gormDB, err := config.Connect()
	if err != nil {
		log.Fatalf("could not connect to database: %v", err)
	}

	log.Println("connected to Neon successfully via GORM")

	var greeting string
	err = gormDB.Raw("SELECT 'hello from neon via GORM'").Scan(&greeting).Error
	if err != nil {
		log.Fatalf("query failed: %v", err)
	}
	log.Println(greeting)

	if err = config.Migrate(gormDB); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migration completed successfully!")

	r := gin.Default()

	redisClient, err := config.ConnectRedis()
	if err != nil {
		log.Fatalf("could not connect to database: %v", err)
	}

	cfg := config.LoadStorageConfig()
	r2Client := config.NewR2Client(cfg)
	
	c := bootstrap.NewContainer(gormDB, redisClient, r2Client, os.Getenv("R2_BUCKET_NAME"))
	router.SetupRouter(r, c.Controllers...)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	for _, j := range c.Jobs {
		j.RegisterJobs(ctx)
	}

	srv := &http.Server{Addr: ":8080", Handler: r}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Println("shutdown error:", err)
	}
}
