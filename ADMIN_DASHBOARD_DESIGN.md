# Porch Light — Admin Dashboard Design Specification

## 1. Overview & Purpose
- **Route Namespace**: `/admin/*`
- **Authorized Role**: `ROLES.ADMIN` (Guarded via `<RequireRole allowedRoles={[ROLES.ADMIN]}>`)
- **Tone & Mood**: High-density architectural control center. Dense queues, split panes, Swiss typographic data tables, and rapid moderation workflows.
- **Security Boundary**:
  - The `admin` role is strictly immutable.
  - There is **no public Admin signup** flow under any circumstance.
  - Admin accounts are seeded in mock data (`admin@demo.com`) or provisioned through secure database initialization.
  - Registered Accounts metrics strictly count Users and Agents only (`role === 'user' || role === 'agent'`), excluding Admins from registration totals.

---

## 2. Ordered Sidebar Navigation

The Admin sidebar displays the following 10 items in fixed logical order:

| Index | Navigation Label | Target Route | Purpose & Key Content |
| :---: | :--- | :--- | :--- |
| 1 | **Platform Overview** | `/admin/overview` | Dynamic platform metrics: Available Now vs. All Properties, registered Users/Agents, urgent attention queues, simulated volume breakdown, and featured capacity |
| 2 | **Users & Agents** | `/admin/users` | Complete user directory, click-to-inspect agent verification modal, RERA credentials, portfolio stats, and account statuses |
| 3 | **Property Review** | `/admin/approvals` | Comprehensive Property Management console across all Buy/Rent records, status tabs, search/filters, dossier modal, approval/rejection, and safe archival |
| 4 | **Featured Homes** | `/admin/featured` | Strict 4-slot Home showcase curation ("Top Residences Worth the Visit"), priority waitlist queue, duration window adjustment, and automatic rotation |
| 5 | **Premium Promotions**| `/admin/promotions` | Review queue for permanent one-time paid Premium upgrades (unlocking 360° virtual tour and verified badge, no duration/expiration) |
| 6 | **Transactions & Revenue**| `/admin/transactions` | Full ledger of simulated demo transactions: Full Payments, EMI Installments, Rental Deposits, and Promotion Fees with simulation disclaimer |
| 7 | **Support Requests** | `/admin/complaints` | Role-scoped member and partner support tickets (Users & Agents), categories, multi-message conversation threads, and concierge reply composer |
| 8 | **Reports & System Issues**| `/admin/reports` | Scoped to client-side ErrorBoundary component exceptions, diagnostics, and multi-dashboard maintenance notice broadcaster (no complaints/flags) |
| 9 | **Notifications** | `/admin/announcements`| Platform-wide broadcast announcements and notification dispatch center |
| 10 | **Profile & Settings** | `/admin/settings` | Personal Admin profile separate from Platform Settings (one-time Premium fee, default Featured duration, moderation parameters) |

---

## 3. Page Specifications & Content Hierarchy

### 3.1 Platform Overview (`/admin/overview`)
- **Current Live Platform Snapshot**:
  - The period filter pills (`7D`, `30D`, `90D`, `All Time`) are **removed** from Admin Overview.
  - The page serves strictly as an all-time/current platform operational snapshot reflecting live aggregate data with a live pulse indicator. Period filtering remains reserved for dedicated analytical views.
- **Header Block**:
  - Heading: `font-serif text-3xl sm:text-4xl text-deep-purple font-medium` (`Platform Control & Moderation`)
  - Subtitle: `font-mono text-xs text-dark-gray/60 uppercase tracking-widest` (`Current Platform Snapshot • Porch Light India`)
- **Key Metric Indicators (Swiss Dense Grid)**:
  - **Available Now vs. All Properties**: Clarified availability metric showing public listings eligible for search and maps (`status === 'approved'`, not sold, not leased, not pending handover) over total registered records (e.g. `Available Now: 18 / 84 total properties`).
  - **Registered Accounts (Admins Excluded)**: Strictly counts Users and Agents only (`userCount + agentCount`, excluding Admins). Shows breakdown: `N Users, M Agents`.
  - **Pending Moderation Queue**: Real-time count of pending listing approvals and agent verifications.
  - **Front-Page Showcase Capacity**: Dynamic tracker showing occupied slots out of strict 4-slot ceiling (`N of 4 Slots Occupied`) plus waitlist queue depth.
  - **Simulated Transaction Breakdown**: Clear itemization of token advance volume, move-in rent deposits, and promotion fees.
  - **Platform Agent Reputation**: Star rating aggregate across all completed transactions.
