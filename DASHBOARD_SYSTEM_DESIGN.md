# Porch Light — Dashboard System Design Specification (Shared Shell)

## 1. Architectural Foundation & Shared Shell

The Porch Light Dashboard System provides a calm, unified, responsive workspace for authenticated roles (**User**, **Agent**, and **Admin**). It operates directly within Porch Light’s existing routing, layout, and visual direction, providing an organized sidebar rail, role-scoped search, persistent global header integration, and modular page content containers.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Global Navigation Header (Header.jsx — fixed h-[72px], blur, brand, notifications, user)│
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ Dashboard Sidebar │ Dashboard Main Content Stage (pt-[16px], min-h-screen)             │
│ (Desktop: 260px)  │ ┌────────────────────────────────────────────────────────────────┐ │
│                   │ │ Page Heading & Context (Directly integrated in page content)   │ │
│ - User Avatar     │ ├────────────────────────────────────────────────────────────────┤ │
│ - Role Badge      │ │                                                                │ │
│ - Sidebar Search  │ │ Active View Container (Porch Light porcelain-tint & sand cards)│ │
│ - Ordered Nav     │ │                                                                │ │
│ - Unread Badges   │ │ (No duplicate second toolbar; clean content rhythm)            │ │
│ - Sign Out Link   │ └────────────────────────────────────────────────────────────────┘ │
└───────────────────┴────────────────────────────────────────────────────────────────────┘
```


---

## 2. Layout & Responsive Behavior

### Desktop (>= 1024px)
- **Header Alignment**: Sits immediately beneath the 72px global header (`top: 72px; height: calc(100dvh - 72px)`).
- **Side Rail**: Fixed/sticky navigation rail (width `260px`) with porcelain background, subtle border divider (`border-r border-charcoal/10`), Space Mono section labels, and deep-purple active pill indicator.
- **Main Content**: Scrollable container (`flex-1 p-6 lg:p-10 max-w-7xl mx-auto`) with fluid typography, responsive grids, and standard margin rhythm.
- **Scroll Isolation & Cross-Route Preservation**: Side navigation maintains its own overflow scroll if items exceed viewport height; selecting a navigation item preserves the sidebar's exact scroll position across navigation and layout re-renders via persistent session memory, while the main workspace document flow resets to top `(0, 0)`.

### Medium & Tablet Screens (768px – 1023px)
- **Side Rail**: Compact icon + short-label rail (width `80px` or collapsible drawer) or full-width tab bar at the top of the workspace.
- **Main Content**: `p-6`, single-to-two column metric layouts, horizontal scrollable tables with clear edge indicators.

### Small & Mobile Screens (< 768px)
- **Sidebar Drawer**: Hidden off-canvas by default; accessible via a persistent "Dashboard Menu" control or synchronized with the mobile hamburger header.
- **Slide-Over Drawer**: Slides smoothly from the left (`z-50`, `w-[280px]`, full height, `backdrop-blur-md` overlay, Escape and outside-tap dismissal).
- **Touch Ergonomics**: All sidebar links and controls adhere strictly to a minimum touch target size of `44px x 44px`.

---

## 3. Visual Direction & Design System Tokens

The dashboard shell preserves Porch Light’s established quiet architectural sanctuary aesthetic:

- **Color Tokens**:
  - `porcelain` (`#F1ECE3`): Primary canvas background, container fill, clean cards.
  - `sand` (`#E7DFD2`): Secondary card panels, alternating table rows, muted chips.
  - `charcoal` (`#26262B`): Primary typography, dark stat values, solid action buttons.
  - `deep-purple` (`#5E4F7A`): Active sidebar nav pills, page headings, links, interactive highlights.
  - `heather` (`#8F7FA8`): Eyebrow mono subtitles, card borders, subtle metadata rules.
  - `electric-lemon` (`#E6FF3D`): Tiny status dots (e.g. live visit, urgent moderation alert); strictly never large fills or text.
- **Typography Tokens**:
  - **Instrument Serif**: Page titles (`font-serif text-3xl sm:text-4xl text-deep-purple font-medium tracking-tight`) and primary headline metrics.
  - **Space Mono**: Sidebar labels, status pills, timestamps, price tags, table headers (`font-mono text-xs uppercase tracking-wider`).
  - **Manrope**: Narrative descriptions, body text, form labels, data cells (`font-sans text-sm sm:text-base text-dark-gray/85`).
- **Surface Elevation & Rules**:
  - Thin 1px rules (`border-charcoal/10` or `border-dark-gray/15`).
  - Rounded rectangular corners: `rounded-2xl` for cards, `rounded-xl` for inner tiles, `rounded-lg` for badges.
  - No harsh box-shadows; gentle ambient lift (`shadow-xs` / `shadow-sm`).
