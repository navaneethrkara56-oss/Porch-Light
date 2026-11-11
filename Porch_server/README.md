# Porch Light — Backend Service (`Porch_server`)

The official Node.js and Express backend service for **Porch Light** ("*Leave the light on for home*"), an architectural real estate platform in India.

This service establishes authoritative data persistence (MongoDB Atlas & seamless local JSON fallback), JWT/HttpOnly session handling, server-enforced role authorization, simulated payments, promotion/waitlist engines, and secure media uploads.

---

## 1. Directory Structure

```
Porch_server/
├── .env.example              # Template containing variable names with placeholders only
├── .gitignore                # Ensures .env, node_modules, and logs are never committed
├── package.json              # Service dependencies and npm scripts
├── server.js                 # Server entry point & graceful shutdown lifecycle
├── README.md                 # Setup, configuration, and security documentation
├── data/
│   └── localStore.json       # Resilient local JSON data store (persisted in offline dev)
└── src/
    ├── app.js                # Express app setup (Helmet, CORS, parsing, error boundaries)
    ├── config/
    │   ├── env.js            # Environment validation & typed configuration
    │   ├── db.js             # Reusable MongoDB Atlas connection with safe status reporter
    │   └── cloudinary.js     # Cloudinary signed upload readiness helper (server-only)
    ├── constants/
    │   └── roles.js          # Authoritative system roles ('user', 'agent', 'admin')
    ├── controllers/
    │   ├── health.controller.js      # Public operational health & DB connectivity status
    │   ├── auth.controller.js        # Registration, login, logout, deletion obligations
    │   ├── properties.controller.js  # Filtered catalog, spatial pins, ownership updates
    │   ├── bookings.controller.js    # Visit walkthrough scheduling & rescheduling
    │   ├── inquiries.controller.js   # Client inquiries
    │   ├── chat.controller.js        # Conversation threads & attachment handling
    │   ├── payments.controller.js    # Simulated checkout, leases, and mutual cancellations
    │   ├── promotions.controller.js  # 4-slot Featured showcase, waitlist, and Premium badges
    │   ├── ratings.controller.js     # Star-only ratings (1-5) tied to completed transactions
    │   ├── complaints.controller.js  # Concierge support tickets
    │   ├── operational.controller.js # Notifications, broadcasts, diagnostic reports
    │   ├── analytics.controller.js   # Deduplicated views, 360 tour opens, agent telemetry
    │   └── dashboard.controller.js   # Cross-dashboard search and role metrics
    ├── db/
    │   └── dataStore.js      # Dual-mode data layer: MongoDB Mongoose + localStore fallback
    ├── middleware/
    │   ├── auth.js           # authenticateToken & requireAuth (HttpOnly cookie & Bearer)
    │   ├── authorize.js      # requireRole & requireVerifiedAgent enforcement
    │   ├── upload.js         # Centralized multer policy (MIME checks & category size limits)
    │   ├── errorHandler.js   # Centralized safe error handler (no stack trace leaks)
    │   ├── notFound.js       # 404 handler in Porch Light voice
    │   └── rateLimiter.js    # Rate limiter for authentication endpoints
    ├── models/
    │   ├── User.js           # User schema, bcrypt hashing, agent RERA verification
    │   ├── Property.js       # 14 typologies, pricing, coordinates, media (max 5 photos)
    │   ├── Booking.js        # Walkthrough schedules, status, and reschedule objects
    │   ├── Inquiry.js        # Property inquiry schema
    │   ├── Chat.js           # Conversation threads and message attachments
    │   ├── Payment.js        # Ledger entries, receipts, lease details, cancellations
    │   ├── Promotion.js      # Premium status, 4-slot Featured showcase, and waitlists
    │   ├── Rating.js         # Star-only ratings (1-5) tied to completed property payments
    │   ├── Complaint.js      # Multi-message support tickets
    │   └── Operational.js    # Notifications, Announcements, SystemReports, AnalyticsEvents
    ├── routes/
    │   ├── index.js          # Main API router mounting all domain endpoints under /api
    │   ├── health.routes.js
    │   ├── auth.routes.js
    │   ├── properties.routes.js
    │   ├── bookings.routes.js
    │   ├── inquiries.routes.js
    │   ├── chat.routes.js
    │   ├── payments.routes.js
    │   ├── promotions.routes.js
    │   ├── ratings.routes.js
    │   ├── complaints.routes.js
    │   ├── operational.routes.js
    │   ├── analytics.routes.js
    │   ├── dashboard.routes.js
    │   └── media.routes.js
    ├── scripts/
    │   └── seed.js           # Authoritative database seeder with bcrypt hashing
    ├── data/
    │   └── seedData.json     # Canonical seed dataset (29 properties, users, bookings, etc.)
    └── utils/
        ├── logger.js         # Sanitized logger suppressing passwords, tokens & URIs
        └── tokens.js         # JWT signing/verification and HttpOnly cookie settings
```

