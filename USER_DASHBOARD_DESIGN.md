# Porch Light — User Dashboard Design Specification

## 1. Overview & Purpose
- **Route Namespace**: `/dashboard/*`
- **Authorized Role**: `ROLES.USER` (Guarded via `<RequireRole allowedRoles={[ROLES.USER]}>`)
- **Tone & Mood**: Quiet, personal sanctuary ledger. Organized chronologically with a vertical timeline feel. Focuses entirely on home exploration, visit scheduling, saved wishlists, verified acquisitions, and lease records.

---

## 2. Ordered Sidebar Navigation

The User sidebar displays the following 10 items in fixed logical order:

| Index | Navigation Label | Target Route | Purpose & Key Content |
| :---: | :--- | :--- | :--- |
| 1 | **Overview** | `/dashboard/overview` | Personalized welcome, summary cards, upcoming visits timeline, recent activity, quick actions |
| 2 | **My Properties** | `/dashboard/properties` | Distinct tabs/sections for acquired homes (Bought) and active leases (Rented) |
| 3 | **Saved Homes** | `/dashboard/saved` | Grid of favorited properties with quick compare and visit actions |
| 4 | **Compare** | `/dashboard/compare` | Side-by-side comparative spec sheet (separate Buy vs. Rent sets, max 3) |
| 5 | **Visits & Bookings** | `/dashboard/visits` | Lifecycle of property visits: Requested, Confirmed, Declined, Upcoming, and Past |
| 6 | **Messages** | `/dashboard/chat` | Property-linked chat conversations with verified agents, with photo/PDF attachments |
| 7 | **Payments & Activity**| `/dashboard/payments` | Ledger of simulated token advances and rental deposits with PDF receipts |
| 8 | **Notifications** | `/dashboard/notifications` | Direct notification inbox for visit updates, message alerts, and announcements |
| 9 | **Help & Support** | `/dashboard/complaints` | Support inquiries, issue tickets, and contact history |
| 10 | **Profile & Settings** | `/dashboard/profile` | Personal details, city preference, contact information, demo role context |

---

## 3. Page Specifications & Content Hierarchy

### 3.1 Overview (`/dashboard/overview`)
- **Personalized Header**:
  - Heading: `font-serif text-3xl sm:text-4xl text-deep-purple font-medium` (`Welcome back, Aarav`)
  - Subtitle: `font-mono text-xs text-dark-gray/60 uppercase tracking-widest` (`Sanctuary Member • Bengaluru`)
- **Summary Metrics (Oversized Serif Numerals)**:
  - **Saved Homes**: Count of wishlist properties (e.g. `2 Saved`).
  - **Scheduled Visits**: Active upcoming visits (e.g. `1 Upcoming`).
  - **Active Inquiries**: Open conversations with agents (e.g. `1 Open Thread`).
  - **Acquisitions & Leases**: Confirmed transactions in store (e.g. `1 Property`).
- **Upcoming Activity Block**:
  - Highlighted card showing the immediate next visit: Property title, date, time slot, agent name, and a direct "Directions / Reschedule" link.
- **Recent Activity Feed**:
  - Ruled chronological timeline combining recent visit requests, sent inquiries, and completed token payments.
- **Quick Actions Row**:
  - Outlined pill button: "Explore Residences" (`/buy`). (Saved Wishlist shortcut is removed from header to prevent redundancy with the dedicated sidebar page).
- **Charts & Visualization Rules**:
  - Strictly limited to data the app actually captures (e.g. Monthly visits booked or inquiry frequency).
  - **PROHIBITED**: Seller-style conversion rates, lead pipelines, sales commissions, or market price forecast charts.


### 3.2 My Properties (`/dashboard/properties`)
- **Contextual Back Navigation**: Includes `DashboardBackButton` returning to `/dashboard/overview` or previous browser history within the dashboard context.
- **Segmented Control**:
  - **Acquisitions (Purchased)**: Properties where a token advance or full purchase payment was completed in demo mode.
  - **Leases (Rented)**: Active rental sanctuaries where move-in deposits were processed.
- **Status Tags Restyling**:
  - "VERIFIED PURCHASE": `bg-sand/95 text-deep-purple border border-deep-purple/30 shadow-xs backdrop-blur-xs font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1`.
  - "ACTIVE LEASE": `bg-sand/95 text-charcoal border border-charcoal/30 shadow-xs backdrop-blur-xs font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1`.
  - Perfectly matches the themed legibility of the nearby "RERA VERIFIED" tag without non-theme green or low-contrast transparent backgrounds.
- **Lease Dates & Early Cancellation Workflow**:
  - Displays explicit lease start and end dates (e.g., `Sep 2026 – Sep 2027`).
  - **Early Lease Exit**: Tenant can request early lease cancellation via modal (`requestLeaseCancellation`). The managing agent must explicitly agree before the lease is closed. While awaiting agreement, lease remains active and property remains unavailable to the public. If agreed, lease status updates to `ended` and property enters `pending_handover` until agent confirms handover. Clearly labeled as project demo workflow.
