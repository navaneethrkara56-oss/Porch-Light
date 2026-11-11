# Porch Light — Buy & Rent Pages Design Specification

## Overview & Architecture

The **Buy** (`/buy`) and **Rent** (`/rent`) pages are distinct routes providing tailored real-estate exploration for ownership acquisitions and luxury long-term leases, respectively. While sharing a unified browsing architecture, Swiss-style information hierarchy, and responsive layout, each route maintains its own visual identity, data stream, and transaction-specific metadata.

```
                      ┌───────────────────────────────┐
                      │    AppRouter (router.jsx)     │
                      └───────┬───────────────┬───────┘
                              │               │
                     Route: /buy     Route: /rent
                              │               │
                      ┌───────▼───────┐ ┌─────▼───────┐
                      │    BuyPage    │ │   RentPage  │
                      └───────┬───────┘ └─────┬───────┘
                              │               │
                              └───┬───────┬───┘
                                  │       │
                      ┌───────────▼───────▼───────────┐
                      │     PropertyBrowseLayout      │
                      │  - ListingFilterBar (unified) │
                      │  - SortDropdown (custom)      │
                      │  - PropertyFilterModal (Portal│
                      │  - Tabs: [Listings] [Map Exp] │
                      │  - PropertyGridCard (3-col)   │
                      │  - Pagination (12 / page)     │
                      │  - PropertyMapExplorer (OSM)  │
                      │  - MapPropertyPreview (popup) │
                      │  - Comparison Drawer (docked) │
                      └───────────────────────────────┘
```

---

## 1. Shared Layout vs. Route-Specific Identities

### Shared Capabilities
- **Header Direct Alignment**: Page layout `<main>` uses `pt-[72px]` matching the global header's exact height. The page intro begins cleanly directly below the global header without unnatural blank strips or overlaps.
- **Dynamic Sticky Bar**: Sticky search and filter bar dynamically shifts its `top` offset (`0px` when header is hidden on scroll-down, `72px` when header returns on scroll-up) using a matching `duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]` transition.
- **Search & Filter Controls (`ListingFilterBar`)**:
  - Locality/project/landmark/RERA autocomplete search field with clear button and 300ms debounce.
  - Interactive "Near Me" on/off toggle with immediate loading spinner feedback.
  - Integrated custom `SortDropdown` with keyboard navigation and subtle fade/slide animation.
  - Single "Filters" button with active badge counter opening the portal-rendered `PropertyFilterModal`.
  - Dismissible active filter tag chips row directly below the controls.
- **Two-Tab Browsing Architecture**:
  1. **Listings Tab**: 3-column compact property grid, 12 items per page, accessible pagination.
  2. **Map Explorer Tab**: Full-width interactive Leaflet map using free OpenStreetMap tiles with desktop side list and mobile collapsible drawer.
- **Role-Aware Actions**: Save and Compare actions available to authenticated users, with guest login modal (`LoginOverlay`) for non-logged-in visitors.
- **Docked Comparison Drawer**: Floating pill docked at screen bottom when 1–3 listings are queued for side-by-side comparison.

### Route-Specific Differences

| Dimension | Buy Page (`/buy`) | Rent Page (`/rent`) |
| :--- | :--- | :--- |
| **Route & Path** | `/buy` | `/rent` |
| **Category Pill** | `Acquisition & Ownership` | `Long-term & Leased Sanctuaries` |
| **Page H1** | `Properties for Sale` | `Residences for Rent` |
| **Tagline** | Curated architectural properties, villas, and apartments available for purchase. | Distinguished homes, penthouses, and tranquil villas available for verified annual and multi-year leases. |
| **Price Slider Limits** | ₹10 Lakhs to ₹15 Crores (in ₹ Cr / L formatting, with interactive Min & Max) | ₹15,000 to ₹6,00,000 / month (in ₹ k/mo formatting, with interactive Min & Max) |
| **Property Types** | Villa, Penthouse, Estate, Luxury Apartment, Heritage, Mansion, Farmhouse, Plot | High-Rise Apartment, Villa, Penthouse, Studio, House, Office, Shop, Warehouse |
| **Price Display** | Total Price (₹ Cr / ₹ L) + Estimated monthly EMI | Monthly Rent (₹/mo) + Security Deposit & Lease Terms |
| **Sorting Options** | Featured, Newest First, Price: Low to High, Price: High to Low, Area Smallest First, Area Largest First | Curated Rentals, Newest First, Rent: Low to High, Rent: High to Low, Area Smallest First, Area Largest First |
| **SEO Title** | `Properties for Sale | Porch Light` | `Residences for Rent | Porch Light` |

