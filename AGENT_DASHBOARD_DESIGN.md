# Porch Light — Agent Dashboard Design Specification

## 1. Overview & Purpose
- **Route Namespace**: `/agent/*`
- **Authorized Role**: `ROLES.AGENT` (Guarded via `<RequireRole allowedRoles={[ROLES.AGENT]}>`)
- **Tone & Mood**: Professional, architectural ledger style. Calm, high-density, structured rows, Swiss metric typography, and clear status tags.
- **Verification Gate**:
  - **Verified Agents (`isVerified: true`)**: Full access to publish listings, manage visit requests, reply to client inquiries, and request premium promotions.
  - **Pending Agents (`isVerified: false`)**: Can access dashboard overview, view draft/pending listings, and view verification requirements, but cannot publish live listings until reviewed and approved by an Administrator.

---

## 2. Ordered Sidebar Navigation

The Agent sidebar displays the following 11 items in fixed logical order:

| Index | Navigation Label | Target Route | Purpose & Key Content |
| :---: | :--- | :--- | :--- |
| 1 | **Overview** | `/agent/overview` | Active listings count, pending reviews, visit activity, unread inquiries, recent task queue |
| 2 | **Sales Analytics** | `/agent/analytics` | Recorded traffic metrics: views, inquiries, scheduled visits, and completed acquisition/lease outcomes |
| 3 | **My Listings** | `/agent/listings` | Agent’s own property portfolio, lifecycle status, edit shortcuts, and availability controls |
| 4 | **Add Property** | `/agent/new-listing` | Structured property creation flow, photo limits & compression, and 360° tour integration |
| 5 | **Visit Requests** | `/agent/visits` | Inbound buyer/tenant booking calendar, Accept / Decline actions with client notes |
| 6 | **Messages & Inquiries**| `/agent/inquiries` | Direct inquiries and multi-party chat channels with buyers, including file attachments |
| 7 | **Transactions** | `/agent/transactions` | Simulated transaction ledger for the agent’s own properties, token advances, and move-in leases |
| 8 | **Premium Promotions** | `/agent/promotions` | Promotion request flow for eligible listings, simulated fee checkout, and review status |
| 9 | **Notifications** | `/agent/notifications` | Platform notifications, visit updates, admin listing approvals, and verification broadcasts |
| 10 | **Profile & Verification**| `/agent/profile` | Professional credentials, brokerage agency, RERA certificate attachment, and contact info |
| 11 | **Help & Support** | `/agent/support` | Concierge support desk, listing compliance inquiries, and administrator communication |

---

## 3. Page Specifications & Content Hierarchy

### 3.1 Overview (`/agent/overview`)
- **Header Block**:
  - Heading: `font-serif text-3xl sm:text-4xl text-deep-purple font-medium` (`Agent Sanctuary Desk — Priya Nambiar`)
  - Subtitle: `font-mono text-xs text-dark-gray/60 uppercase tracking-widest` (`Malabar Heritage Realty • Verified RERA Agent • Kochi`)
- **Summary Metrics (Ledger Style)**:
  - **Active Listings**: Approved live listings (`status: 'approved'`).
  - **Awaiting Review**: Newly submitted listings awaiting Admin approval (`status: 'pending'`).
  - **Upcoming Visits**: Scheduled client walkthroughs for this week.
  - **Unread Inquiries**: Open client message threads needing responses.
- **Action Needed Queue**:
  - High-priority table of incoming visit requests pending confirmation and new inquiries.
- **Pending Agent Alert**:
  - If `isVerified === false`, a calm porcelain/amber banner alerts the agent: *"Account Pending Verification: Your submitted brokerage credentials and RERA license are currently under review by Porch Light Administrators. You may draft listings, but they will be published only after verification."*

### 3.2 Sales Analytics (`/agent/analytics`)
- **Restoration Backup**:
  - Full restorable backup preserved at: `backups/agent-analytics-rebuild-20261104/AgentAnalyticsPage.jsx.bak` and `backups/agent-analytics-rebuild-20261104/agentAnalyticsSelectors.js.bak`.
  - Restoration guide documented at: `backups/agent-analytics-rebuild-20261104/RESTORE_INSTRUCTIONS.md`.
