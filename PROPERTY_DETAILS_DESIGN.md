# Porch Light — Property Details Design Specification

## Overview & Route Scope
- **Route**: `/property/:id`
- **Purpose**: High-fidelity architectural presentation and acquisition funnel for individual residential sanctuaries.
- **Scope**: Targeted refinement pass standardizing gallery frame geometries, establishing high-legibility typographic hierarchy, and resolving neighborhood map pin framing and sticky header stacking isolation.

---

## 1. Gallery System: Uniform Rectangular Geometries

### Collage Architecture
- **Retained Layout**: Asymmetric 12-column collage grid (`md:col-span-7` hero on left, `md:col-span-5` 2x2 grid on right) maintaining existing relative visual weight and interactive hover zoom (`scale-105 transition-transform duration-700`).
- **Standardized Framing**:
  - Removed previous disparate masks (top arch `rounded-t-[160px]`, asymmetric leaf corners `rounded-leaf-br`, `rounded-leaf-bl`).
  - Unified all frames into clean, modern architectural rectangles with a consistent `rounded-2xl` border radius (`rounded-2xl border border-dark-gray/20 bg-porcelain-tint shadow-xs`).
  - Image crop handling preserved using `SmartImage` with intentional aspect preservation to prevent image distortion.
- **Sub-Image Badges**: Legible, restrained badges (`font-mono text-xs font-medium px-2.5 py-1 rounded-md bg-dark-gray/85 backdrop-blur-xs text-porcelain`).
- **Lightbox Integration**:
  - Modal overlay at `z-50 bg-black/95` with full keyboard arrow and escape navigation.
  - Main viewer displays centered media with clean `rounded-2xl shadow-2xl`.
  - Thumbnail tray uses matching rectangular frames (`rounded-lg border-2 border-white/20`) with electric lemon active indicator (`border-electric-lemon scale-105 shadow-md`).

---

## 2. Information Hierarchy & Readability

### Typographic Hierarchy & Roles
- **Primary Property Title**:
  - `font-serif text-3xl sm:text-4xl lg:text-5xl text-deep-purple tracking-tight leading-[1.15]`
  - Accompanied by electric lemon `Premium Residence` badge where applicable.
- **Primary Valuation / Price**:
  - `font-serif text-3xl sm:text-4xl lg:text-[42px] text-deep-purple font-bold tracking-tight leading-none`
  - Secondary rate calculation: `font-mono text-xs sm:text-sm text-dark-gray/70 mt-1.5 font-medium` (approx. ₹/sq ft or Security Deposit).
- **Location & Regulatory Metadata**:
  - Breadcrumb: `font-mono text-xs sm:text-sm font-medium tracking-wide`
  - Address & PIN: `font-mono text-xs sm:text-sm text-dark-gray/75 flex flex-wrap items-center gap-x-3 gap-y-1`
  - RERA Compliance: `text-emerald-800 font-semibold bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/60 font-mono text-xs`

### Structured Data Sections
1. **Key Dimensions & Specifications Card**:
   - Card container: `p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs`
   - Metric labels: `font-mono text-xs uppercase tracking-wider text-dark-gray/70 font-semibold mb-1.5`
   - Metric numerals: `font-serif text-3xl sm:text-4xl text-deep-purple font-medium leading-none`
   - Subtext: `font-mono text-xs text-dark-gray/75 mt-1 font-medium` (e.g., `sq ft area`, `Total Floors`, `Vastu aligned`)
2. **Architectural Narrative**:
   - Section heading: `font-serif text-2xl sm:text-3xl text-deep-purple mb-3`
   - Narrative body: `font-sans text-base sm:text-lg text-dark-gray/85 leading-relaxed font-normal`
3. **Swiss-Style Technical Specifications & Compliance**:
   - Grid divider: `border-t border-dark-gray/15 divide-y divide-dark-gray/15 font-mono text-xs sm:text-sm`
   - Rows: `py-3.5 flex justify-between items-center gap-4`
   - Technical labels: `text-dark-gray/70 uppercase font-medium tracking-wide`
   - Technical values: `font-semibold text-dark-gray text-right`
