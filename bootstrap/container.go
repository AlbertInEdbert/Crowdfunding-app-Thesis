package bootstrap

import (
	"github.com/SamuelLazuardy/investment/internal/adapter/mockpay"
	"github.com/SamuelLazuardy/investment/internal/controllers"
	"github.com/SamuelLazuardy/investment/internal/delivery/http/middleware"
	"github.com/SamuelLazuardy/investment/internal/domain"
	"github.com/SamuelLazuardy/investment/internal/infra/oauth"
	"github.com/SamuelLazuardy/investment/internal/jobs"
	"github.com/SamuelLazuardy/investment/internal/repository"
	"github.com/SamuelLazuardy/investment/internal/usecase"
	"github.com/SamuelLazuardy/investment/internal/util"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type Container struct {
	Controllers []controllers.Controller
	Jobs        []jobs.Job
}

type repositories struct {
	company        repository.CompanyRepository
	user           repository.UserRepository
	campaign       repository.CampaignRepository
	investmentsH   repository.InvestmentsHRepository
	investmentD    repository.InvestmentDRepository
	userAuth       repository.UserAuthenticationRepository
	escrow         domain.EscrowAccountRepository
	shareOwnership repository.ShareOwnershipRepository
	category       repository.CategoryRepository
	discussion     repository.DiscussionRepository
	review         repository.ReviewRepository
	updates        repository.UpdatesRepository
	watchlist      repository.WatchlistRepository
	storage        repository.StorageRepository
	campaignMedia  repository.CampaignMediaRepository
	highlight      repository.HighlightRepository
	role           repository.RoleRepository
}

type usecases struct {
	user        usecase.UserUsecase
	auth        usecase.AuthUsecase
	storage     usecase.StorageUsecase
	email       usecase.SendEmailUsecase
	company     usecase.CompanyUsecase
	campaign    usecase.CampaignUsecase
	transaction usecase.TransactionUsecase
	category    usecase.CategoryUsecase
	discussion  usecase.DiscussionUsecase
	review      usecase.ReviewUsecase
	updates     usecase.UpdatesUsecase
	watchlist   usecase.WatchlistUsecase
	portfolio   usecase.PortfolioUsecase
	role        usecase.RoleUsecase
}

func NewContainer(db *gorm.DB, redisClient *redis.Client, s3Client *s3.Client, r2Bucket string, emailSender domain.EmailSender) *Container {
	repos := initRepositories(db, s3Client, r2Bucket)

	tokenUtil := util.NewTokenUtil(redisClient)
	googleOAuthConfig := oauth.NewGoogleConfig()
	paymentGateway := mockpay.NewGateway()

	ucs := initUsecases(db, repos, tokenUtil, paymentGateway, emailSender)
	authMiddleware := middleware.NewAuth(tokenUtil)

	return &Container{
		Controllers: initControllers(ucs, authMiddleware, googleOAuthConfig, redisClient),
		Jobs:        initJobs(ucs),
	}
}

func initRepositories(db *gorm.DB, s3Client *s3.Client, r2Bucket string) repositories {
	return repositories{
		company:        repository.NewCompanyRepository(db),
		user:           repository.NewUserRepository(db),
		campaign:       repository.NewCampaignRepository(db),
		investmentsH:   repository.NewInvestmentsHRepository(db),
		investmentD:    repository.NewInvestmentDRepository(db),
		userAuth:       repository.NewUserAuthenticationRepository(db),
		escrow:         repository.NewEscrowAccountRepository(db),
		shareOwnership: repository.NewShareOwnershipRepository(db),
		category:       repository.NewCategoriesRepository(db),
		discussion:     repository.NewDiscussionRepository(db),
		review:         repository.NewReviewRepository(db),
		updates:        repository.NewUpdatesRepository(db),
		watchlist:      repository.NewWatchlistRepository(db),
		storage:        repository.NewStorageRepository(s3Client, r2Bucket, ""),
		campaignMedia:  repository.NewCampaignMediaRepository(db),
		highlight:      repository.NewHighlightRepository(db),
		role:           repository.NewRoleRepository(db),
	}
}

func initUsecases(db *gorm.DB, repos repositories, tokenUtil *util.TokenUtil, paymentGateway domain.PaymentGateway, emailSender domain.EmailSender) usecases {
	storageUsecase := usecase.NewStorageUsecase(repos.storage, repos.campaignMedia)
	emailUsecase := usecase.NewSendEmailUsecase(emailSender)
	return usecases{
		user:        usecase.NewUserUsecase(repos.user),
		auth:        usecase.NewAuthUsecase(repos.user, repos.userAuth, tokenUtil, emailUsecase),
		storage:     storageUsecase,
		email:       emailUsecase,
		company:     usecase.NewCompanyUsecase(repos.company, repos.user, storageUsecase),
		campaign:    usecase.NewCampaignUsecase(db, repos.campaign, repos.highlight, repos.campaignMedia, repos.company, repos.user, repos.investmentsH, repos.escrow, repos.watchlist, storageUsecase, emailUsecase),
		transaction: usecase.NewTransactionUsecase(db, repos.investmentsH, repos.investmentD, repos.campaign, repos.escrow, repos.shareOwnership, repos.user, paymentGateway),
		category:    usecase.NewCategoryUsecase(repos.category),
		discussion:  usecase.NewDiscussionUsecase(repos.discussion),
		review:      usecase.NewReviewUsecase(repos.review),
		updates:     usecase.NewUpdatesUsecase(repos.updates, repos.campaign, repos.company),
		watchlist:   usecase.NewWatchlistUsecase(repos.watchlist, repos.campaign),
		portfolio:   usecase.NewPortfolioUsecase(repos.investmentsH, repos.shareOwnership, repos.campaign, repos.company),
		role:        usecase.NewRoleUsecase(repos.role),
	}
}

func initControllers(ucs usecases, authMiddleware gin.HandlerFunc, googleOAuthConfig *oauth2.Config, redisClient *redis.Client) []controllers.Controller {
	return []controllers.Controller{
		controllers.NewUserController(ucs.user, authMiddleware),
		controllers.NewCompanyController(ucs.company, authMiddleware),
		controllers.NewAuthController(ucs.auth, googleOAuthConfig, redisClient, authMiddleware),
		controllers.NewCampaignController(ucs.campaign, authMiddleware),
		controllers.NewTransactionController(ucs.transaction, authMiddleware),
		controllers.NewCategoryController(ucs.category, authMiddleware),
		controllers.NewStorageController(ucs.storage, authMiddleware),
		controllers.NewDiscussionController(ucs.discussion, authMiddleware),
		controllers.NewReviewController(ucs.review, authMiddleware),
		controllers.NewUpdatesController(ucs.updates, authMiddleware),
		controllers.NewWatchlistController(ucs.watchlist, authMiddleware),
		controllers.NewPortfolioController(ucs.portfolio, authMiddleware),
		controllers.NewRoleController(ucs.role, authMiddleware),
	}
}

func initJobs(ucs usecases) []jobs.Job {
	return []jobs.Job{
		jobs.NewCampaignJob(ucs.campaign),
	}
}