- **Design Philosophy**:
  - Grounded strictly in the Porch Light design system: porcelain background (`#FAF7F2` / `var(--porcelain)`), ruled rows (`border-charcoal/10`), large serif numerals (`font-serif`), deep purple accents (`#5E4F7A`), and restrained typographic hierarchy.
  - Clean sections, flat layout, zero nested boxes, and no heavy chart libraries or fake metrics.
  - Answers core operational questions:
    1. *What is my traffic and engagement trend?*
    2. *How is my client reputation trending?*
    3. *What transaction volume has been recorded through escrow?*
    4. *Which specific listings need attention or are performing best?*

#### Rebuilt Page Structure & Specifications
1. **Header, Period Selector, & Insight**:
   - Mono eyebrow: `PORTFOLIO` with subtle `Demo data` tag displayed only when seeded development data is active.
   - Large serif title: `Sales and traffic analytics`.
   - Compact period selector: `7 days`, `30 days`, `90 days` (default: 30 days). Fetches authoritative backend data from `GET /api/analytics/agent?period=...`.
   - Deterministic rule-based insight sentence generated directly from live analytics data (view-to-inquiry ratios, top-viewed quiet listings, and period deltas with zero AI hallucination). Plain fallback ("Activity is steady this period") when comparisons are unavailable.

2. **Four Summary Performance Figures (Row on desktop, 2x2 on mobile)**:
   - **Unique Views**: Unique listing views during the period, comparing against preceding period of equal length (`delta vs prev`).
   - **Inquiries**: Inbound client inquiry messages received in the period, with preceding period comparison.
   - **Leased in Period**: Residences leased in the selected period, with secondary lifetime leased count.
   - **Sold in Period**: Residences sold in the selected period, with secondary lifetime sold count.

3. **Lifetime Unique View Deduplication Rule**:
   - Unique view per signed-in user per property for lifetime, enforced in MongoDB via unique compound index `{ propertyId: 1, userId: 1, type: 1 }` with partial filter `{ userId: { $ne: 'guest' } }`.
   - Reopening or refreshing a property never increments the view counter.
   - Listing owners (`agentId`, `customId`, `_id`) and platform Administrators viewing their own listings are strictly excluded from view recording and count metrics.
   - Displayed summary totals and the property performance table share the exact same canonical definition.

4. **Full-Width Rating Analytics**:
   - Overall star rating numeral (arithmetic average rounded to 1 decimal place), total verified rating count, and interactive 5-star distribution breakdown bar.
   - Deterministic rating trend note (e.g. most frequent verified star count or period score comparison).
   - Star-only display with zero client PII or written reviews, strictly scoped to the authenticated agent's listings.

5. **Recorded Ledger & Money Overview**:
   - Clear distinction between recorded client payments and agent earnings.
   - Itemized cards: Total Volume Recorded, Rent Received, Sale Payments Recorded, and Scheduled Obligations (monthly rent from active leases and monthly EMI installments from financing plans).
   - **Scheduled Obligations Breakdown**: Ruled ledger table listing upcoming rent and EMI obligations for the agent's active portfolio. Includes Property Title (with link to property details), Installment Typology & Number (`Rent #N` vs `EMI #N`), Due Date (formatted in Indian locale), Amount (`₹formatINR`), Status Pill (`Upcoming`, `Due Today`, `Overdue`), and View Property action.
   - Action link directly navigating to `/agent/transactions`.
   - Mandatory disclaimer: client transaction amounts are logged in Porch Light escrow records; agent brokerage commissions and payouts are settled externally and are not platform revenue.

6. **Property Performance Table & Mobile Cards**:
   - High-density desktop table and mobile stacked cards with columns: Property title & city, period Unique Views, period Inquiries, period Visits, and Status badge.
   - Sorting dropdown: Views, Inquiries, Visits, Price (High-Low / Low-High).
   - Filters: Listing Type (All, Buy, Rent) and Status (All, Active, Pending, Closed).
   - Search input with clear filter reset button. Clicking any row navigates directly to the property's public details page.

7. **Data States & Guards**:
   - Graceful `DashboardSkeleton` during fetch.
   - Recoverable error banner with "Retry" button.
   - Clean empty state for agents with no listings.
   - Verification notice blocking unverified agents with guidance to return to Overview.

### 3.3 My Listings (`/agent/listings`)
- **Ownership Scope**:
  - Strictly limited to properties where `p.agentId === currentUser.id`. Agents cannot view or modify other agents’ listings.