4. **Access & Urban Connectivity**:
   - Card container: `p-6 sm:p-8 rounded-2xl bg-porcelain-tint border border-dark-gray/15 shadow-xs`
   - Labels: `text-xs text-dark-gray/65 uppercase tracking-wide font-medium mb-1` (boosted from illegible 10px text)
   - Values: `text-xs sm:text-sm font-bold text-dark-gray`
5. **Interactive EMI Calculator**:
   - Monthly estimate: `font-serif text-3xl sm:text-4xl text-deep-purple font-bold`
   - Sliders and labels: `font-mono text-xs sm:text-sm text-dark-gray/75 font-medium` with `accent-deep-purple` controls.
6. **Agent Verification & Action Panel**:
   - Agent card: `p-6 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs`
   - Agent title: `font-serif text-lg text-dark-gray font-semibold`
   - Star-only Rating Aggregate: Computes verified arithmetic average rounded to 1 decimal place and active ratings count. If unrated, renders "No ratings yet" (never 0 stars).
   - Verified badge: `text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/50 font-medium font-mono text-xs`
   - "Rate Representing Agent" Action: When a signed-in user has completed an eligible transaction for this property, displays a button opening the `AgentRatingModal`. If already rated, shows "Update Rating (★ N)" and allows modifying their existing star score.
   - Action buttons: `py-3.5 text-sm sm:text-base font-medium` with comfortable touch targets.

---

## 3. Neighborhood Map & Floating Property Preview

### Framing & Coordinates
- **Targeted Single-Property View**:
  - The map strictly renders the pin for the current property on its detail route (`properties={[property]}`).
  - `MapBoundsUpdater` detects single-property detail mode and centers the map view at neighborhood zoom (`zoom: 14`) with a gentle coordinate offset (`[property.lat - 0.0022, property.lng + 0.0035]`).
  - This positions the property marker in the upper-right quadrant while leaving the lower-left quadrant open for the floating preview card, preventing visual overlap.
- **Container Height & Stability**:
  - Outer map wrapper height set to `h-[440px] sm:h-[480px]` with `min-h-[320px] rounded-2xl overflow-hidden border border-dark-gray/15 shadow-xs`.
  - Guarantees complete vertical clearance for the preview card and bottom action bar without clipping.

### Floating Preview Card (`MapPropertyPreview`)
- **Docking & Padding**:
  - Docked at `bottom-4 left-4 right-4 sm:right-auto sm:w-[350px] max-w-[calc(100%-32px)]`.
  - All card elements—including thumbnail, badges, title, price, specs, and the "View Sanctuary" button—remain 100% visible inside the map viewport.
- **Selection & Dismissal Lifecycle**:
  - Preview card begins open (`mapPreviewSelected = true`).
  - Can be dismissed via close (`X`) button (`onClosePreview={() => setMapPreviewSelected(false)}`).
  - Clicking the property marker reopens the preview card (`onMarkerClick={() => setMapPreviewSelected(true)}`).
  - Clicking "View Sanctuary" while on the current property smoothly scrolls to top without redundant route reloading.

### Sticky Header Stacking Isolation
- **Root Cause**:
  - Sticky `Header.jsx` uses `fixed top-0 z-50`.
  - The preview card previously used `z-[500]` without an isolated stacking context on the map container, causing it to escape and paint over the returning header during upward scrolling.
- **Stacking Fix**:
  - Added CSS `isolate z-10` to the map container in `PropertyMap.jsx` and `PropertyDetailsPage.jsx`.
  - Reduced `MapPropertyPreview` z-index to `z-30`.
  - When the sticky header (`z-50`) reappears on upward scroll, it seamlessly floats over the map container with zero clipping or visual collision.

## 4. Separation of Sale and Rental Detail Experiences

### Architectural Strategy
While both Sale and Rental detail pages share the calm Porch Light layout shell (gallery, information sections, neighborhood map, and agent card), content, metadata, financial tools, and transactional actions are strictly branched based on `property.listingType`:
- **Buy / Sale (`listingType === 'sale'`)**: Focuses on capital asset acquisition, legal ownership, freehold titles, possession timeline, down payment, and home loan amortization.
- **Rent / Lease (`listingType === 'rent'`)**: Focuses on monthly operational occupancy, immediate availability, security deposits, lease commitments, notice periods, tenant policies, and monthly outlay/affordability.