---

## 2. Two-Tab Navigation & Horizontal Slide Transition

### Tab Control Bar
- Located directly below the sticky search/filter bar and above the active view.
- Outlined pill container with Porch Light tokens (`bg-sand/60 border border-dark-gray/15 rounded-full p-1`).
- **Active State**: Deep purple background (`bg-deep-purple text-porcelain shadow-sm font-semibold`), distinct and unmistakable.
- **Inactive State**: Charcoal text (`text-dark-gray/70 hover:text-dark-gray hover:bg-black/5 font-medium`).
- **Tab Labels**:
  - `Listings (N)` with `<LayoutGrid className="w-3.5 h-3.5" />`
  - `Map Explorer (M)` with `<Map className="w-3.5 h-3.5" />`
- Right side displays active context:
  - Listings: `Showing X–Y of N residences/rentals in [City/India]`
  - Map: `N pins plotted on map in [City/India]`

### Horizontal Slide Transition
- Uses Framer Motion `AnimatePresence` with directional slide variants:
  - Transitioning Listings → Map: slides in from right (`x: 24` to `0`, 0.25s).
  - Transitioning Map → Listings: slides in from left (`x: -24` to `0`, 0.25s).
  - Restrained and quick easing: `[0.22, 1, 0.36, 1]`.
  - Respects `prefers-reduced-motion` (instant opacity fade, zero positional shift).
  - No scroll-jacking or full-page animation.

### State Retention
- Switching tabs preserves all active search inputs, selected filters, Near Me state, and sort orders without re-querying or duplicating data.

---

## 3. Listings Tab: Compact Three-Column Grid & Pagination

### Grid Density (`PropertyGridCard.jsx`)
- **Desktop (>= 1024px)**: 3 columns (`grid-cols-3 gap-6`).
- **Tablet (768px – 1023px)**: 2 columns (`grid-cols-2 gap-6`).
- **Mobile (< 768px)**: 1 column (`grid-cols-1 gap-6`).
- **Card Structure**:
  1. **Top Photo**: 3:2 `SmartImage` with smooth hover zoom (`scale-105`), subtle bottom vignette, and fallback image support.
  2. **Badges**: Property type pill top-left; Premium sparkle badge or RERA verified tag; Save & Compare action buttons top-right for authenticated users.
  3. **Content**: Locality and city with `MapPin` icon; single-line serif title; bold deep-purple price display (`₹ Cr` / `₹ L` for sale, `₹/mo` for rent).
  4. **Swiss Facts Row**: Border-separated concise metadata (BHK, Area, Possession status or Security deposit).
  5. **Card Selection**: When a property is selected from the map or clicked, its card receives a clean, single-layer accent border (`border-2 border-deep-purple bg-sand/25 shadow-md`) without secondary box-shadow rings or double outlines, ensuring crisp visual feedback that matches the Porch Light aesthetic.

### Accessible Pagination (`Pagination.jsx`)
- 12 matching properties per page.
- Accessible navigation bar with `Previous`, numbered page pills, smart ellipsis (`...`), and `Next`.
- Active page highlighted in deep purple with porcelain text.
- Full keyboard accessibility with `aria-label` and `aria-current="page"`.
- Applying or modifying search queries, filters, Near Me, or sort orders automatically resets pagination to page 1.
- Page changes smoothly scroll the viewport to the top of the results canvas (`#browse-results-canvas`) dynamically offset by the sticky header/filter toolbar (`76px` / `148px`), keeping filters, sort order, and query completely intact without page jumping or double scrolling.

---

## 4. Map Explorer Tab: Full Working Leaflet Map & Side List