- **Two-Button Property-Card Architecture**:
  - Replaced legacy multi-button action grids with **exactly two canonical actions** per listing card:
    - **"Preview"**: Navigates directly to the live public/authorized Property Detail View (`/property/:id`).
    - **"Manage"**: Navigates directly to the central Property Management console (`/agent/properties/:id`).
  - All operational workflows (editing content, pricing changes, photo gallery curation, promotion checkout, payments & receipts, lease termination review, external sale recording, and deletion) are centralized on the Property Management page.
  - Cards retain key metadata: status badges (`Approved`, `Pending`, `Sold`, `Leased`, `Rejected`), listing type, featured badge, RERA ID, price/rent, bedrooms/bathrooms, carpet area, and city.
  - Non-interactive status notification pills alert the agent to urgent operational states without cluttering buttons:
    - *"Tenant Early Exit Requested — Manage"*
    - *"Pending Handover Inspection — Manage"*
- **Filtering & Search Controls**:
  - Primary Status Tabs: `All`, `Approved`, `Pending`, `Sold / Rented`, and `Rejected`.
  - Secondary Filters: Buy / Rent (`all`, `sale`, `rent`), City dropdown, Property Type dropdown.
  - Text Search & Clear Action: Live substring search with a visible **"Clear filters"** button when active.
  - Sorting Dropdown: `Newest First`, `Price: Low to High`, `Price: High to Low`, and `Area: Largest`.

### 3.4 Central Property Management Console (`/agent/properties/:id`)
- **Single Destination for Listing Lifecycle**:
  - Replaces fragmented edit modals and multi-route actions with a tabbed management console at `/agent/properties/:id`.
  - Authorized strictly for the property's managing agent (`p.agentId === currentUser.id`) or platform administrators.
  - Route aliases (`/agent/properties/manage/:id`, `/agent/properties/edit/:id`, `/agent/edit-listing/:id`, `/agent/listings/edit/:id`, `/agent/new-listing?editId=...`) automatically redirect here.
- **Reliable Back Navigation**:
  - The back button explicitly navigates to `/agent/listings` ("Back to My Listings") regardless of how the page was reached (from Analytics, direct URL, or refresh), avoiding payment pages or broken browser history.
- **Readability & High-Contrast Typography System**:
  - Upgraded font sizes, weights, and contrast throughout: display headings in Instrument Serif (`text-2xl sm:text-3xl font-medium text-deep-purple`), section titles in serif (`text-xl sm:text-2xl font-medium text-charcoal`), body copy in Manrope (`text-sm sm:text-base leading-relaxed text-charcoal/85`), and labels/controls in Space Mono (`text-xs uppercase tracking-wider font-medium text-charcoal/80`).
  - Monetary values formatted with `RupeeSymbol` and clean, non-overbolded numbers (`text-base sm:text-xl font-serif font-medium`).
  - Touch targets minimum 38–44px for buttons and form controls.