---

### 5. Type-Specific Section & Content Breakdown

| Feature / Section | Sale Experience (`/property/:id` with `sale`) | Rental Experience (`/property/:id` with `rent`) |
| :--- | :--- | :--- |
| **Top Navigation** | "Back to Sale Listings" (falls back to `/buy`) | "Back to Rental Listings" (falls back to `/rent`) |
| **Badge & Status** | `Premium Residence` • `Possession: Ready to Move` | `Premium Rental` • `Available: Immediate` |
| **Price Breakdown** | Total valuation (`₹ Cr` / `₹ L`) + Approx. `₹/sq ft` | Monthly rent (`₹/mo`) + Deposit (`₹X L`) + Maintenance |
| **Key Dimensions** | Super Built-up, Config (BHK), Floor Level, Facing | Monthly Rent, Security Deposit, Layout/Area, Lease Period |
| **Swiss Specs Sheet** | Possession Status, Property Age, Ownership Type (Freehold), Carpet Area, Parking, Facing, Floor | Available From, Security Deposit, Monthly Maintenance, Minimum Lease, Notice Period, Preferred Tenants, Pet Policy, Furnishing, Carpet Area |
| **Financial Tool** | **Home Loan EMI Calculator**: Down payment, tenure, interest sliders; displays monthly EMI + total interest. | **Monthly Outlay & Affordability Estimator**: Base rent + maintenance + interactive utilities slider (₹1,500–₹12,000) + lease commitment options (11, 24, 36 mo). Highlights Total Move-in Funds and Recommended Monthly Income (33% gross income ceiling). |
| **Lease Policies** | *Hidden* (Not applicable to sale) | **Lease Policies & Onboarding Requirements**: Notice period, lock-in duration, maintenance schedule, background check, digital agreement. |
| **Action Box Heading** | `Reserve & Acquire` | `Apply & Reserve Lease` |
| **Primary Action #3** | `Pay Token Advance` (Routes to `/checkout/:id` with purchase token deposit) | `Pay Security Deposit` (Routes to `/checkout/:id` with rental deposit + first month + platform fee) |
| **Mobile Bottom Bar** | Total price + "Token" advance action | Monthly price (`/mo`) + "Deposit" reservation action |
| **Similar Sanctuaries** | Curated recommendations strictly filtered to `listingType === 'sale'` | Curated recommendations strictly filtered to `listingType === 'rent'` |

---

## 6. Action Panel: Approved Charcoal/Porcelain Styling

### Button Visual Consistency
All three action buttons across both Sale and Rental detail views follow the unified approved Porch Light button appearance:
- **Default State**: Charcoal/black background with porcelain/light text (`bg-dark-gray text-porcelain border border-dark-gray shadow-xs`).
- **Hover & Focus-Visible State**: Inverts smoothly to porcelain/light background with charcoal/black text (`hover:bg-porcelain hover:text-dark-gray focus-visible:bg-porcelain focus-visible:text-dark-gray focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2`).
- **Geometry & Hierarchy**:
  - Height: Standardized to `50px` (`h-[50px] min-h-[50px]`).
  - Width: `w-full` across all buttons.
  - Corner radius: `rounded-xl`.
  - Typography: `font-sans text-sm font-semibold tracking-wide`.
  - Icon alignment: `flex items-center justify-center gap-2.5` with smooth icon color transition.
- **Action Set by Listing Type**:
  - **Sale**: 1. "Book Private Visit", 2. "Send Inquiry", 3. "Pay Token Advance"
  - **Rent**: 1. "Book Private Visit", 2. "Send Inquiry", 3. "Pay Security Deposit"
- **State Clarity**:
  - Guest users are presented with the matching `actionBtnClass` button triggering sign-in.
  - Disabled or role-restricted actions (agent/admin) preserve geometry with `opacity-50 cursor-not-allowed`.

---

## 7. Context-Preserving "Back to Listings" Navigation