- **Restrained Motion**:
  - Framer Motion page transitions (opacity and slight translateY <= 8px, <= 300ms, cubic-bezier).
  - Respects `prefers-reduced-motion` site-wide (immediate render without animation).

---

## 4. Dashboard-Wide Search System

Every dashboard includes an integrated, role-scoped search experience:

- **Position & Presentation**: Integrated seamlessly into the sidebar launcher button without visible "⌘K" / "K" badge clutter, maintaining an uncluttered visual hierarchy.
- **Unobtrusive Keyboard Shortcut**: Supports global `Cmd + K` / `Ctrl + K` keyboard invocation across User, Agent, and Admin dashboards without showing redundant badges.
- **Scroll-Aware, Non-Sticky Positioning**: The search modal/panel is embedded into the document flow (`absolute inset-x-0 top-0`), smoothly scrolling away with the page rather than remaining pinned or sticky over main page content or the footer.
- **Comprehensive Scope (Pages, Settings, Actions & Records)**:
  - Users, Agents, and Admins can search every relevant dashboard page, profile section, settings toggle, and permitted action.
  - Searchable destinations include Change Password (`#password-section`), Profile Photo / Headshot (`#avatar-section`), Notification Settings (`/notifications`), and Account Deactivation/Deletion (`#danger-zone`) where role-permitted.
- **Destructive Action Safety**: Searching for a destructive action (such as account deactivation or deletion request) navigates and scrolls directly to that control, but **never executes it automatically**. Explicit confirmation and obligation checks remain mandatory.
- **Debounced Execution**: 250ms input debounce to prevent unnecessary state churn.
- **Strict Role-Based Scoping**:
  - **User**: Searches user’s own saved homes, booked visits, active chats, payment receipts, direct page destinations, profile settings, and account deactivation.
  - **Agent**: Searches agent’s own listings, inbound inquiries, scheduled visit requests, completed transactions, agent destinations, RERA credentials, and request account deletion.
  - **Admin**: Searches platform-wide properties (all statuses), registered users, verified/pending agents, complaint tickets, announcements, admin navigation, platform parameters, and agent deletion requests. (Admin accounts never have deletion controls).
- **Categorized Results Dropdown & Smooth Record Focusing**: Groups matches into clean sections (Settings & Actions, Pages, Properties, Visits, Transactions, Messages/Complaints) with Space Mono section headers. Selecting a result navigates directly to the target dashboard route and smoothly scrolls to and focuses the specific record (`property-${id}`, `visit-${id}`, `tx-${id}`, `complaint-${id}`) or settings block. Destructive actions retain mandatory pre-action confirmation modals.

---

## 5. Global Header & Account Integration

Rather than inventing an isolated secondary header, the dashboard embeds cleanly within the project’s established layout architecture:

- **Persistent Header (`Header.jsx`)**: Remains mounted at `h-[72px]`.
- **Shared Route Structure Active Tab Matching**:
  - The center "Dashboard" navbar tab remains active across **every route** within all three dashboards (`/dashboard/*`, `/agent/*`, `/admin/*`), matching by shared route structure rather than only a single exact overview path.
  - Preserves the existing sliding active-indicator animation (`motion.div layoutId="header-active-tab"`) and behavior of all other navbar tabs (`Home`, `Buy`, `Rent`, `Login`, `Register`).
- **Profile & Notification Anchors**:
  - The header’s notifications bell and profile dropdown remain the primary global anchors.
  - The dashboard shell links directly to `/profile` and `/notifications` as recognized top-level destinations.
- **Role Switcher Integration**: Development-mode `DevRoleSwitcher` remains visible at `bottom-left` (z-120), allowing instant persona verification between User, Verified Agent, Pending Agent, and Admin.

---

## 6. Shared State & Component Patterns

1. **Loading Skeletons (`DashboardSkeleton.jsx`)**:
   - Clean, quiet rectangular pulse matching Porch Light’s 20px card radius and porcelain-to-sand gradient tints.
   - Skeletons mirror exact page layout: summary stats, table rows, and card grids.
2. **Standardized Empty States**:
   - Message: *"Nothing here yet, but the porch light is on."*
   - Visual: Small architectural line-art glyph or calm house icon in heather purple.
   - Call to Action: Outlined pill button routing the user to the appropriate exploratory flow (e.g. "Browse Residences for Sale", "Add a New Listing").
3. **Error Boundaries & Recovery**:
   - Component-level error cards with clear explanation and a single "Try again" action button without crashing the outer dashboard shell.
