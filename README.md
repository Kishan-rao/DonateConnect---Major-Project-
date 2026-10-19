# DonateConnect

DonateConnect is a full-stack platform for coordinating donations between donors, verified non-governmental organizations (NGOs), volunteers, and corporate partners. The application combines a role-based React web client with a Spring Boot REST API and PostgreSQL persistence.

## Features

- **Donor experience:** discover and filter verified NGOs, review organization profiles and urgent needs, submit donation requests with photos, follow donation status, and view donation history.
- **NGO operations:** manage an organization profile and inventory, publish urgent needs, review donation requests, and accept or reject them.
- **Volunteer deliveries:** claim available pickups, update delivery progress, share delivery location, and complete delivery with an OTP and proof photo.
- **Live delivery tracking:** view delivery progress and location updates on a map.
- **Impact and community:** browse impact metrics, comment on donations, rate NGOs and volunteers, and receive in-app notifications.
- **Corporate CSR:** manage corporate donation drives and view an impact dashboard.
- **Administration:** view platform statistics, manage and verify NGO partners, approve pending users, audit donations, and review audit logs.
- **Account management:** email OTP verification, JWT authentication, role-based access control, notification preferences, password changes, and account deletion.
- **Emergency and discovery tools:** SOS urgent-needs banner, NGO map, and public urgent-needs listings.
- **Optional prototype pages:** smart lockers, a blockchain ledger, and a circular resource marketplace are available when `VITE_SHOW_PROTOTYPES=true`.

## Technology

- **Backend:** Java 21, Spring Boot 3.4, Spring Security, Spring Data JPA/Hibernate, Maven, PostgreSQL, JWT, WebSocket/STOMP, and email delivery.
- **Frontend:** React 18, TypeScript, Vite, React Router, Tailwind CSS, Axios, Leaflet, and Lucide icons.
- **Testing:** JUnit/Spring Boot Test and Vitest/Testing Library.

## Run locally

### Prerequisites

- Java 21
- Node.js and npm
- PostgreSQL

### Backend

Configure the backend environment before starting the API. The application imports an optional `backend/.env` file when launched from the repository root or `backend/.env` when launched from the backend directory. Do not commit credentials.

Required settings:

```properties
DB_URL=jdbc:postgresql://localhost:5432/donateconnect_db
DB_USERNAME=postgres
DB_PASSWORD=<your-database-password>
JWT_SECRET=<a-long-random-secret>
```

`CORS_ALLOWED_ORIGINS` is required and should include the frontend origin, for example `http://localhost:5173`. See [backend/README.md](backend/README.md) for optional mail, upload, and server settings.

Start the API from `backend/`:

```powershell
.\mvnw.cmd spring-boot:run
```

The API listens on `http://localhost:8080` by default. Check `http://localhost:8080/api/health`.

### Frontend

Create `frontend/.env`:

```properties
VITE_API_BASE_URL=http://localhost:8080/api
```

Then start the web client:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. See [frontend/README.md](frontend/README.md) for the route guide and available scripts.

## Common commands

```powershell
# Backend tests (from backend/)
.\mvnw.cmd test

# Frontend tests (from frontend/)
npm test

# Frontend type-check and production build (from frontend/)
npm run build
```

## API overview

All API routes are under `/api`. Protected routes require a valid bearer JWT and the appropriate role.

| Area | Selected routes | Purpose |
|---|---|---|
| Health and authentication | `GET /health`, `/auth/register`, `/auth/login`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/me` | Health check, account verification, sign-in, and current user |
| NGOs and urgent needs | `/ngo`, `/ngo/{id}`, `/ngo/me/profile`, `/urgent-needs`, `/ngo/urgent-needs` | Discover organizations, manage an NGO profile, and publish or view urgent needs |
| Donations and comments | `/donations`, `/donations/mine`, `/donations/mine/{id}`, `/donations/{id}/comments` | Submit and review donations, access a donor's own donation details, and discuss a donation |
| NGO donation workflow | `/ngo/donations`, `/ngo/donations/{id}/status` | Review assigned requests and update donation status |
| Deliveries and tracking | `/volunteer/pickups`, `/volunteer/deliveries/...`, `/deliveries/{id}/location`, `/deliveries/donations/{id}/location` | Claim pickups, manage delivery completion, and exchange location updates |
| Notifications and impact | `/notifications/...`, `/impact` | Read notifications and retrieve platform impact metrics |
| Administration | `/admin/stats`, `/admin/ngo`, `/admin/users/pending`, `/admin/donations`, `/admin/audit` | Platform oversight, partner and user management, donation review, and audit history |
| Corporate and volunteer | `/corporate/drives`, `/volunteer/...`, `/ngo/{id}/ratings`, `/volunteer/{id}/ratings` | CSR drives, volunteer workflows, and ratings |

## Docker

Build the backend image from the repository root:

```powershell
docker build -t donateconnect-backend .\backend
```

Run it with the backend environment file (configure `DB_URL` to a database reachable from the container):

```powershell
docker run --env-file .\backend\.env -p 8080:8080 donateconnect-backend
```

## Deployment

The frontend can be deployed as a Vite site (for example, Vercel) and the backend as a Spring Boot service or Docker image (for example, Render), with PostgreSQL hosted separately. Configure the frontend's `VITE_API_BASE_URL`, backend database/JWT settings, and `CORS_ALLOWED_ORIGINS` for the deployed frontend origin. Use persistent storage for uploaded photos if the hosting platform has an ephemeral filesystem. Keep prototype pages disabled in production unless they are intentionally being exposed.