- **8 Structured Management Tabs**:
  1. **Overview & Specs**:
     - Key metrics: Lifetime unique views (deduplicated per user), visit requests, transactions, and payment plans.
     - Immutable Architectural & Legal Specifications Card: Carpet area, super area, bedrooms, bathrooms, floor level, total floors, coordinates, state RERA license number.
     - Urgent operational status banners: Tenant Early Exit Requested, Pending Handover Inspection, Archived Listing.
  2. **Listing Content (Edit)**:
     - Agents can edit property information across all listings, including sold and actively leased properties.
     - Status-dependent notices explain that updates to sold or leased properties update listing records and buyer/tenant documents, but will not return the residence to public discovery or allow new purchases.
     - Editable: Architectural narrative description, asking price / monthly rent, private negotiation toggle ("Price on Request"), rental security deposit & maintenance terms, 5-photo gallery, and 360° virtual tour link.
     - 5-Photo Architectural Gallery: Local upload with client-side WebP compression, remote image URL input, cover image selection, photo reordering, and photo deletion.
     - 360° Virtual Tour: Unlocked exclusively for residences with verified Premium status (`isPremium: true`).
  3. **Visit Requests (Inbound Walkthrough Scheduling)**:
     - Directly displays visit requests scoped strictly to this property.
     - Filter pills: `All`, `Pending`, `Confirmed`, `Completed`, `Declined`.
     - Request cards display client name, preferred date & time slot, contact tel/email, and walkthrough notes.
     - Actions: Confirm visit, Decline visit, Cancel appointment, and Mark Completed (enabled once the scheduled visit date/time has arrived).
     - User-initiated reschedule requests appear in high-priority banners with one-click Accept New Time and Decline actions, immediately dispatching notifications and updating booking records.
  4. **Payments & Receipts**:
     - Real backend transaction ledger strictly scoped to the listing (`payments.filter(p => p.propertyId === id)`).
     - Full purchase details: Buyer name, settlement date, transaction reference, amount paid, and downloadable PDF receipt via `generatePaymentReceiptPDF`.
     - EMI financing details: Down payment records and installment transaction history.
     - Rental ledger: Initial move-in deposit and recurring monthly rent payments.
     - Platform promotion fees and verified receipts.
     - Privacy boundary: Sensitive buyer payment instrument credentials (card numbers, bank accounts) are never exposed.
  5. **EMI & Rent Obligations**:
     - Grouped summary of active financing plans or residential leases for this residence.
     - Displays monthly obligation amount, next actionable due date, payment status, remaining principal balance or lease duration, and tenure progress.
  6. **Promotions**:
     - **Premium Tier**: Permanent verified upgrade (₹15,000 one-time fee) unlocking verified badge and 360° virtual tour across platform. Includes simulated payment checkout modal.
     - **Featured Showcase**: Unpaid 14-day editorial placement on homepage ("Top Residences Worth the Visit"). Submits request to Admin queue; alerts agent if 4-slot capacity is reached and places property on waitlist.
     - Sold and actively leased properties preserve their status and will never appear as available for sale or rent on the public showcase.
  7. **Lease Management (Rental Residences)**:
     - Active lease overview: Tenant identity, lease period, monthly rent, and security deposit held in escrow.
     - **Tenant Early Cancellation Review**: When a tenant requests early lease termination from `/dashboard/properties`, the agent reviews the request (Approve & End Lease vs Decline Request).
     - **Agent-Initiated Rental Termination**:
       - Enforced by backend: only enabled after the rent for at least one complete rental month has been successfully paid and recorded in the ledger.
       - If eligible, agent specifies effective end date and reason via confirmation modal. Future rent schedule installments are stopped, property enters `pending_handover`, and notifications are dispatched.
       - If not eligible, a clear explanatory guard banner displays the upcoming eligibility date.
     - **Handover Inspection Confirmation**: Once tenant vacates, the agent confirms handover completion, returning listing to public `rentalStatus: 'available'` and `isLeased: false`.
  8. **Lifecycle & Archival**:
     - **Record External Sale**: For residences sold outside the platform (private sale, deed transfer), captures Sale Date, Buyer Name, Deed/Registration ID, and Agent Notes, updating availability to `sold` without fabricating artificial platform payments or fake receipts. Active EMI purchases count as sold.
     - **Listing Deletion & Safe Archival**:
       - Reversible soft-delete / archival (`isArchived: true, status: 'archived'`): Listings with historical financial transactions, payment schedules, sold status, active leases, or scheduled visits are safely archived, permanently preserving all transaction, receipt, rating, and regulatory audit compliance records.
       - Completely clean, unencumbered listings are permanently hard-deleted.
       - Archived listings can be restored to active management at any time via "Restore Listing from Archive".

### 3.5 Add Property (`/agent/new-listing`)
- **Expanded Horizontal Layout**:
  - Utilizes available page content width (`max-w-6xl w-full mx-auto`), replacing narrow oversized card containers with a responsive multi-column layout that stacks cleanly on mobile devices.
