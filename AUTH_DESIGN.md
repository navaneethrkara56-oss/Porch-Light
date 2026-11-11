# AUTH_DESIGN.md — Porch Light Authentication Specification

## 1. Visual Direction & Brand Tokens
The Login (`/login`) and Register (`/register`) experiences are built specifically to reflect Porch Light's quiet, architectural sanctuary aesthetic:
- **Palette Tokens**:
  - `porcelain` (`#F1ECE3`): Form container background, input backdrop tint, subtle divider backgrounds.
  - `sand` (`#E7DFD2`): Secondary warm neutral accents.
  - `charcoal` (`#26262B`): Primary button fill, high-contrast labels, text, input outlines.
  - `deep-purple` (`#5E4F7A`): Active tab pill, header accents, focused border states, links.
  - `heather` (`#8F7FA8`): Eyebrow mono subtitles (`Quiet Sanctuary`, `Membership Registration`).
  - `lemon` (`#E6FF3D`): Tiny glowing dot in the brand badge icon only; never large fills or text.
- **Typography Tokens**:
  - **Instrument Serif**: Primary display headings (`Sign in with email`, `Create an Account`).
  - **Manrope**: Form descriptions, body text, placeholder text.
  - **Space Mono**: Control labels, demo chips, tab text, validation indicators, button tracking.
- **Card Container**:
  - Translucent soft-blurred card (`bg-porcelain/75 backdrop-blur-md border border-dark-gray/20 rounded-3xl shadow-2xl p-5 sm:p-7`).
  - Subtle increased transparency (`bg-porcelain/75`) allows the vertical fluted glass textures and architectural tones of the background shader to show through elegantly while preserving strict >= 4.5:1 text and control contrast.
  - Official Porch Light website logo integration (`/brand/logo.png`) rendered via `AuthBrandLogo.jsx`:
    - Sized modestly at `h-14 sm:h-16 w-auto max-w-[220px]` (enlarged from previous 40px) to read clearly and legibly without dominating the form heading.
    - Strict `object-fit: contain` preserves aspect ratio and prevents distortion.
    - Consistent sizing and centered alignment applied across both `/login` and `/register`.
    - Includes graceful fallback slot with brand typography and pulsing lemon marker.

---

## 2. Quiet Sanctuary Photographic Background & Instant Auth Tab Transitions
- **Technology**: Direct photographic cover treatment (`src/components/auth/AuthBackground.jsx`), eliminating background blur, fading overlays, and WebGL shader overhead entirely.
- **Persistent Root Layout Component**: `src/components/layout/PageLayout.jsx` hosting `src/components/auth/AuthBackground.jsx`.
- **Instant Cross-Navbar & Tab Navigation Architecture**:
  - The Paper Shader effect (`@paper-design/shaders-react`) has been removed from the auth pages, eliminating WebGL context creation, shader compilation, uniform re-binding, and canvas animation frame loops.
  - The background displays the existing high-resolution architectural background image (`public/auth/auth-bg.png`) directly without blur or fading overlays:
    - Crisp, vivid photographic cover presentation (`w-full h-full object-cover`).
    - Pale overlays (`bg-porcelain/50` and gradient/vignette overlays) removed completely so the background image is clearly visible without washout.
    - Frosted blur is applied exclusively to the login/register card container (`bg-porcelain/75 backdrop-blur-md`), keeping the surrounding background completely clear.
  - `AuthBackground` is hosted persistently at the root `PageLayout` level:
    - On non-auth pages (`/`, `/buy`, `/rent`), the container is hidden (`opacity-0 pointer-events-none invisible`).
    - On auth routes (`/login`, `/register`, `/forgot-password`), the background is visible (`opacity-100`).
    - Direct tab switching between `/login` and `/register` is isolated with `React.memo(AuthBackgroundImpl)`, incurring zero re-renders or background recalculations on tab switches.
    - Form draft state is preserved in-memory via `src/features/auth/authDrafts.js`, ensuring entered field values are never wiped out when exploring between Login and Register tabs.
- **Cross-Route Navigation Performance Optimization**:
  - **Single Guard Layer**: In `src/app/router.jsx`, `<GuestOnly>` wraps `<AuthLayout />` once at the parent route level, eliminating redundant guard mount/unmount overhead during auth tab switching.
  - **Eliminated Route Code-Splitting Waterfall**: `LoginPage`, `RegisterPage`, and `ForgotPasswordPage` are imported statically in `src/app/router.jsx`, preventing `Suspense` flash and async network bundle delays when navigating from other header tabs (`Home`, `Buy`, `Rent`).
- **Local Asset Slot**:
  - Background asset path: `public/auth/auth-bg.png`.
  - Official website logo asset path: `public/brand/logo.png`.
- **Interaction Safety**:
  - Fixed full-screen container with strict `pointer-events-none select-none z-0`.
  - Background image never intercepts mouse, touch, or keyboard input.

---

## 3. Login Page (`/login`)
- **Primary Flow**: Email and password credentials validated with `react-hook-form` and connected to `authService.login()`.
- **Autocomplete Attributes**: `autoComplete="email"` on Email, `autoComplete="current-password"` on Password.
- **Password Visibility Control**: Interactive show/hide toggle button (`Eye` / `EyeOff` from `lucide-react`) with accessible `aria-label`.
- **Account Recovery**: Accessible link to `/forgot-password`.
- **Development Demo Accounts**:
  - One-click quick-fill pills for instant testing across all system roles:
    - Buyer (`user@demo.com`)
    - Verified Agent (`agent@demo.com`)
    - Pending Agent (`pending@demo.com`)
    - Admin (`admin@demo.com`)