- **Urgent Action Queues**:
  - Urgent pending listings, agent verification reviews, open support tickets, and direct shortcuts to administrative workspaces.

### 3.2 Users & Agents (`/admin/users`)
- **Directory Tabs**:
  - **Agents Tab**: Full roster with search and city filter. Agent cards display agency, RERA ID, base city, phone, WhatsApp, portfolio count, and verification status.
  - **Users Tab**: Client members with contact details, registration timestamps, and active transactions.
  - **Deletion Requests Tab**: Enforces obligation clearing before approving agent account deactivation.
- **Responsive Directory Reflow**:
  - Large & medium viewports render a high-density, cleanly ruled data table.
  - Small viewports (`< 768px`) automatically reflow to stacked agent/user cards, preventing horizontal scroll or clipped action buttons.
- **Agent Detail & Verification Modal**:
  - Triggered by clicking any agent row or card. Zero premature selection.
  - **Header-Aware Dynamic Positioning**: Container starts below the global fixed header (`useHeaderOffset()`, `style={{ top: `${headerOffset}px` }}`, `z-40`), ensuring the header (`z-50`) remains visible above the backdrop without overlapping, covering modal titles, or hiding close buttons.
  - **Accessibility & Focus Management**: Supports keyboard `Escape` to dismiss modal and automatically restores focus to the triggering element via `lastActiveElementRef`.
  - **Mobile Ergonomics**: Operates as a comfortable full-width sheet on mobile with `max-h-[calc(100dvh-${headerOffset}px-1.5rem)]` and internal smooth vertical scrolling.
  - Displays: Legal name, email, agency, office contact, WhatsApp, verified RERA license number, jurisdiction, account status.
  - Portfolio summary: Approved live listings, pending reviews, sold/leased properties.
  - Verification actions:
    - **Verify Agent** (`verifyAgent(id)`): Grants verified state and notifies agent immediately.
    - **Decline Verification** (`rejectAgent(id, reason)`): Requires a mandatory feedback reason and notifies the agent.
- **Privacy & Security Boundaries**:
  - No passwords or authentication secrets are exposed. Roles are strictly immutable.

### 3.3 Property Management Console (`/admin/approvals`)
- **Full Catalog Oversight (Zero Implicit Default Selection)**:
  - Shows searchable, filterable property table first. No property is selected by default to prevent accidental moderation decisions.
  - Opens focused inspection dossier modal only when an administrator explicitly selects a property.
- **Clean One-Line Status Pills (`PropertyStatusPill`)**:
  - Single-line, non-wrapping status badges (`whitespace-nowrap inline-flex items-center gap-1.5`) with concise labels:
    - `Available` (Emerald pill)
    - `Pending Review` (Amber pill)
    - `Sold` (Deep Purple pill)
    - `Leased` (Blue pill)
    - `Archived` (Sand/Gray pill)
    - `Declined` (Rose pill)
  - Includes descriptive `title` and `aria-label` tooltips explaining the operational state.
- **Responsive Table Reflow**:
  - On desktop/tablet, displays a full multi-column table (`hidden md:block`).
  - On mobile (`block md:hidden`), automatically reflows rows into stacked property cards with status pill, typology, pricing, agent name, and inspection button, completely eliminating horizontal clipping.