### Behavior & Fallback Strategy
A dedicated, accessible back button is mounted directly above the main title and gallery:
- **Control Element**: Secondary outlined pill button (`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-dark-gray/20 bg-porcelain text-dark-gray font-mono text-xs font-medium hover:border-dark-gray hover:bg-dark-gray/5 focus-visible:outline-2 focus-visible:outline-deep-purple transition-all`).
- **Context Preservation**:
  - Handled by `handleBackToListings()`: Inspects `window.history.state?.idx > 0` and browser navigation history.
  - Calling `navigate(-1)` restores the user's previous browsing context intact: including their route, active search query, active filter chips, sort order, and pagination position (e.g., returning directly to `/buy?city=Kochi&page=2` without losing filter selections).
- **Safe Fallback**:
  - If a user enters directly via an external link, bookmark, or new tab where history is absent or outside the app:
    - Rental property (`listingType === 'rent'`) falls back safely to `/rent`.
    - Sale property (`listingType === 'sale'`) falls back safely to `/buy`.
  - Guarantees users are never directed to the wrong transaction type.

---

## 8. Mobile Content Order & Responsive Layout

### Reordered Reading Flow on Mobile
On phone-sized layouts (< 1024px), the layout flow prioritizes agent credibility and immediate reservation actions:
1. **Property Collage Gallery**: Retains rectangular frames and lightbox trigger.
2. **Agent Verification Block & Action Buttons**: Rendered directly beneath the gallery (`order-1 lg:order-2 lg:col-span-4`) so users can book a visit or contact the agent immediately without extensive scrolling.
3. **Property Details & Specifications**: Follows below the actions (`order-2 lg:order-1 lg:col-span-8`), presenting Key Dimensions, Architectural Narrative, Technical Specifications, Urban Connectivity, Virtual Tour, Calculators, Neighborhood Map, and Similar Properties.

On desktop (>= 1024px):
- Left column (`lg:col-span-8 lg:order-1`) occupies the primary reading space with all specifications and media.
- Right column (`lg:col-span-4 lg:order-2`) functions as a sticky sidebar (`lg:sticky lg:top-24`) keeping agent info and action buttons in view throughout scrolling.

---

## 9. Buy Home Loan EMI Calculator & Rental Outlay Data Binding

### Rebuilt Purchase EMI Calculator (Sale Only)
- **Real Property Price Binding**: Directly uses `property.price` as the baseline purchase valuation (`salePrice`).
- **Hierarchy & Clear Display**:
  - Prominent top callout: `Estimated Monthly EMI` (`₹{calculatedMonthlyEMI.toLocaleString('en-IN')} /mo`).
  - 4-metric summary grid:
    1. Down Payment (`formatINR(downPaymentAmount)` and `% of price`).
    2. Estimated Loan Principal (`formatINR(loanPrincipal)` and `% financed`).
    3. Loan Term (`{safeTenureMonths} Mos` and year conversion).
    4. Annual Interest Rate (`{safeInterestRate.toFixed(1)}% p.a.`).
- **Principal vs. Interest Ratio Bar**: Subtle visual bar displaying the split between borrowed principal (`loanPrincipal`) and borrowing cost (`totalLoanInterest`).
- **Interactive Accessible Controls**:
  - **Down Payment Slider**: Range `10%` to `80%` (step `5%`), showing live INR amount. Bounded so down payment can never exceed property valuation and loan principal remains non-negative.
  - **Loan Term Slider (Measured in Months)**: Range `12` to `360` months (step `12` months), displaying total months with year conversion. Paired with quick selection buttons (`60M`, `120M`, `180M`, `240M`, `360M`).
  - **Annual Interest Rate Slider**: Range `0.0%` to `15.0%` (step `0.1%`), defaulting to `8.5% p.a.` (standard benchmark).
- **Safe Standard Calculation**:
  - Implements standard Indian home loan amortization: `EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]`.
  - Safely handles zero or negative interest rate edge cases via `Math.round(principal / tenureMonths)`.
  - Recalculates immediately upon any slider or control change.
  - Accessible via touch and keyboard focus (`focus-visible:ring-2 focus-visible:ring-deep-purple`).
- **No Second Estimator**: Specific to purchase financing (`!isRent`). No secondary or duplicate budget estimator is rendered below it.

