# AGENTS.md

This file is a living guide for AI coding agents working on this project. It describes the current architecture, build process, conventions, and known caveats based on the actual repository contents.

## Project overview

This is a **full-stack investment/crowdfunding application** split into two parts:

- **Backend:** a Go HTTP API using the Gin framework, GORM, and PostgreSQL.
- **Frontend:** a Next.js 16 React application using Tailwind CSS v4 and shadcn/ui components.

The project root contains the Go backend, while the Next.js frontend lives in the `invest/` subdirectory. The two pieces are not currently integrated by a shared build script; they are developed and run independently.

## Repository layout

```
D:/Thesis/application
├── .env                         # Environment variables (DATABASE_URL, JWT_SECRET, etc.)
├── .gitignore                   # Standard Node/Go ignore list
├── go.mod / go.sum              # Go module definition
├── cmd/main.go                  # Go application entry point
├── bootstrap/                   # Composition root / dependency wiring
│   ├── app.go
│   └── container.go
└── internal/                    # Go backend source
    ├── controllers/             # HTTP handlers (Gin)
    ├── delivery/http/           # Router, middleware, and dto/ (request/response structs)
    ├── domain/                  # Entity models, domain errors, and repository ports (interfaces)
    ├── infra/                   # DB config, migrations, Google OAuth2
    ├── repository/              # GORM adapters implementing the domain ports
    └── usecase/                 # Business logic / service layer

invest/                          # Next.js frontend
├── app/                         # Next.js App Router pages
├── components/                  # React components
│   ├── share/                   # Shared/page-level components
│   └── ui/                      # shadcn/ui primitive components
├── lib/utils.ts                 # Tailwind class merge helper
├── package.json                 # npm dependencies and scripts
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── postcss.config.mjs           # PostCSS configuration (Tailwind v4)
├── app/globals.css              # Tailwind v4 CSS entry
├── components.json              # shadcn/ui configuration
└── eslint.config.mjs            # ESLint flat config
```

## Technology stack

### Backend

| Layer | Technology |
|-------|------------|
| Language | Go 1.25.0 |
| HTTP framework | Gin v1.12.0 |
| ORM | GORM v1.31.2 |
| Database driver | `gorm.io/driver/postgres` v1.6.0 |
| Database | PostgreSQL (currently configured for Neon via `DATABASE_URL`) |
| Authentication | Opaque session tokens (crypto/rand) stored in Redis (`go-redis/v9`) |
| Config loader | `github.com/joho/godotenv` |

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Runtime | React 19.2.3, React DOM 19.2.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui (radix-nova style) + Radix UI |
| Carousel | `embla-carousel-react` |
| Rich text | Editor.js (`@editorjs/editorjs` + `@editorjs/header` + `@editorjs/list`), wrapped client-only in `components/share/RichTextEditor.tsx` (dynamically imported in `useEffect` to stay SSR-safe) |
| Database/ORM (planned) | `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit` |

## Backend architecture

The backend follows a layered hexagonal-ish architecture:

1. **Domain** (`internal/domain/`): GORM model structs, table-name overrides, domain errors (e.g., `ErrNotFound`, `ErrAlreadyExists`), and the **repository ports** — one `XRepository` interface per entity, declared in the entity's own file (e.g., `UserRepository` in `user.go`). Money fields are intentionally `int64` (smallest currency unit) to avoid floating-point rounding. Some models expose business-rule methods (e.g., `Campaign.CanAcceptInvestment`, `Campaign.ApplyInvestment`, `EscrowAccount.Credit/Release/RefundAll`). There is **no wallet**: investors pay per transaction through the `domain.PaymentGateway` port (`internal/domain/payment.go`), currently implemented by the simulated always-successful adapter in `internal/adapter/mockpay/` — swap in a real gateway (Midtrans/Xendit) by implementing the same port. Investment statuses are `PENDING_PAYMENT → PAID → REFUNDED` or `→ CANCELLED`; escrow statuses are `HOLDING → RELEASED` or `→ REFUNDED`.
2. **Repository** (`internal/repository/`): GORM **adapters** implementing the domain ports. Constructors return the domain interface (e.g., `NewUserRepository(db) domain.UserRepository`) and each file carries a compile-time assertion (`var _ domain.UserRepository = (*userRepository)(nil)`). A generic `BaseRepository[T, ID]` provides CRUD for single-ID tables; tables with composite keys (e.g., `WatchlistUser`) implement their own repositories. Repositories that participate in multi-entity money updates (`Campaign`, `InvestmentsH`, `InvestmentD`, `ShareOwnership`, `EscrowAccount`) expose `WithTx(tx *gorm.DB)` so usecases can run them inside one `db.Transaction`; `CampaignRepository.FindByIDForUpdate` adds a `SELECT ... FOR UPDATE` row lock. `session_repository.go` is an in-memory adapter for `domain.SessionRepository` (not wired in bootstrap).
3. **Usecase** (`internal/usecase/`): Business logic layer. Interfaces are defined here and injected into controllers. Usecases depend only on `internal/domain` — never on `internal/repository`.
4. **Controllers** (`internal/controllers/`): Gin HTTP handlers. Each controller implements `Controller` with `RegisterRoutes(rg *gin.RouterGroup)` so the router can mount them generically.
5. **Delivery** (`internal/delivery/http/`): Gin router setup under `/api/v1` and the session authentication middleware (`middleware.NewAuth`), which accepts the token from the `access_token` cookie or an `Authorization: Bearer` header, resolves it against Redis via `util.TokenUtil.GetSession`, and stores the `*domain.Session` in the Gin context under `"auth"` (read via `middleware.GetUser`).
6. **Infra** (`internal/infra/`): Database connection/migration (`config`) and Google OAuth2 support (`oauth` — builds the `oauth2.Config` from env and fetches the Google userinfo profile).
7. **Bootstrap** (`bootstrap/`): The **composition root** — the single place the object graph is assembled. `NewContainer(db, redisClient, s3Client, r2Bucket)` builds repositories → usecases → controllers/jobs via small private helpers (`initRepositories`, `initUsecases`, `initControllers`, `initJobs`) and returns a `Container` holding `Controllers []controllers.Controller` and `Jobs []jobs.Job`. `cmd/main.go` opens the infrastructure connections, calls `NewContainer`, then registers controllers and jobs in loops. Config (e.g. `R2_BUCKET_NAME`) is read in `main` and passed in as parameters — the container does not read env vars itself.

### Current bootstrapped controllers

`bootstrap/container.go` (`initControllers`) currently registers:

- `AuthController` → `/api/v1/auth` (register, login, logout — public; login sets the `access_token` cookie with a 24h max-age, and logout deletes the Redis session and clears the cookie). Login issues an **opaque session token** (`util.TokenUtil.CreateToken`): a 256-bit random hex string stored in Redis as `session:<token>` → session JSON (30-day TTL), plus a `session:user:<userID>` → token reverse index enforcing one active session per user. Also implements Google OAuth2 sign-in: `GET /auth/google` stores a single-use state value in Redis and redirects to Google's consent page; `GET /auth/google/callback` validates the state, exchanges the code for the Google profile (`internal/infra/oauth`), signs the user in via `AuthUsecase.GoogleLogin` (find-or-create: existing Google identity link → existing account with the same email → new user + identity link in `user_authentication`), sets the cookie, and redirects to `FRONTEND_URL/home` (or `FRONTEND_URL/sign-in?error=google_auth_failed` on failure). `GET /auth/me` (auth) returns the current `domain.Session` so the frontend can resolve the user id (the cookie is HttpOnly).
- `CompanyController` → `/api/v1/company` (get by user ID, create — both require auth; create forces `UserID` from the token). Create is `POST ""` (exact path `/api/v1/company`, no trailing slash — registering `/` caused a Gin 307 redirect that browsers reject as a CORS failure) taking **multipart/form-data**: text parts `name` (required), `description`, `categoryId` (bound via form tags on `dto.CreateCompanyRequest` with `c.ShouldBind`, not `ShouldBindJSON`), plus one file per **typed field name** — the field name becomes the `media_code` verbatim (the frontend sends company documents as `AKTA`, `SK`, `NIB`, `NPWP` parts), uploaded through `StorageUsecase.Upload` with `CompanyID` set on the `campaign_media` rows. The generic `files` field is ignored by the company collector to avoid storing the same file twice.
- `UserController` → `/api/v1/users` (get by ID, create, `PUT ""` — update own profile: name and phone only, resolved from the session; the password hash is stripped from the response — all require auth)
- `CampaignController` → `/api/v1/campaigns` (full CRUD plus filtered lists; GET routes are public, POST/PUT/DELETE require auth). `POST /campaign/:companyId` (create) takes a single **multipart/form-data** request: the campaign fields as text parts (`title`, `description`, `valuation`, `funding_goal`, `min_investment`, `share_price`, `start_date`, `end_date` — dates as RFC3339) plus optional file parts (`cover` — one file, registered with `media_code` `cover`; `thumbnail` and `video` similarly; `files` — repeatable, registered with `media_code` `gallery`). Any **other** file field name is used as the `media_code` verbatim (e.g. a part named `license` gets `media_code` `license`), so the frontend controls the code by choosing the field name. The usecase creates the campaign row first, then uploads each file via `StorageUsecase.Upload` with `CampaignID` set. Also `POST /campaign/:id/close` (auth) settles an ended campaign in one DB transaction: fully funded → escrow `RELEASED` + campaign `COMPLETED`; otherwise every `PAID` investment is marked `REFUNDED`, the escrow is zeroed (`REFUNDED`), and the campaign becomes `FAILED`. Ownership/role checks on this endpoint are not implemented yet.
- `TransactionController` → `/api/v1/transactions` (wallet-free direct-payment investment flow — all routes require auth). `POST ""` creates a `PENDING_PAYMENT` investment from `dto.CreateInvestmentRequest` (`campaign_id` + `share_count`; amount, price per unit, subtotal, and transaction number are computed server-side from the campaign's share price; the transaction number is a per-user sequential `INV-<userID>-<seq>` drawn from `User.TxCounter`, incremented atomically via `UserRepository.IncrementTxCounter` — `UPDATE ... RETURNING` inside the same DB transaction, which row-locks the user and serializes concurrent investments so numbers never collide). `POST /:id/pay` settles it through the simulated `domain.PaymentGateway` (`internal/adapter/mockpay`) and in one DB transaction: locks the campaign row (`SELECT ... FOR UPDATE`, prevents overselling), applies the funding (`Campaign.ApplyInvestment`), credits the campaign's `EscrowAccount` (created on first payment), upserts `ShareOwnership`, and marks the investment `PAID`. `POST /:id/cancel` cancels a `PENDING_PAYMENT` or `PAID` investment, but not within 3 days of the campaign end date (`domain.ErrCancelWindowClosed`); cancelling a `PAID` investment reverses its effects in one DB transaction (`Campaign.ReverseInvestment` rolls back funding/investor count and un-flips `FUNDED`→`ACTIVE`, `EscrowAccount.Debit` refunds the escrow balance, `ShareOwnership` is decremented by the investment's share count). Pay/cancel verify the investment belongs to the token user. List/get routes are unchanged.
- `StorageController` → `/api/v1/storage` (object-storage file registry; uploads/deletes require auth, GET routes are public). `POST /upload` (multipart form: `file` + optional `category` (`document`/`image`/`video`, default `document`) and `folder`) streams the file to Cloudflare R2 via `repository.StorageRepository` and records it in the `campaign_media` registry table (`domain.CampaignMedia`: uploader, category, R2 object key, filename, content type, size, plus **nullable** FK columns `campaignid` and `companyid` — a row links to a campaign or a company, and an unset link is written as SQL NULL so it never violates the foreign keys). If the registry insert fails the just-uploaded object is deleted from R2 to avoid orphans. `GET /url?key=...` returns a 15-minute presigned GET URL (the bucket is private). `GET /media?campaign_id=...` (or `?company_id=...`) returns every media object linked to a campaign/company, each with a fresh presigned `URL` baked in (same 15-minute expiry) so the frontend renders/downloads in one call; both GET routes are public so unauthenticated visitors can view campaign media (object keys remain unguessable, and uploads/deletes stay behind auth). `DELETE ?key=...` removes the object from R2. `CampaignUsecase.CreateCampaign` also uploads the files attached to the create-campaign request through `StorageUsecase.Upload` (each `campaign_media` row gets `CampaignID` set), and `CompanyUsecase.RegisterNewCompany` does the same for company registration documents (each row gets `CompanyID` set), so campaign and company files are recorded in the same registry. The old document-specific stack (`domain.Document`, `DocumentRepository`, `DocumentUsecase`, `DocumentController`) was replaced by this generic registry; the old `document` table may still exist in the database unused (AutoMigrate never drops tables).
- `ReviewController` → `/api/v1/review` (same shape as `DiscussionController` but without replies). `GET /:id` (public) lists reviews for a campaign with `limit`/`offset` pagination and preloads the reviewer's `id`/`name`; `POST ""`, `PUT /:id`, and `DELETE /:id` require auth and enforce that only the review's author can edit/delete it (`domain.ErrForbidden` otherwise).
- `UpdatesController` → `/api/v1/updates` (campaign progress updates posted by the campaign owner). `GET /campaign/:campaignId` (public) lists a campaign's updates newest-first with `limit`/`offset` pagination; `POST /campaign/:campaignId`, `PUT /:id`, and `DELETE /:id` require auth and enforce that the session user owns the company that owns the campaign (the usecase loads the campaign → its company → compares `company.UserID` with the session user, returning `domain.ErrForbidden` on mismatch and `domain.ErrNotFound` for missing campaigns/updates). `UpdatesRepository` is a domain port (like `EscrowAccountRepository`); the repository adapter sets `CreatedAt`/`UpdateAt` manually with `time.Now()` because GORM does not auto-maintain the non-standard `UpdateAt` field, and the response JSON is PascalCase since `domain.Updates` has no json tags.
- `PortfolioController` → `/api/v1/portfolio` (auth). `GET ""` returns the session user's portfolio grouped per campaign: each item carries the campaign id/title/status/end date, the owning company id/name, `total_shares` (from `ShareOwnership`), `total_invested` (sum of `PAID` amounts), `pending_amount` (sum of `PENDING` amounts), and the individual investments (id, transaction number, amount, status, share count, created_at). Built by `PortfolioUsecase` from `InvestmentsH` + `ShareOwnership` + `Campaign` + `Company`; response uses snake_case json tags (`dto.PortfolioItem`).
- `WatchlistController` → `/api/v1/watchlist` (per-user campaign watchlist — ALL routes require auth, applied to the whole group). `GET ""` lists the session user's watchlisted campaigns as full `domain.Campaign` objects (always an initialized array, never null; entries whose campaign was deleted are skipped); `POST /:campaignId` adds (201, 404 if the campaign is missing, 409 `ErrAlreadyExists` on duplicate); `DELETE /:campaignId` removes (200, 404 if not watchlisted); `GET /check/:campaignId` returns `{"watchlisted": bool}`. `WatchlistRepository` is a domain port declared in `domain/watchlist.go`; the adapter (`repository/watchlist_repository.go`) does not use `BaseRepository` because each add/remove spans both tables in one `db.Transaction`: one `watchlist` row (with `AddedAt` set manually — GORM auto-maintains `CreatedAt`/`UpdatedAt` but not `AddedAt`) plus one composite-key `watchlist_user` row linking it to the user, and removal deletes both rows. The older standalone `repository.WatchlistUserRepository` adapter still exists but is unused (not wired in bootstrap).

Protected controllers receive the shared `middleware.AuthRequired` handler from `bootstrap/container.go` as a constructor argument and apply it per-route or per-group.

`RoleController` still exists only as commented-out code and is not wired.

### Database migrations

Migrations are run automatically on startup via `config.Migrate(gormDB)` using `gorm.AutoMigrate`. The migrated models are listed in `internal/infra/config/db.go` and include `User`, `Company`, `Campaign`, `EscrowAccount`, `InvestmentsH`, `InvestmentD`, `ShareOwnership`, `Watchlist`, `WatchlistUser`, `Role`, `UserAuthentication`, `Review`, `Discussion`, `CampaignMedia`, `Information`, `Updates`, and `Categories`. (`Wallet` and `Document` were removed from the codebase; AutoMigrate never drops tables, so old `wallets`/`document` tables may still exist in the database unused.)

## Frontend architecture

The Next.js app uses the App Router and is organized under `invest/app/`:

- `layout.tsx` — root layout with Geist fonts and a shared `Navbar`.
- `page.tsx` — default landing page (currently mostly empty).
- `home/page.tsx` — renders a sample `CardImage` component.
- `product/page.tsx` — sample product detail page.
- `dashboard/page.tsx` — investor dashboard: stat cards plus an investments table (fetches `GET /api/v1/auth/me` then `GET /api/v1/transaction/user/:id`), with working Pay/Cancel actions for pending investments.
- `watchlist/page.tsx` — the session user's watchlisted campaigns as cards (from `GET /api/v1/watchlist` via `lib/watchlist.ts`), each linking to `/campaign/:id` with a remove (unwatch) action; unauthenticated visitors are redirected to `/sign-in`. The campaign detail page (`campaign/[id]/page.tsx`) has a heart toggle next to the Invest button backed by the same endpoints (`POST`/`DELETE /api/v1/watchlist/:campaignId`, `GET /api/v1/watchlist/check/:campaignId`), and `components/share/Navbar.tsx` links to `/watchlist` in the investor nav.
- `admin/page.tsx` — admin campaign approval table: pending (DRAFT) / all tabs; Approve flips a campaign to ACTIVE via `PATCH /api/v1/campaign/:id`, Reject deletes it via `DELETE /api/v1/campaign/:id` after confirmation.
- `settings/page.tsx` — profile settings: account header, editable name/phone form (`PUT /api/v1/users`), and a set-password form (`POST /api/v1/auth/password`, only works for accounts with no password yet, e.g. Google sign-in).
- `campaign/new/page.tsx` — create-campaign form: resolves the session (`GET /api/v1/auth/me`), loads the user's company (`GET /api/v1/company/:userId`), and submits everything as one multipart/form-data request to `POST /api/v1/campaign/:companyId` (`lib/campaign.ts` `createCampaign`: campaign fields as text parts; the first file picked in the `FileDropzone` goes as the `cover` part, the rest as repeatable `files` parts). The description is a plain `Textarea` bound to the form.
- `company/page.tsx` — shows the session user's company, or a registration form (`POST /api/v1/company/`, PascalCase JSON keys since `domain.Company` has no json tags) when the user has none.
- `(auth)/sign-in/page.tsx` — sign-in page placeholder.

Components are split into:

- `components/share/` — page-level/shared components (e.g., `Navbar`, `CardImage`).
- `components/ui/` — shadcn/ui primitive components (e.g., `Button`, `Card`, `Carousel`, `Badge`, `Avatar`, etc.).

`lib/utils.ts` exports a single `cn(...)` helper that merges Tailwind classes using `clsx` + `tailwind-merge`.

## Build and run commands

### Backend

```bash
# Build the backend binary
go build ./...

# Run the backend
go run ./cmd/main.go
```

The server starts on `:8080` and exposes routes under `/api/v1`. It expects `DATABASE_URL` and a reachable Redis instance to be available (see Configuration).

### Frontend

All commands run from `invest/`:

```bash
cd invest

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Production server
npm run start

# Lint
npm run lint
```

The frontend dev server runs on `http://localhost:3000` by default.

## Configuration

Configuration is loaded from a `.env` file in the project root (loaded by `godotenv` in `cmd/main.go` with a relative path `../.env` from `cmd/`).

Required environment variables for the backend:

- `DATABASE_URL` — PostgreSQL connection string (currently expected to be a Neon Postgres URL).
- `JWT_SECRET` — **legacy, no longer used** since auth moved to opaque Redis-backed session tokens; safe to remove from `.env`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth2 web client credentials (Google Cloud Console).
- `GOOGLE_REDIRECT_URL` — OAuth2 callback URL registered with Google (e.g. `http://localhost:8080/api/v1/auth/google/callback`).
- `FRONTEND_URL` — Base URL of the Next.js app used for post-login redirects (e.g. `http://localhost:3000`).
- `COOKIE_SECURE` — `true` sets the `Secure` flag on the `access_token` cookie (production/HTTPS); anything else leaves it off for local HTTP development.

The frontend reads `NEXT_PUBLIC_API_URL` from `invest/.env.local` (optional; the sign-in page falls back to `http://localhost:8080`). `invest/` contains a `dotenv` dependency, suggesting future environment support.

## Code style and conventions

### Go

- **Module path:** `github.com/SamuelLazuardy/investment`.
- **Entry point:** `cmd/main.go`.
- **Layered imports:** usecases and controllers depend on `internal/domain` (entities + repository ports); only `internal/repository` (the adapter layer) and `bootstrap` import both domain and repository. Ports live in domain so the dependency points inward. Request/response DTOs live in `internal/delivery/http/dto` (package `dto`); session tokens are issued/validated by `util.TokenUtil` (Redis-backed opaque tokens).
- **Context-aware:** repository and usecase methods accept `context.Context` as the first parameter.
- **IDs:** primary keys are `uint32`.
- **Money:** stored as `int64` in the smallest currency unit (comments in the code warn against `float64`/`uint32` for financial values).
- **GORM tags:** models use explicit `column:` and `type:` tags to match the existing schema.
- **Table names:** most models override `TableName()` explicitly (e.g., `user`, `company`, `campaign`).
- **Comments:** the codebase has explanatory comments noting recent refactors and bug fixes; preserve them when editing.

### TypeScript / Next.js

- **Path aliases:** `@/*` maps to `./*` inside `invest/`.
- **shadcn/ui components:** live in `components/ui/` and use `data-slot` attributes and the `cn()` utility.
- **Tailwind v4:** configured via CSS (`@import "tailwindcss"`) and `postcss.config.mjs`; there is no `tailwind.config.js`.
- **Component style:** use function components and named exports; the existing components are written with `React.FC`-style implicit returns.

## Testing strategy

- **No project-specific tests are currently present.** `go test ./...` and `npm test` run only the tests bundled inside third-party dependencies (e.g., `node_modules`).
- When adding tests, follow the conventional locations: `*_test.go` alongside Go source files and `*.test.ts(x)` next to React components or under a `__tests__` directory.

## Known issues and caveats

The repository is under active development and currently has several issues an agent should be aware of before making changes:

### Backend

1. **`RoleController` is fully commented out.** The role registration flow is dormant. (`UserController` is active and wired in `bootstrap/container.go`; its usecase methods take `ctx context.Context` like the other usecases.)
2. **No ownership/role checks beyond authentication.** The middleware verifies the token, but any authenticated user can still update/delete any campaign or view any user's transactions; resource-level authorization is not implemented yet.

### Frontend

1. **`payment/[id]/page.tsx` is a placeholder.** The full payment UI is not implemented; investments are paid from the dashboard instead.
2. **`tsconfig.json` includes non-existent files.** It references `"../db/schema.ts"` and `"../db/db.ts"`, but no `db/` directory exists at the project root. These should be removed or the directory should be created.
3. **Drizzle dependencies are installed but unused.** `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, and `pg` are present, but there is no Drizzle schema or config file yet.
4. **No tests.** Same as the backend; no frontend tests are authored.

## Security considerations

- **Secrets are loaded from `.env`.** `.env` is listed in `.gitignore`, but verify it is never committed.
- **Session tokens are opaque random strings** (256-bit, hex-encoded) generated by `util.TokenUtil.CreateToken` and stored in Redis (`session:<token>` → session JSON, 30-day TTL). The Redis lookup is the validation — there is no signature or claim to trust, and deleting the key (`TokenUtil.DeleteSession`, used by logout) revokes the session immediately. A `session:user:<userID>` reverse index enforces one active session per user.
- **Passwords are hashed with bcrypt** in the auth usecase. Passwords are stored as hashes in the `User` model; never log or return the `Password` field in JSON responses (the current login response only returns a token, which is correct).
- **Authentication middleware is active.** `middleware.NewAuth` guards the user, company, and transaction routes plus campaign mutations; anonymous requests get `401`. The token is read from the `access_token` cookie (set on login and Google OAuth callback, `HttpOnly`; the `Secure` flag is controlled by `COOKIE_SECURE`) or an `Authorization: Bearer` header, then resolved against Redis. Campaign read routes and `/api/v1/auth/*` remain public by design. With `COOKIE_SECURE=true` cookie-based auth only works over HTTPS — set it to `false` (or use the Bearer header) in local HTTP development.
- **SQL injection risk is mitigated by GORM.** All repository queries use parameterized conditions (`Where("column = ?", value)`), so avoid concatenating raw user input into SQL strings.
- **Financial data uses `int64` smallest-currency units.** Do not change money fields to `float64` or `uint32` without understanding the rounding/capacity implications documented in the domain comments.
- **CORS is not configured.** If the frontend and backend are served from different origins, CORS middleware will need to be added to the Gin router.

## Deployment notes

- The Go backend is a single binary produced by `go build ./cmd/main.go`. It reads the `.env` file relative to the `cmd/` directory at runtime, so ensure the `.env` file is present in the correct relative path or switch to pure environment variables.
- The Next.js frontend produces a static or server-rendered output from `invest/`. The default `next.config.ts` is empty; configure it for your target platform (e.g., Vercel, standalone Docker) before deploying.
- The database is expected to be PostgreSQL. Migrations run automatically on startup, so the application user needs schema-creation privileges on first run.

## When you are asked to make changes

1. Read this file first, then the relevant `internal/domain/`, `internal/usecase/`, `internal/repository/`, and `internal/controllers/` files for backend changes, or `invest/app/` and `invest/components/` for frontend changes.
2. Verify the change compiles with `go build ./...` (backend) or `npm run build` (frontend from `invest/`).
3. Keep the existing layered structure: add domain logic in `domain/`, data access in `repository/`, business rules in `usecase/`, and HTTP handling in `controllers/`.
4. Preserve existing comments that explain intentional design decisions, especially around financial-field types, composite keys, and race-condition fixes.
5. Update this file if your change materially alters the architecture, build process, or configuration requirements.
