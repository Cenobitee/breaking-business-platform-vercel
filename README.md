# Breaking Business

Breaking Business is a full-stack business operations and investment-transparency platform. It combines point-of-sale operations, product cost and profit tracking, accounting tools, role-based team management, and product-linked investment opportunities in one business-scoped application.

## Technology

- Java 21 and Spring Boot 3.4
- Spring Security with signed JWT access tokens
- PostgreSQL 16 with Flyway database migrations
- JavaScript with React 18, React Router, and Vite 8 for the frontend
- CSS for the responsive application interface and component styling
- Docker Compose for the local database

## Main features

### Owner workspace

- Create and maintain the business profile.
- Manage products, selling prices, stock, and each product's total base cost.
- Track revenue, expenses, product profit, business net profit, and accounting records.
- Review order history and delete individual, selected, or date-specific sales.
- Create Manager and Investor accounts, enable or disable access, and delete profiles.
- Create, edit, activate, deactivate, and delete investment opportunities.
- Connect investment opportunities to the products whose verified sales contribute to profit.
- Upload multiple investment images and crop them before publishing.
- Set the unit price, funding target, earnings range, duration, total units, and maximum units one investor may buy.
- Review and approve investor requests and manage active investment cycles.

### Investor workspace

- Browse active opportunities in an image-led feed.
- Open an opportunity to view its full description, image gallery, return calculation, linked products, duration, and profit-distribution explanation.
- Book a permitted number of units and continue to the payment screen.
- Track each approved investment separately while viewing an overall summary on the dashboard.
- Follow verified sales and profit from the products linked to an investment.
- View maturity information and withdraw only when the investment cycle is eligible.

### Manager workspace

- Use the point-of-sale workflow.
- View operational analytics and staff information permitted by the business role policy.
- Work with the same business-specific catalog and sales records as the Owner.

## Business and security model

Each Owner creates a separate business. Managers, Investors, products, sales, expenses, messages, analytics, investment posts, and investment transactions are restricted to that business.

The backend issues signed JWT access tokens. Selecting **Remember me** stores the authenticated session in browser local storage; otherwise, it lasts only for the browser session. Disabling or deleting a managed account prevents its existing JWT from continuing to access protected APIs.

Investment projections are estimates rather than guaranteed returns. Product-linked verified sales minus direct product costs determine actual profit. The Owner keeps 50% of that profit, while the other 50% forms the Investor pool and is distributed proportionally by purchased project units. Each Investor's payout remains limited by the maximum earnings percentage configured on the post, and funds remain locked until the investment tenure ends.

## Run on another computer

### Requirements

