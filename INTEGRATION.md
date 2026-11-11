# Backend Integration Map — Porch Light

> [!IMPORTANT]
> **Architecture & Migration Status: FULL MONGODB INTEGRATION COMPLETED**
> - The backend service runs strictly inside `Porch_server/` (Node.js, Express, MongoDB as the sole source of truth with zero localStore fallback, JWT, bcryptjs, Helmet, CORS, and HttpOnly cookies).
> - **MongoDB Exclusivity:** All application data is persisted exclusively in MongoDB. File-based mock stores (`localStore.json`) have been removed from the server, and failing connections safely return HTTP 503 instead of silently writing to temporary files.
> - **Frontend Decoupling:** All frontend dashboard and property views now read and write directly through `src/services/` calling authoritative `/api/*` endpoints. Legacy mock store subscriptions (`mockStore.subscribe`) and dev role-switcher components (`DevRoleSwitcher.jsx`) have been completely decoupled and removed from runtime views.
> - **Development Database Seeded (`porch_light`):** Deterministic, idempotent development seed (`npm run seed:dev`) targets the configured MongoDB database `porch_light` (confirmed no writes to `test`). Entities seeded: 1 Admin (`navaneethestate56@gmail.com`, stored strictly as bcrypt hash with salt rounds=12; plaintext passwords never committed), 4 Users, 3 Approved Agents (owning 9 properties each = 27 total), 1 Pending Agent (0 properties), 27 Properties across 9 Indian cities (17 available, 4 leased, 2 sold, 2 pending, 2 rejected; 5 premium with 360 tours, 4 featured showcase with 5 gallery images each), 5 Payments, 3 Ratings, 2 Bookings, 1 Chat thread, 1 Complaint, 3 Notifications, 1 Announcement, 2 SystemReports, and 52 AnalyticsEvents.
> - **Zero Component Couplings:** Frontend React components, forms, hooks, and views never import database drivers, execute Mongoose queries, or access server-only secrets. All business rules, role authorizations, and data persistence remain strictly mediated through the backend API.