---

## 2. Environment Variables (`.env`)

Create a local `.env` file by copying `.env.example`:

```bash
cd Porch_server
cp .env.example .env
```

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development` or `production`). In production, cookies enforce `secure: true`, CORS is strictly enforced, and stack traces are suppressed. |
| `PORT` | Optional | `5000` | Port on which Express listens for incoming HTTP requests. |
| `ALLOWED_ORIGINS` | Required | `http://localhost:5173,http://localhost:5174` | Comma-separated list of allowed frontend origins for CORS. |
| `MONGODB_URI` | Required for Atlas | `mongodb+srv://<user>:<pwd>@<cluster>.mongodb.net/porch_light?retryWrites=true&w=majority` | Connection string for MongoDB Atlas targeting database `porch_light`. Never hardcoded or logged. |
| `MONGODB_DB_NAME` | Optional | `porch_light` | Explicit database name used by backend runtime and seed scripts (defaults to `porch_light`). |
| `JWT_SECRET` | Required | `min_32_characters_random_string` | Secret key used to sign and verify HS256 authentication tokens. |
| `JWT_EXPIRES_IN` | Optional | `7d` | Token expiration duration string. |
| `COOKIE_SECRET` | Required | `min_32_characters_random_string` | Secret key used by `cookie-parser` for signed cookies. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Optional | `900000` (15 mins) | Rate-limiting window in milliseconds for `/api/auth/*`. |
| `AUTH_RATE_LIMIT_MAX` | Optional | `30` | Maximum requests allowed per IP address within the rate-limiting window. |
| `GOOGLE_CLIENT_ID` | Optional | `your_google_client_id.apps.googleusercontent.com` | Google OAuth Client ID for server-side token verification. |
| `GOOGLE_CLIENT_SECRET` | Optional | `strictly_server_only` | Google Client Secret. **STRICTLY SERVER-ONLY**; never exposed to frontend code. |
| `CLOUDINARY_CLOUD_NAME` | Optional | `your_cloud_name` | Cloudinary account cloud name. |
| `CLOUDINARY_API_KEY` | Optional | `your_api_key` | Cloudinary public API key. |
| `CLOUDINARY_API_SECRET` | Optional | `strictly_server_only` | Cloudinary API secret for server-side upload signature generation. **STRICTLY SERVER-ONLY**. |

---

## 3. Local Startup & Database Seeding

### Prerequisites
- Node.js >= 18.0.0 (Node.js v24.18.0 verified)
- npm >= 9.0.0

### Step 1: Install Dependencies
```bash
cd Porch_server
npm install
```

### Step 2: Seed the Database
Seed canonical initial users, properties, bookings, and ledger entries:
- **Development Seeder (`porch_light` database)**:
  ```bash
  npm run seed:dev
  ```
  Seeds idempotent development records into `porch_light`:
  - 1 Development Admin (`navaneethestate56@gmail.com`) — development-only password stored exclusively as a bcrypt hash (12 salt rounds); never committed or exposed in documentation.
  - 4 Users with distinct profiles and saved properties (`usr_aarav`, `usr_diya`, `usr_rohan`, `usr_ananya`).
  - 3 Approved Agents owning exactly 9 properties each (27 properties total across 9 cities).
  - 1 Pending Agent (`agt_pooja`, `isVerified: false`, 0 properties).
  - 27 Properties (17 available, 4 leased, 2 sold, 2 pending review, 2 rejected; 5 premium, 4 front-page featured showcase). Every property has exactly 5 gallery images and a valid cover image.
  - 5 Simulated Payments (Token advances, lease move-in deposits, promotion fees).
  - 3 Star-only ratings (4-5 stars) linked strictly to completed payments.
  - 2 Walkthrough visit bookings.
  - 1 Client-agent conversation thread with messages.
  - 1 Support ticket complaint.
  - 2 System reports.
  - 52 Analytics events (deduplicated daily views & 360 tour opens).
  - 3 Targeted notifications and 1 platform announcement.

- **Idempotency & Safety**:
  `npm run seed:dev` creates timestamped backups in `backups/` if previous data exists, deletes only records tagged with `isDevSeed: true` or canonical dev identifiers, and refuses to run in production (`NODE_ENV === 'production'`).

- **Legacy/Full Seeder**:
  ```bash
  npm run seed
  ```
  To safely re-seed and overwrite an existing database:
  ```bash
  node src/scripts/seed.js --force
  ```

### Step 3: Start the Backend Service
- **Standard start**:
  ```bash
  npm start
  ```
- **Hot-reloading development mode** (using nodemon):
  ```bash
  npm run dev
  ```