### Full Map View (`PropertyMap.jsx` & `PropertyMapExplorer.jsx`)
- **Height & Viewport Fit**: Constrained to available desktop viewport height (`lg:h-[calc(100dvh-220px)] lg:min-h-[480px] lg:max-h-[660px]`; `500px` mobile, `540px` tablet) so the entire map workspace, side list, controls, attribution, and preview card fit comfortably without requiring window scrolling.
- **India-Focused Framing & Panning Boundaries**:
  - Initial framing set to encompass all of India (`INDIA_VIEW_BOUNDS: [[8.0, 68.0], [35.5, 97.5]]`) centered at `[22.0, 79.0]` with default zoom 5.
  - Panning restricted via `maxBounds={INDIA_MAX_BOUNDS}` (`[[4.0, 64.0], [38.5, 102.0]]`) with `maxBoundsViscosity={0.85}` and `minZoom={4}` so users cannot drag far away from the Indian subcontinent.
  - Dynamic bounds fitting: nationwide property sets frame India comfortably; single-city filters smoothly fit localized bounds (`maxZoom: 13`).
- **Map-Tab In-Place Result Updates (Zero Scroll-To-Top)**:
  - Applying or modifying search text, filter parameters, Near Me location, or sort options while on the Map tab updates pins and side list in place without scrolling the page to the top.
  - Sorting reorders the side list according to the selected option without altering geographic pin locations.
- **Natural Leaflet Interaction**:
  - Full mouse-wheel zooming enabled (`scrollWheelZoom={true}`) and isolated from window smooth scroll via `.leaflet-container` event delegation.
  - Pan dragging enabled (`dragging={true}`) with touch zoom/pinch support on mobile.
  - Double-click zoom enabled (`doubleClickZoom={true}`).
- **Zero Map Shaking**:
  - Bounds fitting is strictly fingerprinted to the sorted array of matching property IDs (`lastFittedKeyRef`), preventing map jumps on card/marker hovers.
  - Container resize handling is debounced with `map.invalidateSize({ pan: false })`.
  - Tab transition utilizes an opacity fade for the Map tab to avoid mounting Leaflet inside active CSS horizontal transforms.
- **Tile Provider**: Free OpenStreetMap standard tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with required visible attribution (`&copy; OpenStreetMap contributors`).
- **Zero API Keys**: No API key, registration, token, or paid service required.
- **Styling**: Blended with Porch Light porcelain palette using CSS filter `.map-tile-beige` (`sepia(18%) contrast(96%) brightness(98%) hue-rotate(345deg)`).
- **Graceful Error Handling**: Detects `tileerror` events and displays a calm, themed notification banner while keeping pins plotted and interactive on the warm beige grid.

### Desktop Side List
- Compact scrollable list of property names docked beside the map (`w-80 lg:w-84`).
- Aligned to the exact height of the map container with independent internal scroll.
- Header shows count of properties plotted on the map.
- Sorted according to the currently active sort order.
- Each item displays property thumbnail, title, locality, price, and BHK.
- Clicking an item:
  - Highlights the item (`bg-deep-purple/10 border-deep-purple`).
  - Highlights the corresponding map pin.
  - Smoothly pans the map to the coordinates (`map.panTo([lat, lng])`).
  - Opens the floating `MapPropertyPreview` card.

### Mobile Drawer Panel
- On mobile/tablet viewports, the map takes 100% width.
- A floating `List (N)` button opens a responsive bottom sheet drawer displaying the full list of matching properties with comfortable touch targets (≥ 44px).
- Tapping any property selects it, closes the drawer, and centers the map pin.