| Service Function | Target HTTP Method & Endpoint | Description |
| :--- | :--- | :--- |
| **Auth** | | |
| `login({ email, password })` | `POST /api/auth/login` | Authenticate user, return JWT cookie/session |
| `register(userData)` | `POST /api/auth/register` | Register user or agent profile |
| `loginWithGoogle()` | `POST /api/auth/google` | OAuth Google SSO handler (User accounts only; Agent/Admin prohibited) |
| `logout()` | `POST /api/auth/logout` | Invalidate session / clear cookies |
| `getCurrentUser()` | `GET /api/auth/me` | Fetch active user credentials & role |
| `updateUserProfile(data)` | `PATCH /api/auth/profile` | Update profile fields and avatar URL in MongoDB. Avatars uploaded via `POST /api/media/upload` (multipart/form-data with category `avatar`) return canonical paths `/api/media/file/avatar/:filename`, rendered with defensive fallback initials on error. `GET /api/auth/profile` serves as alias to `GET /api/auth/me`. |
| `updatePassword({ currentPassword, newPassword })` | `PATCH /api/auth/password` | Verify current credentials and update password (min 6 characters). Does not store plaintext password in profile data. Dispatches security alert notification to account owner. |
| `canDeleteAccount(userId)` | `GET /api/auth/account-deletion-check` | Check for active obligations blocking user account closure (active leases, pending payments, or unresolved active walkthrough bookings). |
| `deleteOrDeactivateAccount(userId)` | `DELETE /api/auth/account` | Deactivate account and anonymize personal details while preserving transaction and property audit history for RERA transparency. |
| `getAgentDeletionObligations(agentId)` | `GET /api/auth/agent-deletion-obligations` | Check agent portfolio obligations: active listings, active leases, pending visit requests, pending transactions, and pending promotions. |
| `requestAgentAccountDeletion({ agentId, reason })` | `POST /api/auth/agent-deletion-request` | Agent submits account closure request for Admin review. Dispatches notification to Admin (`adm_1`). |
| `getAgentDeletionRequests()` | `GET /api/auth/agent-deletion-requests` | Admin retrieves pending and historical agent account deletion requests. |
| `approveAgentAccountDeletion(requestId, adminNotes)` | `POST /api/auth/agent-deletion-requests/:id/approve` | Admin approves deletion: verifies obligations are clear, deactivates agent, archives listings from search/maps/featured, cancels promotions, sanitizes private agent references from user transaction snapshots without erasing user records, and transitions leases to concierge custodial oversight. |
| `rejectAgentAccountDeletion(requestId, adminNotes)` | `POST /api/auth/agent-deletion-requests/:id/reject` | Admin rejects deletion request and dispatches decision notification with review notes to the agent. |
| **Properties** | | |
| `getProperties(params)` | `GET /api/properties` | Filtered, sorted, and paginated listing search (returns page `data` and `allMatching` for map). Supports sort options `featured`, `newest`, `price_asc`, `price_desc`, `area_asc`, `area_desc`. Excludes sold (`isSold: true`) and actively leased (`isLeased: true`) properties from public browse. Normalizes city queries to 10 canonical operating cities (`Delhi NCR`, `Mumbai`, `Kozhikode`, `Bengaluru`, `Kochi`, `Thiruvananthapuram`, `Chennai`, `Hyderabad`, `Pune`, `Goa`). |
| `getHomeStats()` | `GET /api/properties/home-stats` | Public live aggregate statistics for Home Hero and Intro sections (`totalHomes`, `availableHomes`, `totalCities`, `reraPercent`). |
| `getPropertyById(id)` | `GET /api/properties/:id` | Full details, amenities, pricing. Dynamically increments recorded view counts (`views`), attaches live agent profile data (`id`, `name`, `agency`, `reraNumber`, `isVerified`, `rating`, `reviewCount`, `avatar`) from user store, and verifies/expires promotion placement windows. Rendered dynamically on frontend with initials avatar error fallback. Private transactions restricted to Buyer, managing Agent, and Admin. |
| `getSimilarProperties(id)` | `GET /api/properties/:id/similar`| Algorithmic recommendations |
| `createProperty(data)` | `POST /api/properties` | Submit new residence (Agent/Admin) capturing all 7 Property View sections. Sanitizes numeric types (converts formatted parking bays to integer), pools (`'private' | 'shared' | 'none'`), and booleans against Mongoose schema. Submits with `status: 'pending'` and dispatches review notification to Admin. |
| `updateProperty(id, data)` | `PATCH /api/properties/:id` | Update property listing details from central Property Management page (`/agent/properties/:id`). Validates agent ownership and edit eligibility via `getPropertyEditEligibility` (blocks residences in completed sales, active tenant leases, pending handover, or active client escrow transactions). Strips protected transactional and compliance fields (type, listingType, dimensions, location, RERA ID, ownership) from payload. If an agent modifies core transactional specs (price or rental terms) on an already approved listing, automatically triggers moderation re-review (`status: 'pending'`) and notifies Admin. |
| `markPropertySoldOrRented(id, status, externalSale)` | `PATCH /api/properties/:id/status` | Mark property as Sold, Rented, or Archived. Requires an executed in-platform payment or an explicit external sale record (`externalSale: { saleDate, buyerName, notes, externalReference }`). Prohibits marking sold if residence has an active lease, pending handover, or in-escrow transaction. External sales update availability safely and remove from public discovery without fabricating fake payment/receipt records. |
| `deleteProperty(id)` | `DELETE /api/properties/:id` | Permanently delete listing only when confirmed eligible (strictly blocked if property has historical payments, active payment schedules, active leases, pending handover, or active walkthrough bookings). Explains compliance reasons when blocked. |
| `getPropertyEditEligibility(property, payments)` | Local / Service helper | Evaluates listing edit eligibility: blocks residences involved in active leases, completed sales, pending handovers, or active client transactions. Returns `{ canEdit, reason, code }`. |
| `toggleSavedProperty(id)` | `POST /api/auth/saved/:propertyId` | Bookmark / toggle saved property (strictly gated to `role === 'user'`). Returns `{ success: true, saved: boolean, isSaved: boolean, savedPropertyIds: string[] }`. |
| `getSavedProperties()` | `GET /api/auth/saved` | Fetch user's saved wishlist with normalized property objects and canonical `coverImage`. |
| **Compare** | | |
| `getCompareList(type)` | Local / Synced state | Retrieve compared properties strictly segmented by type (`sale` or `rent`, max 3). Shared between `/compare` and `/dashboard/compare`. |
| `addCompare(property, type)` | Local / Synced state | Add property to comparison set (enforcing type isolation and 3-property ceiling). Synchronized live across all entry points. |
| `removeCompare(id, type)` | Local / Synced state | Remove property from active comparison set. |
| `clearCompare(type)` | Local / Synced state | Remove all properties from specified comparison set (`sale` or `rent`). |
| **Bookings** | | |
| `createBooking(data)` | `POST /api/bookings` | Schedule property visit request (blocked for sold/leased residences) |
| `getBookings(params)` | `GET /api/bookings` | Fetch user/agent visit requests |
| `updateBookingStatus(id, s)` | `PATCH /api/bookings/:id/status` | Confirm, decline, or mark completed. Marking completed strictly requires agent ownership, confirmed initial status, and that scheduled appointment date/time has arrived (rejects early completion with 400). |
| `cancelBooking(id)` | `PATCH /api/bookings/:id/cancel` | Cancel visit request only while status is pending (unaccepted) |
| `editPendingBookingSchedule({ bookingId, date, timeSlot, notes })` | `PATCH /api/bookings/:id/schedule` | User edits date/time of a pending visit request; keeps status pending and notifies agent |
| `requestBookingReschedule({ bookingId, proposedDate, proposedTimeSlot, reason })` | `POST /api/bookings/:id/reschedule-request` | User requests new date/time for an already confirmed visit; keeps active confirmed appointment valid while awaiting agent review |
| `respondBookingReschedule({ bookingId, accept })` | `POST /api/bookings/:id/reschedule-response` | Agent accepts (updates appointment schedule, sets confirmed, notifies both) or declines (preserves original confirmed appointment, notifies user) |
| **Inquiries** | | |
| `createInquiry(data)` | `POST /api/inquiries` | Send message/inquiry to agent |
| `getInquiries()` | `GET /api/inquiries` | Retrieve incoming inquiries |
| **Payments, Documents & Lease Lifecycle (Stripe Test Mode Integration)** | | |
| `createCheckoutSession(data)` | `POST /api/payments/create-checkout-session` | Unified Stripe Checkout session creation for all in-app payment entry points: Full Purchase (`full_purchase`), EMI Down Payment (`emi_down_payment`), Monthly EMI Installment (`emi_installment`), Rental Deposit & Move-in Advance (`rent_deposit`), Monthly Rent Installment (`rent_installment`), and Listing Premium Upgrade (`promotion_fee`, ₹15,000). Calculates amounts authoritatively on server in paise (INR). Pre-creates pending ledger payment and sets up future off-session mandate if Autopay is opted-in. |
| `getSessionStatus(sessionId)` | `GET /api/payments/session-status/:sessionId` | Retrieves payment session status for the custom result page. Falls back to synchronous Stripe API retrieval if webhook delivery is pending, fulfilling confirmed transactions immediately to prevent client stalling. Serializes canonical `paidAt`, `createdAt`, and `timestamp` as ISO strings. |
| `handleStripeWebhook(req, res)` | `POST /api/payments/webhook` | Handles authoritative Stripe webhook events (`checkout.session.completed`, `payment_intent.payment_failed`) using raw buffer signature verification (`express.raw({ type: 'application/json' })`). Enforces strict event idempotency using `StripeEvent` collection, records authoritative `paidAt` from Stripe event creation (`session.created * 1000`), resolves scheduled obligation `dueAt`, updates property/schedule state, records card details, and dispatches in-app notifications. |
| `toggleScheduleAutopay(scheduleId, enabled)` | `PATCH /api/payments/schedules/:id/autopay` | User or Admin enables or revokes recurring automatic monthly deductions for active EMI or rent schedules in accordance with RBI recurring e-mandate rules. |
| `getPaymentSchedules()` | `GET /api/payments/schedules` | Retrieve authoritative payment schedules. Role-scoped: Users see their active/completed EMI & rent schedules; Agents see schedules tied to their managed properties; Admins see platform-wide schedules. Installment statuses dynamically synchronized to IST (UTC+5:30) date boundaries (`upcoming`, `due_today`, `overdue`, `paid`). Each installment provides canonical `dueDate` and `dueAt` timestamps, and `paidAt` upon payment. Grouped by property in UI summaries with recurring installment/rent amount, remaining tenure, balance, Autopay badge, and next actionable payment details in dedicated `PropertyObligationModal`. |
| `getPaymentScheduleById(id)` | `GET /api/payments/schedules/:id` | Retrieve single payment schedule by customId or Mongo _id with role authorization checks. Serializes `dueAt`, `dueDate`, and `paidAt`. |
| `payScheduleInstallment({ scheduleId, installmentNumber })` | `POST /api/payments/schedules/:id/installments/:installmentNumber/pay` | Initiates Stripe Checkout session for a specific scheduled installment payment. Decrements remaining balance, marks installment paid with authoritative `paidAt`, creates a new `Payment` ledger record (`type: 'emi_installment'` or `'rent_installment'`) storing `dueAt` of the target obligation, and sends idempotent notifications to User and Agent. |
| `getPayments()` | `GET /api/payments` | Retrieve payment ledger records. Filtered by agent properties and payer/agent ID; classified into Client Escrow (Full Payments, EMI Installments, and Rental Deposits) vs Administrative Fees (Promotion Fees). Normalizes and guarantees canonical date fields: `paidAt` (authoritative completed payment timestamp), `createdAt` (record creation timestamp), `dueAt` (scheduled obligation due date), and backward-compatible aliases `timestamp` and `paymentDate`. Powers the Admin, Agent, and User transaction pages formatted strictly in Asia/Kolkata (IST). |
| `getUserDocuments()` | `GET /api/documents` | Fetch transaction receipts and agreements |
| `requestLeaseCancellation({ paymentId, propertyId, reason, requestedDate })` | `POST /api/payments/leases/:id/cancellation-request` | User initiates mutual early lease cancellation request from `/dashboard/properties`. Stores request with status, requester, reason, and effective move-out date. Dispatches notifications to managing agent and user. |
| `respondLeaseCancellation({ paymentId, propertyId, agree, decisionReason })` | `POST /api/payments/leases/:id/cancellation-response` | Managing agent responds from central Property Management page (`/agent/properties/:id`). Ownership check blocks agents from reviewing other agents' leases. On approval: sets agreed effective date, cancels future rent installments in `PaymentSchedule`, sets property to `pending_handover`, and notifies tenant. On decline: keeps lease active and dispatches decision notice to tenant. |
| `confirmRentalHandover(propertyId)` | `POST /api/payments/properties/:id/confirm-handover` | Managing agent confirms walkthrough and handover complete on Property Management page, returning property to public Rent availability (`isLeased: false`, `rentalStatus: 'available'`). |
| **Agent Analytics & Traffic Telemetry** | | |
| `getAgentAnalytics({ period })` | `GET /api/analytics/agent?period=7d\|30d\|90d` | Retrieve reconstructed agent sales and traffic analytics derived from canonical MongoDB records (`properties`, `bookings`, `inquiries`, `ratings`, `payments`, `AnalyticsEvent`). Returns deterministic rule-based insight sentence, 4 summary figures (unique views, inquiries, leased in period with lifetime count, sold in period with lifetime count) with preceding-period comparisons, full-width aggregate star rating & 5-star distribution, money ledger (volume recorded, rent received, sale payments, pending amounts, upcoming monthly rent/EMI obligations grouped by property schedule, and escrow disclaimer), and full property performance table with period views, inquiries, visits, and status. Gated to verified agents. |
| `recordPropertyView({ propertyId, userId, userRole })` | `POST /api/analytics/views` | Record property view telemetry event. Deduplication: strictly **lifetime unique per signed-in user per property** backed by unique compound MongoDB index `{ propertyId: 1, userId: 1, type: 1 }` (with partial filter `{ userId: { $ne: 'guest' } }`). Reopening a property never inflates counts. The listing's owning agent and administrators are strictly excluded from view recording and count metrics. |
| `recordTourOpen({ propertyId, userId, userRole })` | `POST /api/analytics/tour-opens` | Record 360° virtual tour immersion event for verified Premium residences. Deduplicated once per user per property per day. Excludes listing owner and administrators. |
| `exportPerformanceCSV(performanceRows, transactions, period)` | Local / CSV helper | Generates securely escaped CSV string for agent's filtered listing performance records and transactions ledger. |
| `replyToReview({ reviewId, replyText, agentId })` | `POST /api/reviews/:id/reply` | Attaches verified agent reply to client review. |
| **Chat & Notifications** | | |
| `getChats()` | `GET /api/chat/threads` | Fetch conversation threads. Shared seamlessly across Property View (`PropertyChatModal`) and Dashboard Messages (`UserMessagesPage`, `AgentInquiriesPage`). Role-scoped: users access their conversations, agents access listing threads, admins view all. |
| `getOrCreateChat({ propertyId, agentId })` | `POST /api/chat/threads/find-or-create` | Get or initialize conversation with property context chip |
| `sendMessage(chatId, text, attachments)` | `POST /api/chat/:id/messages` | Send message in real-time channel with attachment metadata |
| `uploadChatAttachment(file)` | `POST /api/chat/attachments` | Upload image/PDF attachment (max 5MB). Persisted as binary blob in browser IndexedDB (`porchlight_chat_attachments`), with lightweight metadata stored in the message thread. |
| `getAttachmentBlob(id)` | `GET /api/chat/attachments/:id` | Fetch binary blob from IndexedDB for preview rendering or download |
| `getNotifications()` | `GET /api/notifications` | Fetch notification feed |
| `markNotificationAsRead(id)` | `PATCH /api/notifications/:id/read` | Mark notification as read (synchronizes header and dashboard badges) |
| `deleteNotification(id)` | `DELETE /api/notifications/:id` | Delete individual notification scoped strictly to current user |
| `deleteAllNotifications()` | `DELETE /api/notifications` | Delete all notifications scoped strictly to current user |
| **Complaints & Agent Ratings** | | |
| `submitComplaint(data)` | `POST /api/complaints` | Submit support complaint ticket |
| `getComplaints()` | `GET /api/complaints` | Retrieve user complaints |
| `checkRatingEligibility({ transactionId, propertyId, userId })` | `GET /api/ratings/eligibility?tx=:transactionId` | Verify transaction rating eligibility: strictly signed-in User, completed Buy/Rent payment (`status === 'completed'`), excludes visit-only bookings, refunds, agents, and admins. |
| `submitAgentRating({ transactionId, propertyId, rating, userId })` | `POST /api/ratings` | Submit or update star-only rating (integer 1–5). Idempotent per transaction; re-submitting updates the existing record. |
| `getAgentRatingAggregate(agentId)` | `GET /api/agents/:id/ratings/aggregate` | Calculate arithmetic average rounded to 1 decimal place, total rating count, and 1–5 star distribution. Excludes refunded/ineligible ratings. Returns `averageRating: null` if 0 ratings. |
| `getMyAgentRatings()` | `GET /api/ratings/my-ratings` | Fetch authenticated agent's rating aggregate (average, total count, 1-5 star distribution) and sanitized recent star history (`id`, `rating`, `propertyTitle`, `createdAt`) with zero client PII or written reviews. |
| `getRatingForTransaction(transactionId)` | `GET /api/ratings/transaction/:transactionId` | Retrieve existing star rating for a completed payment transaction. |
| `getUserRatingStatusForProperty({ propertyId, userId })` | `GET /api/ratings/user-status?propertyId=...` | Check if user has an eligible transaction for a property and whether they can rate or update rating. |
| `markTransactionRatingsIneligible(transactionId)` | `POST /api/ratings/invalidate-transaction` | Invalidate ratings linked to refunded/reversed transactions, excluding them from aggregates without deleting history. |
| **Admin** | | |
| `getAdminStats()` | `GET /api/admin/metrics` | Platform overview statistics (excludes Admins from registered user totals, calculates Available Now vs All Properties) |
| `updateFeaturedCuration(data)` | `PUT /api/promotions/featured-curation` | Admin curates the 4 front-page Featured slots. Enforces strict 4-slot ceiling, approved and available eligibility, ordering, and expiration windowing. |
| `approvePropertyListing(id)` | `POST /api/admin/properties/:id/approve` | Approve pending listing |
| `rejectPropertyListing(id, reason)` | `POST /api/admin/properties/:id/reject` | Reject property listing with mandatory explanation |
| `archivePropertyListing(id, reason)` | `POST /api/admin/properties/:id/archive` | Safely archive property from public visibility preserving transaction/lease history |
| `verifyAgent(id)` | `POST /api/admin/agents/:id/verify` | Verify agent credentials and RERA license |
| `rejectAgent(id, reason)` | `POST /api/admin/agents/:id/reject` | Decline agent verification with mandatory feedback reason |
| `getAnnouncements()` | `GET /api/announcements` | Fetch active broadcasts |
| `createAnnouncement(data)` | `POST /api/admin/announcements` | Create platform maintenance or informational broadcast notice |
| `deleteAnnouncement(id)` | `DELETE /api/admin/announcements/:id` | Remove announcement banner |
| `getComplaints()` | `GET /api/complaints` | Fetch role-scoped support tickets (Users & Agents) |
| `replyToComplaint({ complaintId, message, status })` | `POST /api/complaints/:id/reply` | Concierge message reply on support ticket with notification dispatch |
| `updateComplaintStatus(id, status, resolutionNote)` | `PATCH /api/complaints/:id/status` | Update ticket status (`open`, `in_progress`, `resolved`) |
| **Dashboard & Search** | | |
| `searchDashboard({ query, role, userId })` | `GET /api/dashboard/search?q=:query` | Role-scoped dashboard search across settings/actions, pages, properties, visits, transactions, and messages with non-sticky scroll-aware modal navigation |
| `getUserDashboardStats()` | `GET /api/dashboard/user/stats` | Aggregated user overview metrics (saved count, upcoming visits, active threads, acquisition count, chronological activity) |
| `getAgentDashboardStats()` | `GET /api/dashboard/agent/stats` | Aggregated agent overview metrics (active listings, pending review queue, scheduled visits, action queue) |
| `getAdminDashboardStats()` | `GET /api/dashboard/admin/stats` | Platform-wide operational metrics (active/pending listings, agent verifications, complaints, volume) |
| **Premium Promotions & Showcase** | | |
| `getPromotionConfig()` | `GET /api/promotions/config` | Fetch active promotion fee (INR) and duration (Days) parameters |
| `updatePromotionConfig(config)` | `PATCH /api/promotions/config` | Admin update for promotion fee and showcase placement duration |
| `requestPremiumStatus({ propertyId })` | `POST /api/promotions/premium-badge` | Agent request for simulated paid Premium Listing Badge (`type: 'premium_badge'`). Supports `approved` or `pending` listings. Records demo payment in ledger (`type: 'promotion_fee'`), dispatches Admin review notification. |
| `requestFeaturedPlacement({ propertyId })` | `POST /api/promotions/featured-placement` | Agent request for Home Featured Placement (`type: 'featured_placement'`). Checks 4-slot capacity; routes to Admin review. |
| `syncFeaturedPlacements()` | `POST /api/promotions/featured-sync` | Automated synchronization worker: expires ended placements, removes unavailable listings, and automatically promotes priority waitlisted properties into vacant showcase slots. |
| `getPromotions()` | `GET /api/promotions` | Retrieve agent or admin promotion records enriched with current property availability, placement windows, and queue rankings |
| `updatePromotionStatus(id, { status, adminNotes })` | `PATCH /api/promotions/:id/status` | Admin decision: For `premium_badge`, sets `p.isPremium = true` and `p.isPremiumAdminFlag = true` (unlocking the 360° virtual tour). For `featured_placement`, confirms showcase slot or places into waitlist (`status: 'waitlist'`). Dispatches decision notification to the agent. |
| `updateFeaturedProperties(list)` | `POST /api/admin/properties/featured` | Admin manual ordering and curation of front-page top properties showcase (strictly 4 slots) |
| `updateFeaturedWindow(id, { durationDays, endDate })` | `PATCH /api/admin/properties/:id/featured-window` | Adjust front-page showcase placement duration window |
| `removeFeaturedPlacement(id)` | `POST /api/admin/properties/:id/unpin-featured` | Remove listing from showcase and advance waitlist priority queue |
| `markPropertySoldOrRented(id, status)` | `PATCH /api/properties/:id/status` | Update property completion state and remove from active featured rotation. Strictly verifies that an executed platform payment or token exists in payments ledger before allowing non-admin agents to transition listings to Sold or Rented. Supports external sale recording without artificial payments. |
| `deleteProperty(id)` | `DELETE /api/properties/:id` | Soft-deletes / safely archives listings with financial transactions, active payment schedules, sold status, active leases, or scheduled visits (`isArchived: true, status: 'archived'`), preserving all payment, receipt, rating, and regulatory audit compliance records. Completely clean, unencumbered listings are hard-deleted. |
| `restoreProperty(id)` | `PATCH /api/properties/:id/restore` | Restores an archived listing from the archive to the representing agent's active management roster. |
| `agentTerminateLease({ paymentId, propertyId, effectiveDate, reason })` | `POST /api/payments/leases/:id/agent-terminate` | Agent-initiated rental lease termination endpoint. Validates that at least one complete rental month has elapsed from lease start and that backend-confirmed rent payment coverage exists. Cancels future unpaid rent schedule installments, transitions property to `pending_handover`, and dispatches notifications to user and agent. |
| `getSystemReports()` | `GET /api/admin/reports` | Retrieve ErrorBoundary client exceptions and diagnostic event reports |
| `acknowledgeSystemReport(id)` | `POST /api/admin/reports/:id/acknowledge` | Acknowledge diagnostic exception |
| `resolveSystemReport(id)` | `PATCH /api/admin/reports/:id/resolve` | Mark system diagnostic exception as resolved |
| **Shared Helpers & Constants** | | |
| `PROPERTY_TYPES` / `formatPropertyType()` | `src/constants/propertyTypes.js` | 14 canonical property classifications shared across Add/Edit Property, Browse Filters, Property Details, Cards, and Maps. |
| `getPropertyFieldApplicability(type, listingType)` | `src/constants/propertyTypes.js` | Single source of truth determining field visibility, required status, and display rules across Add/Edit forms and Property View spec sheets. Suppresses stale or irrelevant attributes. |
| `IDENTITY_PROPERTY_FIELDS` / `EDITABLE_PROPERTY_FIELDS` | `src/constants/propertyTypes.js` | Enforces boundaries between immutable compliance fields (ID, type, classification, location, RERA, ownership) and permitted editable fields in Agent Edit mode. |
| `getFloorFieldConfig(type)` | `src/constants/propertyTypes.js` | Maps property classifications to conditional floor field behavior (unit-style requires floor level & total floors; standalone structures require total floors; plots omit floor fields). |
| `PropertyTypeDropdown` | `src/components/property/PropertyTypeDropdown.jsx` | Accessible custom portal dropdown for property classifications. Prefers downward opening, dynamically clamps height within viewport, scrolls internally, and avoids clipping. |
| `parseGoogleMapsUrl(input)` | `src/lib/parseGoogleMapsUrl.js` | Extracts latitude and longitude from Google Maps URLs (`@lat,lng`, `!3d!4d`, `?q=`, `?ll=`, `/place/lat,lng`) with geographic range validation. |
| `validateRemoteImageUrl(url)` | `src/lib/validateImage.js` | Validates image URL format and tests remote image loading via Image DOM element. |
| `validatePanoramaAsset(source)` | `src/lib/validateImage.js` | Validates 360° equirectangular image asset loading and checks 2:1 aspect ratio. |
| `isPremium(property)` | `src/lib/isPremium.js` | Evaluates verified Premium status (`isPremium || isPremiumAdminFlag || isPremiumBadge`) to unlock 360° virtual tours and badges. |
| `ENTRANCE_FACING_DIRECTIONS` / `formatFacingDirection()` | `src/constants/propertyTypes.js` | All eight compass directions (`North`, `North-East`, `East`, `South-East`, `South`, `South-West`, `West`, `North-West`) and safe abbreviation normalizer. |
| `formatPropertyPrice(property, options)` | `src/lib/formatINR.js` | Formats fixed property prices in Indian Rupee format (INR). Enforces fixed numeric pricing across all cards, listings, and detail views. |
| `useHeaderOffset()` | `src/hooks/useHeaderOffset.js` | Hook calculating live visible bottom of global fixed header (`header.getBoundingClientRect().bottom` or 0 when hidden) across resize, scroll, and custom dispatch events. Used to mount modals dynamically at `top: headerOffset` (`z-40`) without obscuring the navigation bar (`z-50`). |
| `PropertyStatusPill` | `src/pages/dashboard/admin/AdminApprovalsPage.jsx` | Renders clean, single-line status badges (`whitespace-nowrap inline-flex items-center gap-1.5`) with accessible tooltips and mobile stacked card reflow. |
| **Google Sign-In & Auth** | | |
| `getGoogleConfig()` | `GET /api/auth/google/config` | Returns authoritative public `clientId` for Google Identity Services. |
| `loginWithGoogle(payload)` | `POST /api/auth/google` | Verifies Google token against Google's tokeninfo API (`aud === config.google.clientId`). Explicit account selection via `prompt: 'select_account'`. Strict User-only policy: blocks Agent/Admin sign-in or escalation with HTTP 403. Auto-select and One Tap disabled. |
| **Property Media & Cover Image Contract** | | |
| `Property.coverImage` | MongoDB & Express API | Standardized single `coverImage` field across schemas, controllers, cards, details, maps, and compare views. Pre-save hook guarantees `coverImage` is always set and present in `images`. Every property contains exactly 5 curated architectural gallery images. |
| `SmartImage` | `src/components/media/SmartImage.jsx` | Robust image renderer with smooth fade-in and graceful themed SVG placeholder fallback that never collapses to `opacity-0` or leaves blank cards. |
| **Buy EMI Checkout & Authoritative Financing** | | |
| `processMockPayment({ ... financingDetails })` | `POST /api/payments/checkout` | Accepts carried calculator values and user-adjusted financing parameters. Backend authoritatively recomputes down payment (10%-80%), loan principal, tenure (12-360 mos), benchmark EMI (8.5% p.a.), total interest, and total repayment before persisting in `Payment.financingDetails`. Simulated payment mode with demo receipt. |
| `CheckoutPage` | `src/pages/CheckoutPage.jsx` | Interactive checkout with live sliders and presets for down payment and loan term, live recalculation of EMI and repayment schedules, benchmark estimate notice, and carried financing snapshot in confirmation and PDF receipts. |
| **Access & Urban Connectivity** | | |
| `approachRoad`, `nearestTransit`, `airportDistance`, `railwayDistance`, `hospitalDistance`, `commercialDistance` | Mongoose schema & Express API | Full-stack persistence of 6 transit and connectivity metrics. Sanitized with string trimming, collected with descriptive hints in Add Property, dynamic rendering in Property Details with "Not provided" fallback. |
| **Role & Verification Route Protection** | | |
| `RequireVerifiedAgent` | `src/app/guards/RequireVerifiedAgent.jsx` | Restricts pending/unverified agents from new listing creation, editing, and promotion requests, displaying calm pending review status and navigation to overview. Admins bypass. |
| `requireVerifiedAgent` | `Porch_server/src/middleware/authorize.js` | Backend authorization middleware verifying `req.user.isVerified !== false` against MongoDB, returning HTTP 403 `AGENT_PENDING_VERIFICATION` to pending agents on property creation, edits, deletion, status changes, and promotions. |
| **Stripe Test Integration & Payment Lifecycle** | | |
| `createCheckoutSession(payload)` | `POST /api/payments/create-checkout-session` | Central Stripe Checkout session creator for Full Purchase, EMI Down Payment, EMI Installment, Rent Deposit, Rent Installment, and Premium Tier Upgrade. Calculates authoritative prices in Indian paise (`inr`), validates financing terms on server, checks atomic property availability, and attaches Customer & Metadata. |
| `getSessionStatus(sessionId)` | `GET /api/payments/session-status/:sessionId` | Polls/verifies Stripe session status. Gated by ownership authorization (payer, listing agent, or admin). Performs synchronous fallback verification against Stripe API to prevent UI hanging. |
| `cancelCheckoutSession(sessionId)` | `POST /api/payments/cancel-session/:sessionId` | Gracefully marks pending checkout session as cancelled when user abandons or cancels checkout. Excludes cancelled attempts from financial history. |
| `handleStripeWebhook` | `POST /api/payments/webhook` | Verifies raw body with `STRIPE_WEBHOOK_SECRET`. Handles `checkout.session.completed`, `payment_intent.payment_failed`, and `checkout.session.expired` with idempotency via `StripeEvent` collection. |
| `toggleScheduleAutopay(scheduleId, enabled)` | `PATCH /api/payments/schedules/:id/autopay` | User toggles recurring Autopay mandate on active EMI/rent schedules. On lease termination or cancellation, mandates are automatically revoked (`autopayEnabled: false`, `autopayMandateStatus: 'revoked'`). |