### Rental Cost Data Binding & Neutral Fallbacks (Rent Only)
- Connected to actual property fields rather than hard-coded mock values:
  - Base Monthly Rent: Binds to `property.price` formatted via `formatINR`.
  - Security Deposit: Binds to `property.deposit`. When null/unavailable, renders a neutral fallback (`—`) without inventing property-specific values.
  - Maintenance Charges: Binds to `property.maintenance`. When null/unavailable, renders a neutral fallback (`Included in Rent`).
  - Move-in Funds: Calculated strictly as `deposit + 1st month rent + maintenance`.
  - Utilities Slider: Configurable monthly utility estimate (₹1,000–₹15,000).
- Unweighted typography and consistent visual hierarchy matching the rest of the detail view.

---

## 10. Container Backgrounds & Contained Panorama Loading

### Unified Container Backgrounds
- Corrected background discrepancies where `Access & Urban Connectivity`, the `Action Box` ("Reserve & Acquire" / "Apply & Reserve Lease"), and `Lease Policies & Onboarding Requirements` were previously styled with off-white `bg-porcelain-tint` (`#FAF7F2`).
- Unified all property detail containers to the warm porcelain background treatment: `p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs`.
- Applied consistently across both Buy and Rent detail views while strictly preserving borders, corner radii, spacing, text contrast, and action button behaviors.

### Contained Panorama Loading & Stacking Isolation
- **Component-Level Containment**:
  - `PanoramaViewer.jsx` root container enforces `relative isolate z-10 w-full overflow-hidden rounded-xl border border-dark-gray/20 bg-porcelain shadow-xs`.
  - Dimension stability: Root container sets `style={{ height, minHeight: height }}` to prevent layout shifts or page jumping during loading.
- **Header Stacking Fix**:
  - PhotoSphereViewer's internal loader container uses `.psv-loader-container { z-index: 80; }`. By applying `isolate z-10` to the component root, all internal viewer children are confined within the viewer's stacking context.
  - The sticky global `Header.jsx` (`fixed top-0 z-50`) stays visually and physically above page content when reappearing during upward scroll.
  - PSV's native canvas loader is hidden via `[&_.psv-loader-container]:hidden` and `loadingTxt: null`.
- **Restrained Pulsing Lemon Loader**:
  - Replaces static circles with the project's signature restrained pulsing lemon indicator: outer ping ring (`bg-electric-lemon opacity-75 animate-ping`) and inner pulse circle (`bg-electric-lemon border border-dark-gray/20 shadow-xs animate-pulse`).
  - Fully accessible with `role="status"` and `aria-live="polite"` (`Calibrating 360° Panorama...` / `<span className="sr-only">Loading 360 virtual tour</span>`).
  - Respects accessibility preferences via `motion-reduce:hidden` and `motion-safe:animate-pulse`.

---

## 11. Property View Skeleton Loading & Role-Specific Restrictions

### Property Details Skeleton Loader
- Replaces the plain loading spinner with a calm, layout-matching skeleton (`PropertyDetailsSkeleton`) in `src/components/ui/Skeleton.jsx`.
- Resembles the structure being loaded:
  - Top breadcrumb and action bar skeletons.
  - Title, badge chips, and price header skeleton.
  - 12-column gallery collage skeleton (7-column primary card + 5-column secondary 2x2 grid).
  - 2-column main grid:
    - Left column: Key Dimensions box (8 spec placeholders), Architectural Narrative lines, Residence Amenities chip rows, Access & Connectivity transit boxes.
    - Right column: Agent Verification card, Action Box with 3 full-width button skeletons, and Financial Calculator box.
- Calm, neutral Porch Light porcelain styling: `bg-porcelain border border-dark-gray/15` with `bg-dark-gray/10` skeleton blocks.
- Respects `prefers-reduced-motion` via `motion-reduce:animate-none`.
- Distinct separation: Loading state renders the skeleton; error / invalid ID renders `ErrorState` with retry; content renders immediately upon resolution.
- Request Tracking: Utilizes `activeRequestIdRef` to discard stale async responses, preventing race conditions or displaying stale data when switching between property IDs.
- **Layout Pass-Through**: `PageLayout.jsx` renders `children` directly inside `<main>` without wrapping routes in route-level `AnimatePresence mode="wait"` wrappers, preventing cross-route opacity traps or unhandled freezes upon navigation from listings.

### Role-Specific Booking Restriction Messages
- Replaces the combined message with clear, role-specific messages derived directly from the authenticated role:
  - **Agent**: `Agent accounts can’t book properties.`
  - **Admin**: `Admin accounts can’t buy or rent properties.`
