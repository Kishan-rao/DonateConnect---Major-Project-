# DonateConnect Frontend

The DonateConnect web client is built with React 18, TypeScript, Vite, React Router, Tailwind CSS, and Axios. It connects to the Spring Boot API and provides role-specific experiences for donors, NGOs, volunteers, corporate partners, and administrators.

## Features

- Browse and filter verified NGOs, view organization details and urgent needs, and explore organizations on a map.
- Create donation requests with photos, review donation history and status, and follow delivery progress.
- NGO dashboard for donation requests, inventory, and organization profile management.
- Volunteer dashboard for pickup and delivery tasks, including delivery tracking.
- Corporate CSR dashboard for donation drives and impact.
- Admin dashboards for platform statistics, NGO and donation management, user operations, and audit logs.
- Notifications, account settings, impact reporting, donation comments, and ratings.
- Responsive layouts and shared components for mobile navigation and status display.
- Optional smart-locker, blockchain-ledger, and circular-market prototype pages.

## Local setup

Requirements: Node.js and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. For local browser development, the API client defaults to `/api`; Vite proxies `/api` requests to `http://localhost:8080`. To connect to another API origin, set `VITE_API_BASE_URL` in a `frontend/.env` file:

```properties
VITE_API_BASE_URL=https://your-backend.example.com/api
```

The value should include the API origin and `/api` suffix. In production browser builds, an unset value also defaults to `/api`; configure it to the deployed backend URL when the frontend and API are hosted separately.

## Routes

| Route | Access | Page |
|---|---|---|
| `/`, `/ngos`, `/ngos/:id`, `/impact`, `/map` | Public | Home, NGO discovery/details, impact, and map |
| `/login`, `/register` | Public | Sign-in and account registration |
| `/donate/new`, `/donations`, `/donor/profile` | Donor / admin | Create a donation, donation history, and donor profile |
| `/ngo-dashboard`, `/ngo-dashboard/inventory`, `/ngo-dashboard/profile` | NGO / admin | NGO operations, inventory, and profile |
| `/driver-dashboard` | Volunteer / admin | Volunteer pickup and delivery tasks |
| `/csr-dashboard` | Corporate / admin | Corporate CSR dashboard |
| `/admin`, `/admin/profile`, `/admin/ngos`, `/admin/donations`, `/admin/audit` | Admin | Platform administration |
| `/notifications`, `/settings`, `/donations/:id/track` | Authenticated | Notifications, account settings, and delivery tracking |
| `/lockers`, `/blockchain-ledger`, `/circular-market` | Prototype flag | Optional prototype views |

Protected pages enforce role access in the client; the backend remains responsible for authorization. Authentication persists the JWT and user data in browser local storage and revalidates the current user with the API.

Enable the optional prototype routes only when needed:

```properties
VITE_SHOW_PROTOTYPES=true
```

## Scripts

```powershell
npm run dev       # Start the Vite development server
npm test          # Run Vitest tests
npm run build     # Type-check and create a production build
npm run preview   # Preview the production build locally
```

## Android

The frontend includes Capacitor Android dependencies and configuration. Production native builds require `VITE_API_BASE_URL` to be set to an HTTPS backend URL. Browser defaults to `/api`; native builds do not use that relative API fallback.