- **Complete Parity with Property View**:
  The form captures all architectural, compliance, and connectivity data displayed on `/property/:id`:
  1. **Category & Core Details**:
     - Listing Type (`sale` / `rent`).
     - Property Classification (`PropertyTypeDropdown`): Custom portal dropdown rendering all 14 canonical types. Prefers downward placement when space is available, falls back to upward placement when space below is restricted, and dynamically clamps menu height to fit within the viewport with internal scrolling (`overflow-y-auto`). Rendered via React portal to `document.body` to avoid clipping by container `overflow: hidden`.
     - Title, Architectural Narrative description, Valuation / Monthly rent.
     - Private Price Negotiation Toggle: When enabled, flags `negotiable: true` and presents "Price on request" across public cards, maps, and Property View, concealing numeric values from public exploration.
  2. **Location & Coordinates**:
     - City (one of 9 supported cities), Locality, PIN code, Street address.
     - Triple Location-Entry Support:
       - Paste Google Maps link (resolves `@lat,lng`, `!3d!4d`, `?q=`, `?ll=`, `/place/lat,lng`).
       - Enter latitude and longitude coordinates manually.
       - Interactive Leaflet map preview (`h-80 sm:h-96`): standard Leaflet navigation restored (map surface dragging pans the map; scroll-wheel and touch pinch zoom; + / − zoom controls). Marker is draggable to set property coordinates. Preview, manual coordinates, Maps link, and saved numeric coordinates remain completely synchronized.
  3. **Architectural Dimensions & Spatial Layout**:
     - Shared field-applicability matrix (`getPropertyFieldApplicability(type, listingType)`) governs visibility and validation across all 14 property types. Irrelevant fields are hidden, safely ignored on submit, and automatically cleared on type switch.
     - Residential spaces: Bedrooms (BHK), Bathrooms, Balconies, Facing direction, Super Built-up area (sq ft), Carpet area (sq ft).
     - Land / Plot (`plot`): Plot Area (sq yd / cents), Zoning classification, Boundary wall status, and Road frontage width (ft). Suppresses all built-up, carpet, bedroom, bathroom, furnishing, and floor fields.
     - Commercial / Industrial / Warehouse: Clear Ceiling Height (ft), Dedicated Loading Docks, 3-Phase Power Load (kVA), Total Floors, Built-up Area. Suppresses residential bedrooms, balconies, and residential amenities.
     - Conditional Floor Fields (`getFloorFieldConfig`):
       - Unit-style buildings (`apartment`, `studio`, `penthouse`, `office`, `shop`, `commercial`): requires `Unit Floor Level` and `Total Floors in Wing/Building`.
       - Standalone structures (`villa`, `house`, `mansion`, `townhouse`, `farmhouse`, `warehouse`, `industrial`): requires only `Total Floors / Levels` and hides/clears unit floor level.
       - Land / Plot (`plot`): hides and ignores all floor fields.
       - Changing property type automatically clears inapplicable floor values so stale data is never saved.
     - Furnishing Status: Restored 3-button button-group selector (`Fully Furnished`, `Semi-Furnished`, `Unfurnished`) with clear active highlights and touch-friendly targets (≥ 44px).
  4. **Technical Specifications & Compliance**:
     - State RERA Registration ID (required; displays verified green badge).
     - Buy Specifics: Possession Status (`Ready to Move`, `Under Construction`, etc.), Property Age (`New Construction`, `1-3 Years`, etc.), Ownership Type (`Freehold`, `Leasehold`, `Cooperative Society`).
     - Rent Specifics: Available From (`Immediate`, etc.), Security Deposit, Monthly Maintenance, Minimum Lease Period (`11 Months`, etc.), Notice Period, Preferred Tenants, Pet policy toggle.
  5. **Utilities & Amenities**: Designated parking bays, Water supply architecture (supports `Corporation Supply`, `Borewell + Municipal`, `Well`, and `24/7 Treated Water`), 100% DG backup, 24/7 Security, Gated enclave, High-speed lifts, Fitness studio, Swimming pool, Landscaped garden.
  6. **Access & Urban Connectivity**: Approach road specification, Nearest transit/metro distance, Airport connectivity distance, Railway station distance, Hospital distance, Commercial center distance.
  7. **Gallery & Photo Management**:
     - Strict **5-photo maximum** combined limit across local device uploads and remote URLs (JPG, PNG, WebP).
     - Remote URL validation: confirms remote URL format and validates image loading before adding to gallery; rejects broken URLs.
     - Local uploads: automated client-side WebP compression (`max 2400px`, ~82% quality).
     - Uniform `aspect-4/3` preview container with backdrop blur layer and uncropped `object-contain` photo preview.
     - Interactive Photo Lightbox (`inspectImageIndex`): modal uncropped view with smooth navigation (Prev, Next, Cover selection, Close).
     - Interactive cover photo selection: choose any uploaded photo as the listing cover (prominently labeled with a cover badge and radio button).
     - Reordering controls: Move Left and Move Right buttons with photo index counter (`X / 5`).
  8. **Edit Property Mode Boundaries & Permitted Sections**:
     - In Edit mode (`?editId=...`), displays a read-only **Verified Property Identity & Compliance Banner** and comprehensive **Certified Specifications Summary** for context (Property ID, Listing Transaction Type, Property Classification, Physical & GPS Location, RERA Registration ID, Legal Ownership Title, Floor Level/Total Floors, Rooms, Area, Facing Direction, Furnishing, Utilities, and Connectivity).
     - Sections 2 through 6 (Location, Map Picker, Spatial Architecture, Compliance, Utilities, Connectivity) are completely omitted from editable form controls.
     - Agents may edit ONLY:
       1. **Narrative Description & Valuation Terms**: Listing Title, Architectural Narrative Description, Asking Price or Monthly Rent, Private Negotiation Toggle, and Rent valuation terms (Security Deposit, Maintenance Fee, Lease Period, Notice Period, Preferred Tenants).
       2. **Five-Photo Architectural Gallery**: Photos, photo order, and primary cover selection within the combined 5-photo maximum.
       3. **360° Virtual Tour Asset**: Permitted only when listing has approved Premium status. If not approved Premium, direct activation/toggle is prohibited; an informative gating card explains the requirement and links to `/agent/promotions`.
     - Ineligible listings (completed sales, active leases, pending handover, or active client transactions in escrow) are locked: UI renders a locked badge and the service layer (`updateProperty`) strictly rejects edit attempts with a descriptive error.
     - Saving permitted edits updates the same listing record in storage (`mockStore`), preserving all non-editable attributes and transaction records without duplicating listings.
  9. **360° Virtual Panorama & Premium Payment Workflow**:
     - 360° Panorama Viewer access is strictly governed by Premium tier status (independent of property price or typology).
     - Equirectangular 2:1 aspect ratio validation and live preview using `PanoramaViewer`.
     - Payment-Before-Submission Sequence: When the Agent selects Premium, clicking submit validates form fields and opens the Simulated Premium Checkout Modal BEFORE saving or submitting the listing. The form data is safely held in memory as a recoverable draft.
     - Only upon successful confirmation of simulated payment (₹15,000 fee, 30-day duration) is the listing saved and the linked Premium request logged.
     - If the agent cancels or closes checkout, no listing is created and no fee is logged; the form remains completely intact for editing or retry.
     - "Continue without Premium" fallback allows immediate submission without promotional fees.