- Neither message mentions the other role.
- Styled consistently: `p-4 rounded-xl bg-porcelain border border-dark-gray/10 font-mono text-xs sm:text-sm text-dark-gray/70`.
- Applied seamlessly across both Buy and Rent property detail views and responsive breakpoints.

---

## 12. Buy & Rent Calculators, Contact Modal, Save/Compare Actions & Rupee Glyph Treatment

### 1. Buy Purchase-Financing Calculator
- **Price Binding**: Binds directly to the property's actual sale valuation (`property.price`).
- **User Controls**:
  - Down Payment: Interactive slider displaying both percentage (10% to 80%) and calculated INR amount.
  - Loan Term: Slider (12 to 360 months) with curated presets: `120M (10Y)`, `180M (15Y)`, `240M (20Y)`, and `360M (30Y)`.
- **Illustrative Benchmark Rate**: Assumed benchmark rate defined in single configuration value `DEFAULT_HOME_LOAN_INTEREST_RATE = 8.5` p.a.
- **Financial Breakdown**: Clear immediate calculation of down payment, loan principal, estimated monthly EMI, total interest, and total repayment.
- **Compliance Callout**: Expressly states that benchmark rates are illustrative, lender terms vary by applicant profile, and Porch Light does not issue loans or guarantee credit approval.

### 2. Rent Affordability & Lease-Cost Calculator
- **Data Binding & Fallbacks**: Uses `property.price` (monthly rent), `property.deposit`, and `property.maintenance`. When maintenance or deposit is null/unavailable, explicitly displays as *"Not provided"* or *"Included in rent"* rather than inventing values.
- **Utilities Slider**: Explicitly labeled: *"Estimated Utilities & Services (Renter's own estimate — not property-provided fact)"*.
- **Lease Horizon**: Supported terms `11`, `24`, and `36` months. Displays recurring cost for selected term, explicitly excluding the refundable deposit.
- **Move-In Capital**: Sums refundable deposit + first month's rent + platform escrow fee (₹999).
- **Refundable Deposit Isolation**: Displayed in a dedicated card clarifying that deposit is held in escrow and returned at lease termination, not money spent on rent.
- **Optional Income Assessment**: Generic 33% recommended income advice removed; replaced with optional monthly income input calculating the exact rent-to-income ratio without prescribing mandatory guidelines.

### 3. Contact Agent Modal & In-App Chat
- **Action Trigger**: "Send Inquiry" button updated to "Contact Agent", opening a Porch Light modal.
- **Contact Choices**:
  - *Message in Porch Light*: Opens in-app chat modal with agent and property context chip. Reuses existing thread for same user, agent, and property.
  - *Call Agent*: Available strictly when agent record contains a valid phone number.
  - *WhatsApp*: Available strictly when agent record contains an explicit `whatsappNumber`; never inferred from phone.
- **Attachment Support**:
  - Image (JPG, PNG, WebP) and PDF attachments up to 5MB.
  - Client-side validation with clear error toasts.
  - Binary blobs persisted in **IndexedDB** (`porchlight_chat_attachments`), keeping `localStorage` lightweight and unburdened.
  - In-app preview, simulated upload progress bar, lightbox viewing, and file downloading.

### 4. Sticky Save & Compare Actions
- **Save Action**: Accessible from top breadcrumb row and mobile bar. Synchronized reactively across Listings, Map, and Property View via `subscribeToSavedProperties`.
- **Compare Action**:
  - Binds to `compareService.addFromPropertyView(property)`.
  - Enforces strict listing type separation (Buy and Rent are never mixed).
  - Prepends property to compare selection and smoothly navigates to matching browse listings tab, revealing the compare tray.
  - Enforces 3-property ceiling with an informative toast if tray is already full, preventing silent overwrites.

### 5. Rupee Symbol Glyph Treatment
- **Root Cause**: Instrument Serif (`font-serif`) font files lack the Indian Rupee glyph (`₹`, U+20B9), resulting in missing/corrupted square fallback glyphs in price headings.
- **Solution**: The `RupeeSymbol` component renders `₹` using the robust Manrope/system-ui sans-serif font stack (`font-sans font-normal`) while surrounding price numerals maintain their exact Instrument Serif font-serif styling, unweighted and un-bolded.