- **Card Presentation**:
  - 3:2 `SmartImage`, property title, locality/city, RERA verification tag, transaction date, simulated payment reference (`TX-2026-XXXXXX`).
  - Action buttons: "Receipt (PDF)", "Request Early Exit", "Contact Agent", "View Property".
  - **Star-Only Agent Rating Action**: For completed purchase or lease transactions, provides a "Rate Agent" button (or "★ N (Edit)" if already rated) opening `AgentRatingModal`. Updates propagate immediately across store and agent aggregates.

### 3.3 Saved Homes (`/dashboard/saved`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Content**:
  - Rendered from `savedPropertyIds` stored in `mockStore`.
  - Swiss-style property row cards with bedrooms, bathrooms, area, price/rent, and RERA badge.
- **Actions**:
  - Direct "Book Visit", "Add to Compare", and "Remove from Saved" toggles.
- **Empty State**:
  - *"Nothing here yet, but the porch light is on."*
  - CTA button: "Explore Curated Residences".

### 3.4 Compare (`/dashboard/compare`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Unified Architecture**:
  - Directly shares the exact same `ComparePage.jsx` component and `compareService` state layer as standalone `/compare` and all listings/map/property access points.
  - Separate tabs for **Buy Comparisons** and **Rent Comparisons**, preserving the maximum limit of **3 properties per comparison set**.
  - Immediate bi-directional synchronization: adding or removing properties in listings, map, or Property View reflects instantly in the dashboard view, and vice versa.
- **Matrix View & Responsive Mobile**:
  - Desktop side-by-side technical specification matrix: Pricing / Rent, BHK, carpet area, possession, furnishing status, amenities checklist, and RERA compliance.
  - Mobile stacked comparative cards with touch-friendly controls and quick-add third property suggestions.

### 3.5 Visits & Bookings (`/dashboard/visits`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Status Filter Tabs**:
  - `All`, `Confirmed`, `Pending`, `Past / Cancelled`.
- **Pending Visit Schedule Edit**:
  - For visits awaiting agent confirmation, users can directly edit their requested date, time slot, and client notes via "Edit Schedule".
  - Changes save to the shared booking record, remain `pending`, and dispatch an immediate notification to the responsible agent.
- **Confirmed Visit Reschedule Workflow**:
  - For already confirmed visits, users can submit a reschedule request proposing a replacement date and time slot with an optional note.
  - The existing confirmed appointment remains the active appointment while the proposed new time awaits agent review.
  - An amber/purple info banner displays the proposed replacement time and lets the user update it rather than creating conflicting requests.
  - When the agent accepts, the appointment is replaced and confirmed; if declined, the original confirmed visit is preserved without silent cancellation.
- **Cancellation Boundaries**:
  - Unaccepted/pending visit requests include a direct "Cancel Request" action with confirmation modal.
  - Past, completed, or cancelled visits cannot be rescheduled or edited.
- **Compact 2-Row Action Layout & Fluid Vertical Growth**:
  - Visit card action buttons are arranged in a compact 2-row grid layout (`w-full md:w-[320px] lg:w-[340px] shrink-0`), accommodating up to four actions without crowding property details.
  - **4 Actions (Pending)**: Row 1 (`Edit Schedule`, `Cancel Request`), Row 2 (`Message Agent`, `Property`).
  - **3 Actions (Confirmed)**: Row 1 (`Request Reschedule` or `Modify Reschedule` spanning full width), Row 2 (`Message Agent`, `Property`).
  - **2 Actions (Past / Cancelled)**: Row 1 (`Message Agent`, `Property` side-by-side).
  - **1 Action**: Full-width or single column touch-friendly button.
  - All action triggers maintain accessible `min-h-[44px]` touch targets with centered labels and themed Porch Light styling.
  - Cards grow naturally when property name, address, notes, or alert banners wrap; no fixed card heights, clipping, or overlap.
  - On narrow/mobile screens, cards stack vertically with property information above and the touch-friendly 2-row grid cleanly below.
- **Card Detail**:
  - Property thumbnail and title, scheduled visit date, time slot, location, notes, and agent contact shortcuts.

### 3.6 Messages & Inquiries (`/dashboard/chat`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Thread List & Active Stage**:
  - Property-linked conversations with verified agents, file/photo attachments, lightbox preview, and real-time synchronization.