4. **Status Pill Conventions**:
   - `Approved` / `Active` / `Confirmed` / `Resolved`: `bg-deep-purple/10 text-deep-purple border-deep-purple/25` (Consistent Porch Light palette; zero unvetted green/emerald fills)
   - `Pending` / `Under Review`: `bg-sand/60 text-charcoal/80 border-charcoal/20` (or `bg-amber-50 text-amber-800 border-amber-200`)
   - `Rejected` / `Declined`: `bg-rose-50 text-rose-800 border-rose-200`
   - `Sold` / `Rented` / `Archived`: `bg-charcoal/5 text-charcoal/70 border-charcoal/15`

---

## 7. Theming, Profile Picture Selection & Unified Messaging

1. **Surface Theming**:
   - Replaced generic bright-white containers, fields, and tables with warm Porch Light surfaces: `porcelain` canvas, `sand/35` containers, `porcelain-tint` (`#FAF7F2`) input fields, and 1px `border-charcoal/15` - `border-charcoal/20` rules.
   - Contrast between backgrounds, inputs, and interactive elements ensures inputs never blend into surrounding panels while eliminating sterile white surfaces.
2. **Profile Picture Selection & Persistence**:
   - Standardized across User, Agent, and Admin dashboards via `ProfilePhotoUploader.jsx`.
   - Automated client-side image compression using `compressProfileImage` (max 150KB, 400x400 JPG) and conversion to base64 Data URL.
   - Stored in `currentUser.avatar` in `mockStore`, remaining persistent across navigation and page refresh.
   - Synchronized with the desktop sidebar brand strip, mobile drawer, and top site header profile button.
3. **Unified Messages & Attachment Pipeline**:
   - Dashboard Messages (`/dashboard/chat` and `/agent/inquiries`) connect directly to the same conversation threads initiated from Property View (`PropertyChatModal.jsx`).
   - Supports file/image attachments with client validation, IndexedDB binary storage, staging previews, upload progress, in-bubble previews, and file downloads.
   - Strict role-based isolation: Users see only their conversations; Agents see conversations for their listings; Admins see platform-wide conversations.

---

## 8. Focused Polish: Consistent Theming, Navigation, Scroll Lifecycle & Shared Compare

1. **Consistent Porch Light Theming Across All Dashboard Surfaces**:
   - Eliminated all remaining bright white surfaces and off-theme mint/green (`emerald`) status or resolution elements across User, Agent, and Admin dashboards.
   - All cards, panels, tables, resolution notes, and support tickets use the Porch Light palette (`porcelain`, `sand/35`, `sand/50`, `charcoal`, `deep-purple`, `heather`, and restrained `lemon` accents).
   - High contrast is preserved between page canvases, container panels, field borders, and status text without blurring elements into a single flat tone.
   - Status clarity is achieved through themed typography, icons, labels, and borders rather than mint fills.

2. **Dashboard Document Scroll-to-Top Lifecycle & Message Scroll Confinement**:
   - Navigation between dashboard pages automatically resets document scroll to the top `(0, 0)` synchronously before paint and on route transitions.
   - Confinement of message panel auto-scroll: In `UserMessagesPage` and `AgentInquiriesPage`, automatic scrolling to the latest message is strictly confined to the conversation container (`messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight`). Window-level `scrollIntoView()` is eliminated, preventing the whole dashboard page from jumping to the bottom on load.
   - Applied consistently across all dashboard routes (including profile, settings, and Help & Support).

3. **Strict Role-Based Sign-In Overview Routing**:
   - Successful login (both credential sign-in and Google demo auth) routes users directly to their own role's overview page:
     - User → `/dashboard/overview`
     - Agent → `/agent/overview`
     - Admin → `/admin/overview`
   - Bypasses stale scroll positions and clears any previous deep-linked subpages from `location.state`.
   - Preserves strict role immutability and blocks public Admin account creation.

4. **Smooth Sidebar Navigation Page Transitions**:
   - Subtle, restrained page transition using Framer Motion (`opacity: 0, y: 6` to `opacity: 1, y: 0`, 180ms ease) applied to the main content area in `DashboardLayout.jsx`.
   - The outer shell, sidebar, and site header remain perfectly stable without remounting, layout shifts, or animation lag.
   - Automatically disabled when `prefers-reduced-motion` is detected via `useReducedMotion()`.

5. **Unified Compare Experience**:
   - The User Dashboard Compare entry (`/dashboard/compare`) and the standalone comparison page (`/compare`) share the exact same `ComparePage.jsx` component and `compareService` state layer.
   - Both entry points operate on identical live data: strictly separated Buy (sale) and Rent comparison sets, maximum 3 properties per set, immediate bi-directional synchronization of additions, individual removals, and "Remove all".
   - Preserves current comparison selection when navigating between dashboard sidebar and browse/map comparison flows.