## Local Stripe Test Mode Workflow & Verification

1. **Environment Configuration**:
   - Backend (`Porch_server/.env`):
     - `STRIPE_SECRET_KEY=sk_test_...`
     - `STRIPE_WEBHOOK_SECRET=whsec_...`
     - `STRIPE_CURRENCY=INR`
     - `CLIENT_URL=http://localhost:5174` (or `http://localhost:5173`)
   - Frontend (`.env`):
     - `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
2. **Local Webhook Forwarding (Optional for automated webhooks)**:
   - Run: `stripe listen --forward-to localhost:5000/api/payments/webhook`
   - Paste the printed webhook signing secret `whsec_...` into `Porch_server/.env` under `STRIPE_WEBHOOK_SECRET`.
   - *Note*: If the Stripe CLI is not running, the platform's synchronous fallback verification in `GET /api/payments/session-status/:sessionId` automatically queries Stripe directly and fulfills the transaction seamlessly upon return to `/payment/success`.
3. **Test Payment Cards (Test Mode Only)**:
   - Use standard Stripe test card numbers (e.g. `4242 4242 4242 4242`, any future expiration date, any 3 digits CVC, any 5-digit PIN/OTP for 3D Secure simulation).
   - Test mode strictly processes simulated charges in INR. No real charges are made.