### 3.5 Transactions & Activity (`/agent/transactions`)
- **Dual-View Architecture**:
  - Two prominent tabs: **Transaction Ledger** and **Property Obligations**.
  - **Transaction Ledger View**:
    - Complete audited historical ledger of simulated payments and escrow collections.
    - Canonical filter pills: `All`, `Full Purchases`, `EMI Installments`, `Rent Payments`, `Promotion Fees` (obsolete token payment filters are strictly eliminated).
    - Accurate classification badges: `Full Purchase`, `EMI Installment` / `EMI Down Payment`, `Rent Payment` / `Rental Deposit`, and `Marketing Fee`.
    - Live text search across ID, receipt number, property title, and client name, with clear reset button.
    - Sorting by date, amount, and status.
    - One-click client PDF receipt download via `generatePaymentReceiptPDF`.
  - **Property Obligations View (Grouped by Property)**:
    - Replaces repeated installment rows with exactly one summary entry per active property schedule.
    - Displays Property (title, locality, RERA ID), Obligation Type (`Monthly EMI Plan` or `Active Lease`), Next Due Date (with installment index), Next Amount Due, Tenure / Remaining Balance, and Status (`Upcoming`, `Due today`, `Overdue`).
    - **"View" Action**: Opens `PropertyObligationModal` in Agent mode, showing complete schedule timeline, financing or lease specifications, client escrow context, and remaining balance without allowing agent payment actions.
- **Strict Role & Ledger Filtering**:
  - Filters strictly to transactions associated with listings managed by the signed-in Agent (`agentPropIds.has(p.propertyId)`), plus the Agent's own promotion fee records.
- **Escrow vs. Marketing Expense Distinction**:
  - Client token advances and rental deposits are classified as **Client Escrow** (not Agent income).
  - Agent promotion payments are classified as **Marketing Fees** with distinct styling.
  - Prominent demo sandbox disclaimer stating that no real bank debits or commission payouts take place.

### 3.6 Visit Requests (`/agent/visits`)
- **Inbox & Calendar Views**:
  - List of visit booking requests sent by registered users for the agent’s listings.
- **Pending Schedule Changes**:
  - Displays "Schedule Updated by Client" badge whenever a user modifies the requested date or time for a pending visit.
- **Confirmed Visit Reschedule Review**:
  - When a user submits a reschedule request for an existing confirmed walkthrough, a dedicated comparison banner highlights the **Current Confirmed Time** alongside the **Proposed Replacement Time**.
  - **Accept New Time**: Updates the active appointment schedule, marks status confirmed, and dispatches confirmation notifications to both user and agent.
  - **Decline New Time**: Preserves the original confirmed visit intact without cancelling the appointment, notifying the user that the original time remains active.