6. **Sidebar Fixed Header, Search, and Footer with Independent Middle Navigation Scrolling**:
   - In `DashboardLayout.jsx`, the sidebar layout anchors the account/header profile area and the search button firmly at the top, and anchors footer actions (`Showcase` and `Sign out`) firmly at the bottom across desktop and mobile.
   - Only the middle navigation region (`<nav className="flex-1 overflow-y-auto ... overscroll-contain">`) scrolls when menu items exceed viewport height.
   - The middle navigation's exact scroll position is tracked in memory (`recordSidebarScroll`) and restored seamlessly (`sidebarNavRef.current.scrollTop = saved`) upon tab navigation without resetting to the top or forcing the active item into view.
   - The main dashboard page content scrolls completely independently from the sidebar (`overflow-x-hidden`, resetting document scroll to top on page navigation).

7. **Universal Notification System Across All Dashboards (User, Agent, Admin)**:
   - **Header & Page Badge Synchronization**: Count badges display exclusively unread notifications (`!n.read && n.userId === currentUserId`). Both the global header notification bell and dashboard inbox badges consume the same connected state and update instantaneously.
   - **Actions**: Opening/viewing any notification immediately marks it read and decrements unread counts. Includes individual notification delete (`deleteNotification`) and "Delete All" (`deleteAllNotifications`) with confirmation modal dialogs.
   - **Strict Ownership Scoping**: Deletions and read status changes affect only notifications belonging to the authenticated account; other accounts/roles remain untouched.
   - **Themed Aesthetic**: Pure Porch Light styling using `bg-sand/35`, `bg-deep-purple/10`, and `border-charcoal/15` without any unvetted green panels.

8. **Universal Property Availability & Transaction Access**:
   - **Completed Buy Transactions**: Properties with completed purchase transactions (`isSold: true` or `availabilityStatus: 'sold'`) are excluded from public `/buy` listings, map markers, and search results. Detailed access is restricted to Buyer, managing Agent, and Admin. Relisting via ordinary agent edit is prohibited.
   - **Active Leases & Expiry**: Properties with active leases (`isLeased: true` or `rentalStatus: 'leased'`) are excluded from public `/rent` listings, maps, and search. Upon lease end, property is eligible to return only when no extension/dispute is pending and managing agent confirms handover.
   - **Mutual Early Lease Termination**: Tenant or agent can initiate an early exit request. The other party must agree before the lease is closed. Property remains leased and unavailable during review, entering `pending_handover` upon mutual agreement until agent confirms handover.

9. **Mobile-Friendly Dashboard Drawer & Responsive Safeguards**:
   - **Mobile Slide-Over Drawer**: Mounted below the site header (`fixed inset-x-0 bottom-0 top-[72px] z-40`), the drawer anchors the user profile area and search launcher at the top and the footer at the bottom, while the middle navigation items scroll independently within `max-w-[85vw]`.
   - **Touch-Friendly Controls**: Interactive elements, action triggers, buttons, and navigation links maintain a minimum touch target size of 44px × 44px (`min-h-[44px]`).
   - **Viewport & Dialog Containment**: Dense tables reflow with horizontal scrolling (`overflow-x-auto`), modals include `max-h-[90vh] overflow-y-auto` safety scrolling, and main dashboard pages enforce `overflow-x-hidden` to eliminate horizontal page overflow.
   - **Motion Preferences**: Respects `prefers-reduced-motion` across page transitions, animations, and modal overlays.

10. **Header-Aware Modal Positioning & Status Badge Standards**:
   - **Dynamic Header Offset (`useHeaderOffset`)**: All dashboard inspection dossiers, verification panels, and confirmation dialogs calculate the live header bottom (`useHeaderOffset()`) and mount at `top: headerOffset` (`z-40`). The global fixed header remains cleanly above the backdrop (`z-50`) without clipping modal titles, close triggers, or fighting for z-index priority.
   - **Focus & Keyboard Dismissal**: Modals attach a global `Escape` key listener and restore focus to the triggering element (`lastActiveElementRef.current?.focus()`) upon closing.
   - **One-Line Status Badges**: Operational status labels enforce `whitespace-nowrap inline-flex items-center gap-1.5` with concise labels (`Available`, `Pending Review`, `Sold`, `Leased`, `Archived`, `Declined`) and descriptive tooltips, preventing multi-line text splits.
   - **Stacked Card Reflow**: Dense multi-column tables automatically collapse to responsive stacked cards on mobile screens (`< 768px`), presenting actions, metadata, and badges cleanly without horizontal scrolling.