---

## 13. Property View Crash Diagnosis & Lifecycle Hardening

### 1. React Rules of Hooks Violation Resolution
- **Root Cause**: In `PropertyDetailsPage.jsx`, two synchronization effects (`subscribeToSavedProperties` and `subscribeToCompare`) were positioned **after** early return statements for the loading skeleton (`if (loading) return <PropertyDetailsSkeleton />;`) and error states (`if (error || !property) return <ErrorState ... />;`).
- **Failure Mechanism**: On initial render while `loading` was `true`, React registered 21 hooks and returned early. When `propertyService.getPropertyById(id)` resolved and set `loading: false`, the re-render passed beyond the early return and encountered the two additional `useEffect` hooks, throwing `Error: Rendered more hooks than during the previous render.` The top-level `ErrorBoundary` caught this uncaught render exception and displayed the fallback screen: *"Something interrupted the light."*
- **Correction**: Relocated both `useEffect` hooks to the component top level alongside all other hooks unconditionally prior to any early returns, satisfying React's Rules of Hooks.

### 2. Defensive Image & Optional Data Fallbacks
- **Gallery & Lightbox Images**: Substituted raw `property.images` slicing and indexing with `galleryImages = Array.isArray(property?.images) && property.images.length > 0 ? property.images : (property?.coverImage ? [property.coverImage] : [])` across both the 12-column collage and full-screen lightbox. This prevents downstream `TypeError: Cannot read properties of undefined (reading 'slice')` on partial, pending, or custom properties.
- **Agent Context Invariants**: Passed default safe agent structure (`property?.agent || { name: 'Priya Nambiar', phone: '+91 98470 12345', agency: 'Malabar Heritage Realty' }`) and explicit `onOpenLogin` handlers into `ContactAgentModal` and `PropertyChatModal`.
- **Not Found State**: Maintained dedicated `ErrorState` ("Sanctuary not found") when a requested ID does not exist, with history-aware back navigation rather than crashing into the global error boundary.

---

## 14. Action Windows & Modals: Typography & INR Glyph Treatment

### 1. Controlled Weight Hierarchy (Calmed Bold Usage)
- **Problem**: Modals and action dialogs (Contact Agent, In-App Chat, Booking Appointment, and Payment Checkout) accumulated heavy `font-bold` and `font-semibold` styling across body text, field labels, option titles, and currency values, causing visual visual clutter and high cognitive load.
- **Implementation**:
  - Regular (`font-normal`) and medium (`font-medium`) weights are applied to ordinary labels, paragraphs, option selectors, monetary figures, and helper text.
  - Bold weight is strictly reserved for brief visual anchors (e.g., small status badges, active tab markers, primary form button text) where it aids immediate scanning.
  - Preserves established Porch Light font pairings (`Instrument Serif` for headings, `Manrope` for body, `Space Mono` for metadata chips and numerical codes).

### 2. Indian Rupee (₹) Symbol Fallback & Digit Grouping
- **Glyph Rendering**: Replaced raw `₹` characters with `<RupeeSymbol />` (Manrope / system-ui sans-serif fallback stack) across modal headers, context chips, breakdown rows, and payment totals. This prevents tofu / missing glyph display when rendered in fonts lacking the Indian Rupee character.
- **No Double Symbols**: Paired `<RupeeSymbol />` with `{ withSymbol: false }` or `formatINRPieces` so prices never duplicate (e.g. avoiding `₹ ₹35,000`).
---

## 15. Property Availability & Private Transaction Boundaries

### 1. Completed Buy Transactions
- When a property has completed its purchase transaction (`isSold: true` or `availabilityStatus: 'sold'`), it is withdrawn from public marketplace exploration.
- Attempted public access by unrelated users or guests displays a clean, respectful sold notice with booking/purchase actions disabled.
- Private transaction records and deed receipts are strictly restricted to the Buyer, managing Agent, and Admin.
- Relisting a completed sale via ordinary agent edit is prohibited.