- **Inspection Dossier Modal**:
  - **Header-Aware Dynamic Positioning**: Backed by `useHeaderOffset()`, positioned at `top: headerOffset` (`z-40`), sitting cleanly below the global header (`z-50`).
  - **Keyboard & Focus**: Escape key dismisses modal; focus returns to the selected row or inspection button.
  - **Mobile Responsive**: Full-width sheet with `max-h-[calc(100dvh-${headerOffset}px-1.5rem)]` internal scrolling.
  - Photos gallery inspection with landscape/aspect check.
  - Specifications: Typology, transaction type, carpet/super area, furnishing, facing, floor level / total floors.
  - Financials: Asking price / monthly rent, advance deposit, maintenance charges.
  - Compliance & Agent: RERA registration number, representing agent credentials, and external sale audit details (deed ID, external buyer name, recorded sale date) when marked sold off-platform.
  - Moderation Actions & Lifecycle Auditing:
    - **Approve Listing**: Immediately publishes listing to public search and maps.
    - **Reject Listing**: Requires mandatory feedback explanation sent to agent.
    - **Archive Listing**: Safely archives listing from public visibility with mandatory reason.
    - **Delete Listing**: Protected deletion boundary; listings with transaction history, active payment schedules, active bookings, leases, or pending handover cannot be deleted and must be archived with clear audit trail.
    - **Lifecycle Status Inspection**: Full visibility into operational states (`Available`, `Pending Review`, `Sold`, `Leased`, `Tenant Early Exit Requested`, `Pending Handover`).

### 3.4 Featured Homes (`/admin/featured`)
- **Home Showcase Manager (`TopPropertiesSection.jsx`)**:
  - Curates the 4 showcase residences in "Top Residences Worth the Visit".
  - **Strict 4-Slot Capacity Ceiling**: Home showcase is strictly limited to 4 properties.
  - **Priority Waitlist Queue**: Excess approved requests enter an ordered waitlist queue and auto-advance when a slot opens.
  - **Window Adjustment**: Admins can adjust the placement duration window (e.g. 7, 14, 21, 30 days or specific calendar date).
  - **Remove from Slot**: Admins can unpin a residence, which automatically triggers `syncFeaturedPlacements()` to advance the top waitlisted property.
  - **Unpaid Editorial Workflow**: Distinct from paid Premium promotion.

### 3.5 Premium Promotions (`/admin/promotions`)
- **Review Queue for Permanent Premium Upgrades**:
  - Premium is a **permanent, one-time paid status** (`isPremium: true`, `isPremiumAdminFlag: true`).
  - Unlocks the verified gold star badge and 360° virtual tour capability across all listings, maps, and Property View.
  - **No Expiration / Duration**: Status does not expire.
  - **Single Active Request Enforcement**: Agents cannot request or pay for an already Premium property. Duplicate requests are blocked in both UI and service.
  - **Decisions**:
    - Approve: Permanently activates Premium status and notifies agent.
    - Reject: Requires mandatory feedback reason, notifies agent, and property remains standard.

### 3.6 Transactions & Revenue (`/admin/transactions`)
- **Platform-Wide Summary Statistics**:
  - 5-card summary row directly above the transaction table with uniform Porch Light typography (`font-serif text-2xl sm:text-3xl text-charcoal font-medium leading-none mb-1`):
    1. **Recorded Volume**: Gross transaction value across currently active filter selection + record count.
    2. **Successfully Collected**: Settled payment sum (`status === 'completed'`) and count.
    3. **Pending / Processing**: Unresolved payment amounts and count (`status === 'pending' || status === 'failed'`).
    4. **Scheduled Obligations**: Sum of next upcoming installments across all active EMI plans and residential leases + count of active property plans. Value typography strictly matches other summary cards.
    5. **Promotion Revenue**: Direct platform administrative fees from verified listing upgrades.
  - Figures stay synchronized in real time with the active category filter pills.
- **Category Breakdown Sub-Grid**:
  - 4-column itemized breakdown of records and volume across categories: Full Payments (`full_purchase`, `full_payment`), EMI Installments (`emi_down_payment`, `emi`, financing plans), Rent & Deposits (`rent_deposit`, `rent_installment`), and Promotion Fees (`promotion_fee`).
- **Escrow & Brokerage Settlement Notice**:
  - Prominent disclaimer: *"Brokerage payouts and partner commissions are handled externally. Gross transaction values represent client payments recorded through Porch Light escrow, while platform revenue is limited to administrative fees (such as verified promotions). All transactions are simulated for demonstration."*