---

## 4. API Endpoints Overview

| Category | Endpoint | Method | Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| **Health** | `/api/health` | GET | Public | Health and DB connectivity status |
| **Auth** | `/api/auth/register` | POST | Public | Register user or agent |
| | `/api/auth/login` | POST | Public | Authenticate with email and password |
| | `/api/auth/google` | POST | Public | Google SSO (strictly restricted to `user` role) |
| | `/api/auth/logout` | POST | Auth | Clear session and cookies |
| | `/api/auth/me` | GET | Auth | Get current authenticated profile |
| | `/api/auth/profile` | PATCH | Auth | Update name, avatar, contact info |
| | `/api/auth/password` | PATCH | Auth | Change password with current password verification |
| | `/api/auth/account-deletion-check` | GET | Auth | Check user obligations before closure |
| | `/api/auth/account` | DELETE | Auth | Delete or deactivate user account |
| | `/api/auth/agent-deletion-obligations` | GET | Agent | Check agent active listings and leases |
| | `/api/auth/agent-deletion-request` | POST | Agent | Request account closure |
| | `/api/auth/agent-deletion-requests` | GET | Admin | Retrieve pending agent closure requests |
| | `/api/auth/saved` | GET | Auth | Get saved properties |
| | `/api/auth/saved/:id` | POST | Auth | Toggle saved property |
| **Properties** | `/api/properties` | GET | Public | Search, filters, sort, pagination + map pins `allMatching` |
| | `/api/properties/:id` | GET | Public | Property detail with deduplicated view telemetry |
| | `/api/properties/:id/similar` | GET | Public | Recommended properties |
| | `/api/properties` | POST | Agent/Admin | Create new residence listing (requires verified agent) |
| | `/api/properties/:id` | PATCH | Agent/Admin | Update listing (ownership & field whitelists enforced) |
| | `/api/properties/:id` | DELETE | Agent/Admin | Archive/delete listing |
| | `/api/properties/:id/status` | PATCH | Agent/Admin | Update status (sold/rented) |
| **Bookings** | `/api/bookings` | GET | Auth | Role-scoped bookings list |
| | `/api/bookings` | POST | User | Request walkthrough visit |
| | `/api/bookings/:id/status` | PATCH | Agent/Admin | Confirm/decline visit |
| | `/api/bookings/:id/cancel` | PATCH | User/Admin | Cancel pending booking |
| | `/api/bookings/:id/schedule` | PATCH | User | Edit schedule on pending booking |
| | `/api/bookings/:id/reschedule-request` | POST | User | Request reschedule on confirmed booking |
| | `/api/bookings/:id/reschedule-response` | POST | Agent | Accept or decline reschedule |
| **Inquiries** | `/api/inquiries` | GET | Agent/Admin | Retrieve inbound inquiries |
| | `/api/inquiries` | POST | Public/User | Submit property inquiry |
| **Chat** | `/api/chat/threads` | GET | Auth | Role-scoped chat threads |
| | `/api/chat/threads/find-or-create` | POST | Auth | Start or find conversation thread |
| | `/api/chat/:id/messages` | POST | Auth | Send message with safe attachments |
| **Payments** | `/api/payments` | GET | Auth | Retrieve ledger records |
| | `/api/payments/checkout` | POST | User | Simulated payment checkout (Buy token / Rent deposit) |
| | `/api/payments/leases/:id/cancellation-request` | POST | Auth | Request early lease termination |
| | `/api/payments/leases/:id/cancellation-response` | POST | Auth | Agree or decline early lease termination |
| | `/api/payments/properties/:id/confirm-handover` | POST | Agent/Admin | Confirm handover inspection and return to Rent pool |
| **Promotions** | `/api/promotions/config` | GET | Public | Get promotion fee and duration parameters |
| | `/api/promotions/config` | PATCH | Admin | Update platform promotion parameters |
| | `/api/promotions` | GET | Auth | List promotion records |
| | `/api/promotions/premium-badge` | POST | Agent | Request one-time Premium status & 360 tour unlock |
| | `/api/promotions/featured-placement` | POST | Agent | Request 1 of 4 Home featured slots (or waitlist) |
| | `/api/promotions/:id/status` | PATCH | Admin | Approve, decline, or waitlist promotion |
| | `/api/promotions/properties/:id/featured-window` | PATCH | Admin | Adjust featured showcase window |
| | `/api/promotions/properties/:id/unpin-featured` | POST | Admin | Unpin featured residence |
| | `/api/promotions/featured-curation` | PUT | Admin | Bulk update Home featured properties |
| | `/api/promotions/featured-sync` | POST | Auth | Run capacity & waitlist sync worker |
| **Ratings** | `/api/ratings/agents/:id/aggregate` | GET | Public | Star rating average (1 decimal), count, distribution |
| | `/api/ratings/eligibility` | GET | User | Check eligibility for transaction |
| | `/api/ratings` | POST | User | Submit 1-5 star rating linked to completed transaction |
| | `/api/ratings/transaction/:txId` | GET | Auth | Get rating for transaction |
| | `/api/ratings/user-status` | GET | User | Get user rating status for property |
| **Complaints** | `/api/complaints` | GET | Auth | Retrieve tickets |
| | `/api/complaints` | POST | Auth | Open support ticket |
| | `/api/complaints/:id/reply` | POST | Auth | Reply in ticket thread |
| | `/api/complaints/:id/status` | PATCH | Admin | Resolve or update ticket status |
| **Operational** | `/api/operational/notifications` | GET | Auth | User notification feed |
| | `/api/operational/notifications/:id/read` | PATCH | Auth | Mark notification as read |
| | `/api/operational/notifications/read-all` | PATCH | Auth | Mark all notifications read |
| | `/api/operational/notifications/:id` | DELETE | Auth | Delete notification |
| | `/api/operational/notifications` | DELETE | Auth | Clear all notifications |
| | `/api/operational/announcements` | GET | Public/Auth | Platform broadcast announcements |
| | `/api/operational/announcements` | POST | Admin | Create broadcast announcement |
| | `/api/operational/announcements/:id` | DELETE | Admin | Remove broadcast announcement |
| | `/api/operational/reports` | GET | Admin | System diagnostic reports |
| | `/api/operational/reports` | POST | Public | Submit client diagnostic report |
| | `/api/operational/reports/:id/acknowledge` | POST | Admin | Acknowledge system report |
| | `/api/operational/reports/:id/resolve` | PATCH | Admin | Resolve system report |
| **Analytics** | `/api/analytics/views` | POST | Public/User | Deduplicated view telemetry (once/user/prop/day) |
| | `/api/analytics/tour-opens` | POST | Public/User | Deduplicated 360 tour open telemetry |
| | `/api/analytics/agent` | GET | Agent/Admin | Headline metrics, funnel, financial volume, visits |
| **Dashboard** | `/api/dashboard/search` | GET | Auth | Cross-dashboard search across actions, pages, properties |
| | `/api/dashboard/user/stats` | GET | User | User dashboard counts and shortcuts |
| | `/api/dashboard/agent/stats` | GET | Agent | Agent portfolio health and priority action queue |
| | `/api/dashboard/admin/stats` | GET | Admin | Platform overview (non-admin accounts, Available Now, etc.) |
| | `/api/dashboard/users` | GET | Admin | Platform users list (passwords stripped) |
| | `/api/dashboard/properties/:id/approve` | POST | Admin | Approve property listing |
| | `/api/dashboard/properties/:id/reject` | POST | Admin | Reject property listing with reason |
| | `/api/dashboard/properties/:id/archive` | POST | Admin | Archive property listing |
| | `/api/dashboard/agents/:id/verify` | POST | Admin | Verify agent RERA license |
| | `/api/dashboard/agents/:id/reject` | POST | Admin | Reject agent verification with reason |
| **Media** | `/api/media/upload` | POST | Auth | Upload avatar (2MB), property (5MB), tour360 (15MB), chat (5MB) |
| | `/api/media/sign-upload` | POST | Auth | Cryptographic signature for direct Cloudinary upload |
| | `/api/media/file/:category/:filename` | GET | Public | Safe static file streaming (`nosniff`, `CSP`) |