- **Standard Actions**:
  - **Confirm Visit**: Accepts initial time slot and automatically dispatches notification to the buyer/renter.
  - **Decline Visit**: Declines the inbound walkthrough request with notification.

### 3.6 Messages & Inquiries (`/agent/inquiries`)
- **Inquiry Roster**:
  - Unified with the conversation threads initiated when users contact the agent from Property View (`PropertyChatModal.jsx`).
  - Sorted by most recent message timestamp. Includes client name, property title, unread indicators.
  - Mobile responsive: toggleable split view with back-to-list action.
- **Chat Workspace**:
  - Property thumbnail and key specs pinned to the thread header with direct link to listing.
  - Client profile badge.
  - Full Composer Attachment Capabilities: paperclip button, file validation (`validateAttachment`), image/PDF staging, removal before sending, upload progress indicator, and IndexedDB blob storage.
  - Multi-file attachment viewer and response composer with interactive image preview modal and file downloads.

### 3.7 Transactions (`/agent/transactions`)
- **Listing Ledger**:
  - Historical log of simulated payments and tokens collected for the agent’s listings.
  - Property title, buyer name, transaction reference (`TX-2026-XXXXXX`), amount, and timestamp.
  - Clear label: *"Simulated Demo Transaction — No real funds are disbursed."*

### 3.8 Premium Promotions (`/agent/promotions`)
- **Page Purpose**:
  - Self-serve hub allowing agents to request highlighted visibility and Home showcase placement for their top listings.
  - See **Section 4** for complete end-to-end promotion specification.

### 3.9 Notifications (`/agent/notifications`)
- Feed tracking admin listing approvals/rejections, visit bookings, and platform policy broadcasts.

### 3.10 Profile & Verification (`/agent/profile`)
- **Balanced 2-Column Responsive Layout with Full-Width Danger Row**:
  - Left column (`lg:col-span-2`):
    - Professional credentials form (`#credentials-section`): Representative Name, Agency/Firm Name, read-only system email, Business Phone, WhatsApp Contact Number, State RERA Registration License, and Primary Market City.
    - Inbound Client Channels: Accessible switch toggles with explicit text status (`Enabled` vs `Disabled`) and required contact detail validation (WhatsApp requires valid WhatsApp contact number, Phone requires business phone line). Synchronized directly with the public `ContactAgentModal`. Channels are presented to public clients only when enabled and when the respective contact detail is provided. Phone numbers are never treated as WhatsApp unless explicitly entered in the WhatsApp field. In-app messaging remains the primary platform communication channel.
    - Change Password section (`#password-section`): Verifies current credentials, validates new password (min 6 characters), requires confirmation, and dispatches a security alert notification to the agent upon change.
  - Right column (`lg:col-span-1`):
    - Professional Headshot Uploader (`#avatar-section`): Preview thumbnail, upload/change, and reset controls with automatic propagation across header, sidebar, listings, and messages.
    - RERA Verification Status Card: Strictly controlled by Admin (`Verified Partner` vs `Audit Pending`). Agents cannot self-verify or modify system roles. Updates to RERA license credentials submit to the platform audit queue.
  - Full-Width Bottom Row (`#danger-zone`):
    - Danger Zone: Request Account Deletion with clear warning styling (`bg-rose-50/70 border border-rose-300`).
    - Agents cannot delete their account immediately. Submitting creates a request for Admin review.
    - Pre-Approval Obligation Checks: Deletion cannot be approved while the agent has active listings, active leases, pending visit requests, pending transactions, or unresolved promotion requests. Specific blocking items and resolution paths (`/agent/listings`, `/agent/visits`) are displayed.
    - Notifications: Notifies Admin when an eligible request is submitted; notifies the Agent when Admin approves or denies it with review notes.
    - Cleanup on Approved Deletion: Deactivates agent account (`isDeactivated: true`), archives agent listings so they never appear in public listings (`/buy`, `/rent`), maps, search, or featured placements, cleans up promotions, and sanitizes private agent references from user purchase/rental receipts without erasing user ownership or transaction history. Active completed leases transition custodial management to Porch Light Concierge (`adm_1`). Permanent deletions do not send notifications to the deleted account.


### 3.11 Help & Support (`/agent/support`)
- Concierge ticketing system for agent inquiries regarding listing guidelines, verification assistance, and technical platform questions.

---