### Pins & Closable Preview Card (`MapPropertyPreview.jsx`)
- Custom `L.divIcon` pins with flex-centering (`.custom-property-pin`), `iconSize: [96, 32]`, and `iconAnchor: [48, 16]`.
- Labels are horizontally and vertically centered with `leading-none`, consistent horizontal padding, and truncation safety for long prices (`max-w-[80px]`). Properties with `negotiable: true` display `On Request` to conceal private asking prices.
- Anchored precisely at geographic coordinates with zero drift on pan/zoom.
- Selected pin features deep purple fill with `border-2 border-electric-lemon` and pulsing lemon dot.
- Selecting a pin opens `MapPropertyPreview` floating over the map with explicit `X` close button that clears selection.
- Selecting a pin opens `MapPropertyPreview` floating over the map:
  - Compact card with photo thumbnail, title, price, location, specs, and role-aware Save/Compare actions.
  - Primary "View Sanctuary" CTA button navigating to `/property/:id`.
  - Explicit `X` close button that clears selection and dismisses the preview.

---

## 5. Search, Filter & Sort Synchronization

1. **Unified Service Pipeline (`src/services/properties.js`)**:
   - `getProperties({ ...filters, sortBy, page, pageSize })` handles filtering, multi-field search matching, and sorting on the complete dataset.
   - Returns `{ data, allMatching, page, pageSize, total, totalPages }`.
   - `data` feeds the 12-item Listings grid for the current page.
   - `allMatching` feeds the Map Explorer pins and side list, ensuring all matching properties appear on the map regardless of pagination page.
2. **Sorting**:
   - Reorders the Listings grid and the Map-tab side list according to criteria (Price Low-High, Price High-Low, Area Smallest First, Area Largest First, Newest, Featured).
   - Pins remain anchored strictly to their geographic coordinates.
3. **Filter Changes & Canonical Property Types**:
   - Filter criteria are synchronized with canonical property classifications imported from `src/constants/propertyTypes.js` (`apartment`, `villa`, `penthouse`, `house`, `mansion`, `townhouse`, `farmhouse`, `studio`, `plot`, `office`, `shop`, `commercial`, `warehouse`, `industrial`).
   - Mode-specific subsets (`SALE_PROPERTY_TYPES` and `RENT_PROPERTY_TYPES`) guide the multi-select options in `PropertyFilterModal.jsx` with consistent canonical labels via `formatPropertyType()`.
   - Instantly update both the Listings grid count and visible map pins.
   - If a selected pin is filtered out by new criteria, its preview is safely dismissed.
   - Resets pagination to page 1.

---

## 6. Shared Save & Compare Behavior Across Listings, Map, and Property View

### 1. Unified Save State Across All Surfaces
- **Cross-View Synchronization**:
  - Toggling Save from a Listings grid card, Map side-list property row, floating Map pin preview, or Property View immediately synchronizes via `propertyService.subscribeToSavedProperties`.
  - Unsaved states and saved states stay reactive without requiring manual browser reload or page re-fetching.
- **Role Permissions**:
  - Unauthenticated guests clicking Save are prompted with the `LoginOverlay` modal with an informative sanctuary title prompt.
  - Agent and Admin accounts follow role rules.

### 2. Compare Behavior & Strict Category Separation
- **Strict Listing Type Separation**:
  - Sale (`sale`) and Rental (`rent`) properties are managed in isolated compare sets (`state.sale` and `state.rent` in `compareService`). Mixing sale and rental properties in the same comparison is strictly prevented across all views.
- **Compare Limit & Non-Destructive Addition**:
  - Maximum of 3 properties per category.
  - Attempting to add a 4th property triggers an informative notice explaining the 3-property ceiling without silently overwriting existing selections.
  - Adding a property uses non-destructive additions (`addCompare` / `addFromPropertyView`), ensuring existing items are never toggled off unintentionally.
- **Compare Availability Across Surfaces**:
  - Listings cards (`Columns` icon button in `PropertyGridCard` and `PropertyRowCard`).
  - Map side-list property rows and floating Map pin preview cards (`MapPropertyPreview`).
  - Property View (top bar and sidebar action container).
- **Property View Compare Flow**:
  - Adding to compare from Property View prepends the property to its category's list and navigates to the matching Buy or Rent browse page, opening the Listings tab with the compare tray active and selection intact.
