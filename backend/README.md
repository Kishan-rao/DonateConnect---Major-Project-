# DonateConnect Backend

DonateConnect's REST API is built with Java 21, Spring Boot 3.4, Spring Security, Spring Data JPA, and PostgreSQL. It also provides WebSocket/STOMP location updates for delivery tracking.

## Features

- JWT authentication with email OTP verification for registration and sign-in.
- Role-protected endpoints for donors, NGOs, volunteers, corporate partners, and administrators.
- Donation requests with photo uploads, donor history, NGO status management, and donation comments.
- Volunteer pickup and delivery workflows, including live location updates and OTP-confirmed delivery with proof photo.
- NGO profiles, inventory and urgent-needs management, plus NGO and volunteer ratings.
- In-app notifications, account preferences, password changes, and account deletion.
- Corporate donation drives, impact metrics, administrator statistics, NGO/user management, and audit logs.
- Optional smart-locker, blockchain-ledger, resource-trading, and SOS API endpoints.

## Requirements

- Java 21
- PostgreSQL

## Configuration

Configuration may be supplied as environment variables or in an optional `.env` file. The application imports `.env` from the current working directory or `backend/.env`. Do not commit credentials.

| Variable | Required | Default / purpose |
|---|---|---|
| `DB_URL` | Yes | JDBC URL for PostgreSQL |
| `DB_USERNAME` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `JWT_SECRET` | Yes | Secret used to sign JWTs; set a strong, private value |
| `SERVER_PORT` or `PORT` | No | Server port; defaults to `8080` |
| `DB_DRIVER` | No | Defaults to `org.postgresql.Driver` |
| `JWT_EXPIRATION_MS` | No | Token lifetime in milliseconds; defaults to `86400000` |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated allowed browser origins; include the frontend URL (for local development, `http://localhost:5173`) |
| `UPLOAD_DIR` | No | Upload storage directory; defaults to `uploads/` |
| `MAIL_PROVIDER` | No | Defaults to `auto`; Brevo API is preferred when `BREVO_API_KEY` is configured, otherwise SMTP is used |
| `BREVO_API_KEY`, `MAIL_FROM` | No | Settings for email delivery through Brevo |
| `APP_SEED_ENABLED` | No | Defaults to `false`; enables seed data when explicitly set to `true` |

File uploads are limited to 10 MB per file and 30 MB per request. The default storage is local disk; configure a persistent volume or external storage for deployments where the filesystem is ephemeral.

## Run locally

Set the required database and JWT values, then run from the `backend/` directory:

```powershell
.\mvnw.cmd spring-boot:run
```

If Maven is installed globally, `mvn spring-boot:run` also works. The service defaults to `http://localhost:8080`; check `http://localhost:8080/api/health`.

## API areas

All routes are prefixed with `/api`. Protected endpoints require a bearer JWT and the appropriate role.

| Area | Routes |
|---|---|
| Authentication | `/auth/register`, `/auth/login`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/me` |
| NGO discovery and profiles | `/ngo`, `/ngo/{id}`, `/ngo/me/profile`, `/urgent-needs`, `/ngo/urgent-needs` |
| Donations | `/donations`, `/donations/mine`, `/donations/mine/{id}`, `/ngo/donations`, `/ngo/donations/{id}/status`, `/donations/{id}/comments` |
| Volunteer delivery | `/volunteer/pickups/...`, `/volunteer/deliveries/...`, `/deliveries/{id}/location`, `/deliveries/donations/{id}/location` |
| Notifications and account | `/notifications/...`, `/users/me`, `/users/me/password`, `/users/me/preferences` |
| Ratings and impact | `/ngo/{id}/ratings`, `/volunteer/{id}/ratings`, `/impact` |
| Corporate and administration | `/corporate/drives`, `/admin/stats`, `/admin/ngo`, `/admin/users/pending`, `/admin/donations`, `/admin/audit` |

Live delivery updates use the `/ws` SockJS endpoint and STOMP topics under `/topic`.

## Tests

```powershell
.\mvnw.cmd test
```