- **Dual-View Ledger & Grouped Obligations Architecture**:
  - Tab switcher: **Transaction Ledger** vs **Property Obligations (Grouped)**.
  - **Transaction Ledger View**:
    - Chronological table (desktop) and stacked cards (mobile) of all recorded payments: Transaction ID & Receipt Number, Property Title & City, Payer / User, Category, Amount (₹ format), Date, and Status badge.
    - Filter pills: `All Transactions`, `Full Payments`, `EMI Installments`, `Rent & Deposits`, `Promotion Fees` (obsolete token payment filters are strictly eliminated).
  - **Property Obligations (Grouped) View**:
    - Platform-wide active payment plans summarized strictly by property.
    - Consolidates repeated future installments into one summary entry per active plan with property title, locality, RERA ID, plan type (`Monthly EMI Plan` or `Active Lease`), next due date, installment index, next amount due, remaining tenure / balance, and status.
    - Preserves individual historical payment records in the audit ledger.
    - **"View" Action**: Opens `PropertyObligationModal` in Admin mode for escrow inspection and audit details.

### 3.7 Support Requests (`/admin/complaints`)
- **Role-Scoped Support Desk**:
  - Inbound tickets from Users and Agents with submitter role (`Partner Agent` vs. `Member User`), email, category/topic tag, and timestamps.
  - Segregated from runtime exceptions and system issues.
- **Conversation Thread**:
  - Complete message history showing chronological messages from the user/agent and concierge responses from administration.
- **Concierge Actions**:
  - Interactive reply composer with quick actions: "Send Reply" (marks in progress), "Reply & Resolve", and "Reopen Ticket".
  - Status updates and replies automatically trigger in-app notifications linked to the ticket.

### 3.8 Reports & System Issues (`/admin/reports`)
- **Diagnostic Exceptions & Maintenance Center**:
  - Segregated to client-side component exceptions captured by React `ErrorBoundary` and diagnostic events (no user complaints).
  - Acknowledge and Resolve actions for diagnostic reports.
  - **Platform Maintenance Broadcast Publisher**: Admin can publish, target (`All`, `Users`, `Agents`), set priority (`info`, `warning`, `critical`), and set auto-expiry for system maintenance notices broadcast across dashboards.
- **Future Backend Telemetry Note**:
  - Explicit architectural documentation explaining how the diagnostic event collector connects to production observability platforms (Sentry, Datadog APM, OpenTelemetry) without fabricating fake server metrics.

### 3.9 Notifications & Announcements (`/admin/announcements`)
- Dispatch center for platform-wide announcements. Urgent announcements display the top warning banner.

### 3.10 Profile & Platform Settings (`/admin/settings`)
- **Clear Separation of Profile and Settings**:
  - **Administrator Personal Profile**: Legal name, emergency contact phone, headquarters base city, read-only system email, and profile photo.
  - **Change Password**: Validates credentials and updates security state.
  - **Platform Settings & Moderation Parameters**:
    - **One-Time Premium Fee (₹ INR)**: Permanent upgrade fee (no duration setting).
    - **Default Featured Showcase Duration (Days)**: Timed duration for front-page showcase (1 to 90 days, default 14).
    - **Inbound Requests Toggle**: Accepts or pauses partner requests.
    - **Architectural Curation Terms**: Curation guidelines.

---

## 4. Key Behavioral Boundaries & Design Rules

1. **No Public Admin Account Creation**: The signup page supports only User and Agent profiles. Admins cannot be created via public registration.
2. **Immutable Account Roles**: Account roles are set at creation and cannot be modified.
3. **Preservation of History**: Completed sale or lease transactions must be permanently preserved in the platform ledger. Listings with transaction history cannot be deleted and must be archived.
4. **Transparent Demo Labeling**: Simulated transaction volume and promotion fees must never be presented as real financial revenue.
5. **Accurate Error Reporting**: Only display actual error events captured by `ErrorBoundary` and diagnostic collectors; do not simulate fake DevOps or server infrastructure dashboards.
6. **Premium vs. Featured Disambiguation**: Premium is permanent, one-time paid, and unlocks 360° virtual tours. Featured is unpaid, timed (1-90 days), and strictly limited to 4 Home showcase slots with waitlist management.