### 2. Active Rental Leases
- Properties with active leases (`isLeased: true` or `rentalStatus: 'leased'`) disable duplicate walkthrough bookings and rental deposit applications.
- Private lease records and security deposit receipts are accessible only to the Tenant, managing Agent, and Admin.
- When a lease ends, re-listing requires handover inspection confirmation by the managing agent, preserving the original property identity rather than creating duplicate database records.

---

## 17. Private Price Negotiation Display & Public Concealment

### 1. Header & Dimension Treatment
- When `property.negotiable` is true, the public numeric price is strictly concealed:
  - Header: displays large serif `Price on request` paired with a small mono indicator badge `Private Negotiation`.
  - Rate per sq ft: suppressed entirely (avoids reverse-engineering private asking prices).
  - Key Dimensions Card: Monthly Rent / Valuation renders `On request` with subtext `Private terms`.
  - Mobile Sticky Bar: displays `Price on request` and `Private negotiation` label without numeric values.

### 2. Financing & Budget Estimators
- Fixed-price calculation blocks (Home Loan EMI Calculator and Rental Outlay Estimator) are replaced by a dedicated Private Negotiation Card:
  - Explains that the residence is available under confidential valuation and custom acquisition schedules.
  - Direct CTA button (`Contact Agent for Terms`) opens the Contact Agent / Message modal for personalized terms.
- Non-negotiation listings retain standard benchmark EMI and rental outlay calculations.

---

## 18. Conditional Floor Specifications by Classification

### 1. Canonical Mapping via `getFloorFieldConfig`
- Floor data is displayed strictly according to the architectural classification:
  - **Unit-style residences** (`apartment`, `studio`, `penthouse`, `office`, `shop`, `commercial`): Key Dimensions displays `Floor Level` as `${property.floor} / ${property.totalFloors}` with subtext `Total Floors`. Swiss Spec Sheet shows `Level ${property.floor} of ${property.totalFloors}`.
  - **Standalone structures** (`villa`, `house`, `mansion`, `townhouse`, `farmhouse`, `warehouse`, `industrial`): Key Dimensions displays `Total Floors` as `${property.totalFloors} Floors` with subtext `Entire Structure`. Swiss Spec Sheet shows `Total Structure Floors: ${property.totalFloors} Floors / Stories`. Unit-floor level is cleanly omitted.
  - **Land & Plots** (`plot`): Displays `Plot Layout` / `Unbuilt Ground` and omits all floor rows cleanly from both Key Dimensions and the Swiss Spec Sheet.

## 19. Type-Based Field Applicability & Clean Spec Sheet Display

### 1. Unified Applicability Filtering (`getPropertyFieldApplicability`)
- Key Dimensions and the Swiss Spec Sheet adapt dynamically based on property classification and transaction type (`sale` vs `rent`):
  - **Residential listings**: Displays Bedrooms (BHK), Bathrooms, Balconies, Carpet/Built-up Area, Furnishing, Facing, and Pet Policy where applicable.
  - **Commercial, Shop & Office listings**: Replaces bedroom metrics with Carpet/Built-up Area, Dedicated Parking, Clear Ceiling Height, and 3-Phase Power Load / Loading Docks (for warehouses). Hides residential clubhouse, gym, and pet policies.
  - **Land & Plot listings**: Replaces built-up/carpet specs with Parcel Plot Area (sq yd / cents), Zoning Classification, Boundary Wall status, and Road Frontage width. Omits all floor, bedroom, bathroom, furnishing, and interior rows.
  - **Swiss Spec Sheet Cleansing**: Strictly suppresses any row whose attribute is empty, stale, or marked inapplicable by `getPropertyFieldApplicability`. No placeholder rows like "N/A" or "None" are rendered.

## 20. Entrance & Plot Facing Compass Directions

### 1. Eight Canonical Compass Directions
- The entrance and plot facing direction supports all eight compass orientations: `North`, `North-East`, `East`, `South-East`, `South`, `South-West`, `West`, and `North-West`.
- Canonical mapping helper `formatFacingDirection(val)` safely parses abbreviations (`NE`, `SW`, `SE`, `NW`, `north`, etc.) and legacy casing into canonical labels.
- Displayed prominently in **Key Dimensions** with "Vastu aligned" subtext and in the **Swiss-Style Spec Sheet** as "Entrance Facing Direction" (or "Plot Facing" for land parcels) when applicable.