- **Compare Page (`/compare`) & "Remove all" Control**:
  - Offers category switcher tabs with live property counters: `Sale (N)` and `Rent (N)`.
  - Individual property removal button (`X`) on each column header that immediately decrements item count and cleans up URL parameters.
  - **"Remove all" Control**: Clearly labeled button in the top action bar and in the 1-property state. Clicking it clears only that transaction type's compare set (`compareService.clearCompare(activeType)`), notifies via toast, updates visible trays, and leaves the other transaction type completely untouched.
  - **Zero / 1-Property States**: When fewer than 2 properties remain, presents an informative state ("No properties selected" or "Add at least 2 properties to compare") with direct CTAs to browse listings. In 1-property mode, users see a preview of their queued sanctuary alongside Quick Add recommendations to quickly reach a 2-property comparison without dead-ends. Does NOT inject mock or fake default properties on empty lists.
- **Mobile Responsive Compare Experience (`< 768px`)**:
  - **Vertical Stacked Cards**: At phone viewports, the multi-column desktop comparison table is replaced by responsive, vertically stacked comparison cards (`block md:hidden`), avoiding horizontal page overflow or squashed cell text.
  - **Sanctuary Index & Touch Targets**: Each property card features a 16:9 imagery preview, Sanctuary index badge (e.g., `Sanctuary 01 of 02`), and an easily accessible 38px touch-friendly remove button (`X`).
  - **Structured Key-Value Specs**: Specs are formatted in a clean 2-column key-value grid (RERA, Carpet Area, Configuration, Furnishing, Type-specific deposit/possession/parking) using proportional typography and `<RupeeSymbol />` for clean currency rendering.
  - **Full Amenities Matrix**: Key amenities (Swimming Pool, Clubhouse, Private Balcony, High-Speed Elevators, EV Charging, 24/7 Security) are displayed in a responsive 2-column badge grid showing presence (`Check` in brass) or absence (`Minus` in muted charcoal).
  - **Desktop Layout Preservation (`>= 768px`)**: The comprehensive multi-column comparative table remains strictly preserved on tablet and desktop screens (`hidden md:block`), maintaining side-by-side spec alignment and sticky header ergonomics.

---

## 7. Property Availability & Transaction Access Lifecycle

1. **Completed Buy Transactions**:
   - Once a property completes a purchase transaction (`isSold: true` or `availabilityStatus: 'sold'`), it is automatically excluded from `/buy` listings, map pins, and global search.
   - It cannot be re-purchased or booked for walkthrough visits.
   - Transaction details are restricted strictly to the Buyer, managing Agent, and Admin. Relisting via ordinary agent edit is blocked.

2. **Rental Availability & Active Leases**:
   - Actively leased properties (`isLeased: true` or `rentalStatus: 'leased'`) are automatically excluded from public `/rent` listings, map markers, and search results.
   - Duplicate walkthrough bookings and lease transactions are prevented.
   - When a lease reaches its end date, the property becomes eligible to return to public results only when no renewal or dispute is pending, and the managing agent explicitly confirms handover inspection (`confirmRentalHandover`). Re-listing restores the same property record rather than duplicating database records.

3. **Early Rental Termination Workflow**:
   - Either the tenant or managing agent can initiate an early lease exit.
   - The other party must explicitly agree before the lease can be closed.
   - While awaiting agreement, the lease remains active and the property stays unavailable to the public.
   - Upon agreement, the lease status transitions to `ended` and the property transitions to `pending_handover` until the managing agent confirms handover completion.

---

## 8. Canonical Field Applicability Across Browse and Cards

1. **Consistent Architectural Metrics**:
   - Cards (`PropertyGridCard`, `PropertyRowCard`, `PropertyRow`) and map previews render metrics tailored to property classification:
     - Residential: Configuration (BHK), Carpet Area, Furnishing.
     - Commercial/Office/Shop: Carpet/Built-up Area, Floor Level, Commercial zoning.
     - Plots/Land: Parcel Area (sq yd / cents), Ground Status, Zoning.
   - Irrelevant specs (e.g. BHK or Furnishing on plots; Carpet Area on raw parcels) are strictly suppressed to maintain scannability and avoid misleading placeholders.
2. **Private Negotiation Handling**:
   - When `negotiable: true`, cards, map pins, and previews display `Price on request` or `On Request`, suppressing numeric amounts across both Buy and Rent browse interfaces.