Install these tools first:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Java Development Kit 21](https://adoptium.net/temurin/releases/?version=21)
- [Apache Maven 3.9+](https://maven.apache.org/download.cgi)
- [Node.js 20+](https://nodejs.org/)

### 1. Clone the project

```bash
git clone https://github.com/Cenobitee/breaking-business-platform-vercel.git
cd breaking-business-platform-vercel
```

### 2. Start PostgreSQL

Make sure Docker Desktop is running, then execute:

```bash
docker compose up -d database
```

The database is persisted in the Docker volume named `postgres-data`. Flyway automatically creates and updates the schema when the backend starts.

### 3. Start the backend

Open a terminal in the project directory:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The backend runs at `http://localhost:8080`.

> PowerShell note: if Maven treats the profile argument incorrectly, use `mvn spring-boot:run "-Dspring-boot.run.profiles=local"`.

### 4. Start the frontend

Open a second terminal in the project directory:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in a browser.

### Local development accounts

When the database contains no users, the `local` profile creates these accounts under the sample **Irodori** business:

| Role | Email | Password |
|---|---|---|
| Owner | `owner@example.com` | `ChangeMe123!` |
| Manager | `manager@example.com` | `ChangeMe123!` |
| Investor | `investor@example.com` | `ChangeMe123!` |

The local profile is intended only for development and demonstrations. Do not use its sample accounts or default JWT secret in production.

## Environment configuration

The repository includes [`.env.example`](.env.example) as a reference for deployment values. Important variables include:

| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL JDBC connection URL |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret used to sign access tokens; use at least 32 random characters |
| `JWT_TTL_MINUTES` | Access-token lifetime in minutes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins, such as local development and the Vercel production URL |
| `PASSWORD_RESET_EXPOSE_TOKEN` | Development-only option for returning reset tokens in API responses |
| `SEED_DEFAULT_USERS` | Enables or disables sample account creation |
| `SEED_DEFAULT_PASSWORD` | Password used only when sample account creation is enabled |
| `VITE_API_URL` | Frontend API base URL, defaulting to `http://localhost:8080/api` |

For a non-local backend start, set a secure `JWT_SECRET` and the database variables before running Spring Boot. Keep real secrets outside Git and never commit a populated `.env` file.

## Live public deployment: Vercel + Railway

This deployment repository is configured for the following architecture:

```text
Browser → Vercel React frontend → Railway Spring Boot API → Railway PostgreSQL
```

Current public services:

- Frontend: <https://breaking-business-platform-vercel-f.vercel.app>
- API: <https://breaking-business-api-production.up.railway.app>
- Source: <https://github.com/Cenobitee/breaking-business-platform-vercel>

### 1. Deploy the backend and database on Railway

1. Create a Railway project from this repository and select [`backend/Dockerfile`](backend/Dockerfile) for the API service.
2. Add a PostgreSQL service named `breaking-business-db`.
3. Generate a Railway domain for the API service.
4. Configure these API variables (Railway reference variables keep credentials out of Git):

   ```env
   DB_URL=jdbc:postgresql://${{breaking-business-db.PGHOST}}:${{breaking-business-db.PGPORT}}/${{breaking-business-db.PGDATABASE}}
   DB_USERNAME=${{breaking-business-db.PGUSER}}
   DB_PASSWORD=${{breaking-business-db.PGPASSWORD}}
   CORS_ALLOWED_ORIGINS=https://breaking-business-platform-vercel-f.vercel.app
   JWT_SECRET=replace-with-a-long-random-production-secret
   JWT_TTL_MINUTES=120
   SEED_DEFAULT_USERS=false
   PASSWORD_RESET_EXPOSE_TOKEN=false
   ```

5. Deploy and wait for Flyway to apply all migrations. A request to `/api/auth/me` without a token should return HTTP `401`, confirming that the API is online and protected.

Use Railway's variable generator for `JWT_SECRET`, and keep demo users and password-reset token exposure disabled. Do not enable the local Spring profile in production.

### 2. Deploy the frontend on Vercel

1. In Vercel, choose **Add New > Project** and import this GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Confirm these build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add this **Config** variable to Production and Preview:

   ```env
   VITE_API_URL=https://breaking-business-api-production.up.railway.app/api
   ```

5. Deploy the project. [`frontend/vercel.json`](frontend/vercel.json) ensures React Router URLs work when opened or refreshed directly.
6. Redeploy after changing an environment variable. The live frontend is <https://breaking-business-platform-vercel-f.vercel.app>.

### 3. Finish CORS configuration

Return to the Railway API service and set `CORS_ALLOWED_ORIGINS` to the exact deployed frontend origin:

```env
CORS_ALLOWED_ORIGINS=https://breaking-business-platform-vercel-f.vercel.app
```

Save the setting and redeploy the backend. Add `http://localhost:5173` as a comma-separated origin only if the public API also needs to serve a local frontend.

### 4. Create the first production Owner

Open the Vercel URL and use the registration page to create the first real Owner and business. Production does not create the sample local accounts.

### Production notes

- The payment page currently records the investment workflow but is not connected to a real payment gateway.
- Use a paid database plan with backups before storing important real business or investment data.
- Uploaded investment images are stored in PostgreSQL; move them to object storage before supporting large public upload volumes.
- Add email delivery, rate limiting, monitoring, privacy terms, and relevant legal review before accepting real public investments.

## Useful commands

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run format:check
```

### Backend

```bash
cd backend
mvn test
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Database

```bash
docker compose up -d database
docker compose logs -f database
docker compose stop database
```

## API summary

All protected requests use the `/api` prefix and require `Authorization: Bearer <token>`.

| Area | Representative endpoints |
|---|---|
| Authentication | `POST /api/auth/login`, `POST /api/auth/register`, password reset endpoints |
| Business profile | `GET /api/business`, `PUT /api/business` |
| Personal and managed profiles | `/api/profile/me`, `/api/profile/members/{id}` |
| Products and profit | `/api/products`, `/api/product-profits` |
| Sales | `/api/sales`, date deletion, and bulk deletion endpoints |
| Expenses | `/api/expenses` |
| Accounting | `/api/accounting/journal`, `/api/accounting/break-even`, `/api/accounting/budgets` |
| Analytics | `/api/analytics/operations`, `/api/analytics/investor` |
| Investments | `/api/investments/packages`, requests, cycles, approvals, completion, and withdrawal endpoints |
| People | `/api/users`, `/api/employees` |
| Messaging | contacts, unread count, conversations, edit, and delete endpoints under `/api/messages` |

Role authorization and business ownership are enforced by the backend; hiding a frontend control is not treated as the security boundary.

## Repository layout

```text
breaking-business-platform/
├── backend/                 Spring Boot API and Flyway migrations
├── frontend/                React and Vite application
├── docker-compose.yml       Local PostgreSQL service
├── .env.example             Deployment configuration reference
└── README.md
```

## Troubleshooting

- **Backend reports that PostgreSQL is unavailable:** confirm Docker Desktop is running and `docker compose up -d database` completed successfully.
- **Flyway reports duplicate migration versions:** pull the latest `main` branch, then run a clean Maven build so stale files are removed from `backend/target`.
- **Frontend cannot reach the backend:** confirm Spring Boot is running on port `8080` and `VITE_API_URL` points to `/api` on that server.
- **Login fails on a new database:** start the backend with the `local` profile once so the sample accounts are created, or register a new Owner account.
- **Port already in use:** stop the other service using port `5173`, `8080`, or `5432`, or adjust the relevant local configuration.