## 4. End-to-End Premium Promotion Workflow

The Premium Promotion workflow is designed consistently across both Agent and Admin interfaces:

```
[Agent: My Listings] ────────► [Agent: Request Promotion]
                                         │
                                         ▼
                               [Eligibility Validation]
                                         │
                                         ▼
                               [Configurable Duration & Fee]
                                         │
                                         ▼
                               [Simulated Demo Checkout]
                                         │
                                         ▼
                               [Status: pending_admin_review]
                                         │
                                         ▼
                               [Admin: Promotions Queue]
                                         │
                                ┌────────┴────────┐
## 4. Separated Premium vs. Featured Workflows

Premium listing status and Home featured showcase placement are **strictly separated concepts** with independent states, requests, and controls:

### 4.1 Premium Listing Status (Badge)
1. **Concept & Visibility**:
   - Premium is an architectural badge displayed across listings, map previews, and Property View. It does **not** automatically place the property in the front-page Top Properties carousel.
   - Enables 360° virtual tours on eligible listings.
2. **Request & Simulated Checkout**:
   - An Agent can request Premium status for an existing approved property they personally represent.
   - Shows the configured simulated fee (e.g. ₹15,000) and 30-day badge terms before checkout.
   - If unconfigured by Admin, the request is gracefully disabled with an explanatory banner.
   - Completing checkout logs a simulated `promotion_fee` in the payments ledger and submits the request (`status: 'pending_review'`) to Admin.
   - Duplicate prevention stops multiple active/pending charges for the same listing.
3. **Admin Decision**:
   - Admin approves or rejects the request in `/admin/promotions`.
   - On approval: sets `isPremiumAdminFlag = true` on the property (rendering the Premium badge everywhere). Does **not** set `featured: true`.
   - On rejection: does not apply the badge, records admin notes, and dispatches feedback.

### 4.2 Home Featured Placement (Top 4 Carousel)
1. **Strict 4-Slot Capacity**:
   - Featured placement is strictly limited to 1 of exactly 4 residences displayed on the Home page top carousel.
   - Independent of Premium status (a property may be Premium, Featured, both, or neither).
2. **Editorial Request & Waitlist Queue**:
   - An Agent can submit an editorial request for an approved, available property they represent.
   - Does not charge a fee unless a separate configured workflow exists.
   - If approved by Admin when active slots < 4: activates immediately for a 14-day window (`property.featured = true`, `property.featuredUntil = date`).
   - If approved by Admin when active slots = 4: joins the **Waitlist Priority Queue** (`status: 'waitlist'`, position #X).
   - Once an active showcase window concludes or an active property becomes sold/rented, the system automatically promotes the next waitlisted property into active rotation.
3. **Expiration & Unavailability Cleanup**:
   - `syncFeaturedPlacements()` continuously ensures expired or unavailable residences drop out of active rotation, notifying the Agent.

---

## 5. Mobile Dashboard Menu & Header Relationship

- **Opaque Porch Light Background**:
  - The mobile dashboard menu bar uses an opaque background (`bg-porcelain border-b border-charcoal/15 shadow-xs`) with strong typography contrast and appropriate z-index (`z-30`).
- **Dynamic Header Positioning**:
  - Subscribes to the shared `'porchlight-header-change'` event and inspects `document.documentElement.dataset.headerHidden`.
  - When the global header is hidden (scrolling down): the mobile menu bar smoothly transitions to `top-0` without leaving an empty 72px gap.
  - When the global header appears (scrolling up): the mobile menu bar transitions below it (`top-[72px]`) without overlapping content.
  - The mobile navigation drawer and desktop sidebar adapt to this dynamic offset.

---

## 6. Key Behavioral Boundaries & Design Rules

1. **Strict Ownership Isolation**: Agents can view and edit **only** their own listings.
2. **Pending Agent Safeguard**: Unverified agents cannot publish listings to public browse pages; Admin review remains mandatory.
3. **No Buying/Renting via Agent Accounts**: Agents are prohibited from using buyer/renter checkout or booking visits on other agents' listings.
4. **Non-Destructive Transaction Records**: Completed sales or leases are marked `sold` or `rented`; property records are never deleted.
5. **No Synthetic Earnings**: Do not invent commissions, bank payouts, or speculative fee splits.
6. **Separated Visibility State**: Premium status and Featured placement remain strictly decoupled. records are never deleted.
5. **No Synthetic Earnings**: Do not invent commissions, bank payouts, or speculative fee splits.