- **Social Sign-In (Google User-Only Rule)**:
  - Exactly **ONE** provider: **Google** via `GoogleLoginButton`.
  - **Strict User Account Restriction**: Google sign-in is strictly for User accounts only. It cannot create or authenticate an Agent or Admin account.
  - Role selection modal removed: clicking "Continue with Google" signs in directly as a verified User profile (`user@demo.com`).
  - Clear secondary notice placed directly below the button: *"Google sign-in is available for User accounts only."* styled with Space Mono (`font-mono text-[11px] text-dark-gray/70 text-center tracking-tight`).
- **High-Visibility Footer Link**:
  - Exact text: `No account yet? Register here`
  - Destination: `/register`
  - High-visibility styling: `font-mono text-[13px] sm:text-sm text-dark-gray/80` with a distinct underline (`underline underline-offset-4 decoration-deep-purple/40 hover:decoration-deep-purple hover:text-charcoal`) and comfortable touch target padding (`px-1.5 py-1 inline-block`).
  - Readily noticeable without competing with the primary submit action.
- **State Handling**: Disabled submit button and `Verifying...` indicator during async submission. Error toasts wired to `AuthContext`.

---

## 4. Register Page (`/register`)
- **Separate Route**: Dedicated `/register` view maintaining clean URL hierarchy.
- **Accessible Two-Tab Architecture**:
  - Tab 1: **User** (`role="tab"`, `id="tab-user"`, `aria-selected`, `aria-controls="panel-user"`).
  - Tab 2: **Agent** (`role="tab"`, `id="tab-agent"`, `aria-selected`, `aria-controls="panel-agent"`).
  - High-contrast active tab indicator in `bg-deep-purple text-white font-semibold`.
- **Field Differentiation & Verified Requirements**:
  - **User Registration**:
    - Full Name (`name`, required, `autoComplete="name"`)
    - Base City (`city`, required, defaults to Bengaluru, `autoComplete="address-level2"`)
    - Email Address (`email`, required, email regex validation, `autoComplete="email"`)
    - Password (`password`, required, minimum 6 characters, with show/hide toggle, `autoComplete="new-password"`)
    - Phone Number (`phone`, optional, `autoComplete="tel"`)
    - Contains strictly user account fields; NO Agent-only fields.
    - **Google Sign-In Option**: Retained on User tab with the secondary notice: *"Google sign-in is available for User accounts only."*
  - **Agent Registration**:
    - Account credentials: Full Name, Base City, Email, Password (show/hide toggle), Phone.
    - Agency / Brokerage Name (`agency`, required for agents, `autoComplete="organization"`).
    - Agent RERA Certificate Number (`reraNumber`, optional/recommended).
    - Interactive Mock License Attachment card: Click-to-attach PDF/JPG with confirmation state (`rera_license_certificate.pdf (Attached)`).
    - Clear explanatory notice: *"Pending agent accounts can browse immediately, but require verification before publishing listings."*
    - Pending Verification State: Newly registered agents are created with `isVerified: false` and redirected with confirmation toast: *"Agent profile submitted. Account is pending verification."*
    - **No Google Registration**: Google sign-in option and divider are completely removed/hidden from the Agent tab. Agents cannot bypass Agent-specific required fields or create an Agent account via Google.
- **Role Immutability & Admin Safety**:
  - Public registration supports only `user` and `agent` roles.
  - No public Admin registration (guarded in `services/auth.js`).
  - Account roles are strictly immutable post-registration.
  - Connected directly to `authService.register()`; pages never touch `mockStore` directly.
- **High-Visibility Footer Link**:
  - Exact text: `Already registered? Sign in here`
  - Destination: `/login`
  - High-visibility styling: `font-mono text-[13px] sm:text-sm text-dark-gray/80`, distinct underline (`decoration-deep-purple/40 hover:decoration-deep-purple hover:text-charcoal`), and accessible focus ring and touch targets.
  - Presented clearly in both User and Agent registration views.

---

## 5. Auth Header & Site Footer Integration
- **Shared Navbar Indicator & Seamless Transition**:
  - Header structure, centering, alignment, typography, blur, and colors are preserved 100%.
  - Navigation tabs for guests: `Home`, `Buy`, `Rent`, `Login`, `Register`.
  - The active highlight/underline transition between `Login` and `Register` uses the exact same component (`motion.div`), animation (`layoutId="header-active-tab"`), timing, and spring physics (`stiffness: 400, damping: 32`) as the other navbar tabs.
  - Tabs are scoped within `<LayoutGroup id="header-nav-tabs">` to ensure isolated layout projection across route changes.
  - Header visibility state is strictly preserved (`setHidden(false)` on route navigation), moving the active highlight smoothly and consistently between Login and Register without flashing, jumping, or resetting the header.
- **Full Site Footer in Normal Flow**:
  - Both Login and Register pages render the standard Porch Light site `Footer` below the auth container in normal document flow via `PageLayout.jsx`.
  - The footer is never overlaid on the form or forced to fixed clipping constraints.
  - On large desktop screens, the auth form container centers comfortably within view, while the user can naturally scroll vertically down into the footer.
  - On mobile and shorter screens, the page scrolls smoothly and naturally without clipping inputs, touch targets, or footer actions.