---

## 5. Security & Architectural Decisions

1. **Server-Authoritative Roles & Boundaries**:
   - The server is the sole authority regarding role privileges (`user`, `agent`, `admin`).
   - Public registration permits only `user` and `agent` accounts. Admin signup is strictly blocked.
   - Google sign-in is strictly restricted to `user` accounts.
   - Unverified agents are prevented from publishing listings or approving transactions.

2. **Simulated Payments**:
   - Zero real money or external payment gateway credentials.
   - Idempotent transaction generation (`TX-2026-XXXXXX`) and simulated receipts (`REC-2026-XXXXXX`).
   - Buy transactions mark property `isSold: true` and record buyer.
   - Rent transactions mark property `isLeased: true` and set tenant and 1-year lease dates.

3. **Ratings Grounded in Real Transactions**:
   - Only authenticated users with a completed Buy or Rent transaction can rate an agent.
   - Visit bookings alone, pending payments, or cancelled transactions are strictly ineligible.
   - One rating (1-5 stars) per transaction; re-submitting updates the existing rating.

4. **Upload Policy & Security**:
   - MIME type verification and category size limits enforced by multer middleware.
   - File extensions validated against allowed whitelists.
   - Safe streaming headers (`X-Content-Type-Options: nosniff`, restrictive Content Security Policy).