### 3.7 Payments & Activity (`/dashboard/payments`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Authoritative Scheduled Payment Architecture**:
  - Two primary tabs: `Upcoming Schedules` and `Payment History`.
  - **Upcoming Schedules Tab (Grouped by Property)**:
    - **Single Summary Entry per Property**: Eliminates repeated rows of future installments. Each active EMI financing plan or residential lease is rendered as exactly one summary entry for that property.
    - **Upcoming EMI Plans Section**: Summarizes the active EMI plan with recurring monthly amount, next due date, next installment number (`Installment #X of Y`), remaining months left, and remaining loan balance.
    - **Upcoming Rent Obligations Section**: Summarizes the active lease with monthly recurring rent amount, next upcoming rent due date, active lease tenure, and current status (`Upcoming`, `Due today`, `Overdue`).
    - **Actions**:
      - **"View Plan" / "View Lease"**: Opens `PropertyObligationModal` displaying complete schedule details, RERA registration, financing/lease terms, down payment / security deposit context, and full installment overview.
      - **"Pay Now"**: Opens the existing in-app payment modal (`InstallmentPaymentModal`) for the next actionable due installment, using UPI, Card, or NetBanking.
  - **PropertyObligationModal Component**:
    - Calm, responsive, keyboard-accessible (`Escape`), scroll-locked Porch Light themed modal.
    - Displays property thumbnail, location, RERA/Ref ID, monthly commitment, next due date with status badge, remaining balance, tenure, and detailed financing or lease terms.
    - For Users, includes an actionable "Pay Next Installment / Rent" trigger when an installment is due.
  - **InstallmentPaymentModal Component**:
    - Uses existing in-app payment methods (`UPI`, `Card`, `NetBanking`) matching Property View and Checkout.
    - Deterministic 3-step escrow verification simulation.
    - Dev-mode "Force simulated failure" toggle for failure state testing.
    - Atomic backend payment recording (`POST /api/payments/schedules/:id/installments/:num/pay`), strictly preventing duplicate or double payments.
    - On confirmed payment, offers an instant "Download Receipt" action generating a branded PDF via `generatePaymentReceiptPDF`.
  - **Payment History Tab**:
    - Unified ledger tracking all executed and historical transactions (full purchases, down payments, move-in deposits, EMI installments, and rent installments).
    - Compact themed filter pills: `All`, `Full Purchases`, `EMI Installments`, `Rent Payments`.
    - Instant text search across transaction IDs, receipt numbers, property titles, and payment methods.
    - Dedicated Agent Rating column for completed transactions with `AgentRatingModal` integration.
    - Direct PDF receipt download for all completed ledger items.

### 3.8 Notifications (`/dashboard/notifications`)
- **Universal Synchronization**:
  - Count badge reflects only unread notifications, strictly synchronized with the global header notification bell.
  - Opening/viewing a notification immediately marks it as read and decrements both page and header badges.
- **Actions & Search**:
  - Filter pills: `All`, `Unread`, `Visits`, `Messages`, `Payments`.
  - Live search input.
  - Individual delete action (`Trash2`) and "Delete All" action with modal confirmation. Deletions are strictly scoped to the active user's notifications.

### 3.9 Help & Support (`/dashboard/complaints`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Support Ticket Form**:
  - Cancel action is explicitly labeled "Cancel ticket" with an `X` (close/cancel) icon rather than a plus icon.
  - Clean separation between form submission and ticket cancellation to prevent accidental submissions.

### 3.10 Profile & Settings (`/dashboard/profile`)
- **Contextual Back Navigation**: `DashboardBackButton` fallback to `/dashboard/overview`.
- **Balanced 2-Column Responsive Layout with Full-Width Danger Row**:
  - Left column (`lg:col-span-2`):
    - Legal personal details form (`#personal-details`): Full legal name, read-only email, contact phone, base city.
    - Change Password section (`#password-section`): Verifies current credentials, validates new password (min 6 characters), requires confirmation, and dispatches a security alert notification to the user upon change.
  - Right column (`lg:col-span-1`):
    - Profile Photo Uploader card (`#avatar-section`): Avatar preview, client-side compression (<150KB), photo change, and remove actions. Propagates immediately to header, sidebar, and messaging.
    - Account Role card displaying immutable `User (Member)` status.
    - RERA Statutory Audit note detailing data preservation rules.
  - Full-Width Bottom Row (`#danger-zone`):
    - Danger Zone: Account Deactivation in a full-width row clearly separated from ordinary profile editing.
    - Explicit red warning treatment (`bg-rose-50/70 border border-rose-300`, `text-rose-950`, destructive red button `Trash2`).
    - Multi-step confirmation modal with active obligation checks: blocks deactivation while the User has an active lease, pending payment/transaction, or unresolved active walkthrough booking (`status: 'pending'` or `'confirmed'`). Explains specific blocking items and provides direct support paths (`/dashboard/complaints`). If permitted, anonymizes personal details while preserving transaction/property audit trails for statutory RERA compliance.

---

## 4. Key Behavioral Boundaries & Design Rules

1. **Strictly Buyer/Tenant Experience**: Users cannot list, publish, or sell properties. Seller dashboards, listing creation forms, and sales analytics are completely absent from `/dashboard/*`.
2. **Advisory Financial Estimates**: EMI figures and affordability calculations from property pages are informative benchmarks. The dashboard must never present them as invoices or debts owed to Porch Light.
3. **No Synthetic Data Generation**: Every view reads exclusively from `mockStore.getState()`. If the user has not completed a transaction, `My Properties` cleanly shows an empty state rather than inventing fake deed records.
4. **Preservation of Audit History**: Account deactivation anonymizes user profile identity while permanently preserving completed purchase receipts and ended lease contracts.

