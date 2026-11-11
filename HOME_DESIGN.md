COLOR TOKENS (CSS variables and Tailwind tokens, one place, change once and it updates everywhere):
porcelain #F1ECE3 (main background), sand #E7DFD2 (one alternate light section), charcoal #26262B (text, dark sections, footer), deep purple #5E4F7A (reviews band, heading accents), heather #8F7FA8 (agent desk band, small tints), lemon #E6FF3D (tiny marker only: logo dot; never large fills, never text, no square next to hero wordmark).
FONTS: Anton ONLY for the big wordmarks (hero and footer). Instrument Serif for headings, tagline, logo. Manrope for body. Space Mono for labels, nav, buttons, stats. Install via @fontsource. Scale: body 18 px, captions 14 px, mono labels 13 to 14 px, nav 14 px, buttons 15 to 16 px. Section titles clamp(2.5rem, 5vw, 5rem) with line-height 0.98.
SHAPES: photo corners 20 px everywhere, section top edges 28 px, buttons 12 px, inputs 12 px. Plain rectangles only: NO arches, circles, leaf or window frames.
BUTTONS: two styles only, solid and outlined, min height 52 px. Defined as "light" and "dark" variants:
- "light": background #F1ECE3, text #26262B, 1px border #F1ECE3. On hover and keyboard focus: background #26262B, text #F1ECE3, border #26262B.
- "dark": background #26262B (SOLID and opaque), text #F1ECE3, 1px border #26262B. On hover and keyboard focus: background #F1ECE3, text #26262B, border #F1ECE3.
Both clearly visible without hover.
HOVER AND MOTION SPEED TOKENS:
--dur-hover: 350ms with cubic-bezier(0.4, 0, 0.2, 1). Every hover or focus change (buttons, links, nav tabs, chips, dropdown rows, cards) transitions background-color, color, border-color, opacity and transform with that token. No hover state may change instantly. Expanding cards and photo galleries use --dur-expand. Do not use "transition: all".
--dur-text: 0.9s, --dur-image-reveal: 1.4s, --dur-expand: 1.0s, --dur-section: 1.0s. Easing cubic-bezier(0.22, 1, 0.36, 1) for reveals and cubic-bezier(0.65, 0, 0.35, 1) for expansions. Scroll-driven image growth and hero scale scrubbed with smoothing (stiffness 60, damping 20) or ScrollTrigger scrub: 1.2. Lenis lerp set to 0.08.
TEXT LEGIBILITY (strict): every text must meet 4.5:1 contrast against what is directly behind it (3:1 only for text 24 px or larger). Light text on dark or purple backgrounds is porcelain; dark text on light backgrounds is charcoal; text on heather purple is #1A1A1E. Text over a photo: apply a uniform dimming filter to the photo (brightness 0.82 to 0.88, default 0.82 on hero, never a gradient overlay), add text-shadow 0 1px 18px rgba(20,20,24,0.45) (or 0 1px 14px rgba(20,20,24,0.6) on hero stats), keep text in calm areas of the photo, and put small text (under 18 px) on a flat solid chip if the area behind it is busy. Never place text over busy detail without one of these.
TEXT REVEALS: headings jump up line by line (each line in an overflow-hidden wrapper, translateY 100 to 0, stagger 0.08 s, cubic-bezier(0.22, 1, 0.36, 1)); paragraphs fade and rise 20 px by line, staggered; mono labels fade with a small slide from the left; numbers count up once; buttons and chip rows enter one by one 0.06 s apart. Photos reveal with clip-path from the bottom plus a scale from 1.08 to 1. Play once when about 15 to 20 percent in view, do not replay. Animate only transform, opacity, clip-path. Respect prefers-reduced-motion (show everything instantly, stop auto-scrolling rows).
ONE-SCREEN RULE: on desktop (width at least 1280 px and height at least 700 px) every Home section is exactly 100dvh minus nothing extra, with content sized in vh and vw so nothing is cut off and no empty space is left. Under 1024 px sections grow to fit their content. In pinned scenes the whole content of the current stage is always fully visible.
HERO SIZE AND SECTION STACKING:
- The hero is exactly 100dvh with nothing from the next section visible at the bottom at scroll 0. Remove negative margins, paddings, or transforms that pull section 2 up early. Section 2 starts at exactly 100dvh in normal flow.
- Bottom caption spacing: clamp(14px, 2vw, 26px) anchored with bottom: 0 plus that padding so buttons sit close to bottom edge.
- Wrapper has NO overflow hidden/auto on any ancestor of sticky elements (overflow: clip only if needed).
- Hero: position: sticky; top: 0; height: 100dvh; z-index: 1.
- Section 2: normal-flow section (position: relative, z-index: 10) that slides up over the sticky hero. While the hero is being covered by section 2, the hero underneath scales to 0.95 and dims to 0.7.
- SECTION STACKING APPLIES ONLY TO SECTION 2 SLIDING OVER THE HERO. Every other section (sections 3, 4, 5 and later) scrolls normally in standard document flow: no position sticky, no negative margin-top, no escalating z-index, no scale or dim on the section above, no slide-over. Delete the overlap trick and covered-section effects between sections. Keep their backgrounds, 28px rounded top edges, and content.
- Clean entrance: text reveals and photo clip-path reveals played once when 15 to 20 percent in view.
- Pinned scenes: Sections 4 and 5 use normal GSAP ScrollTrigger pins (pin: true, pinSpacing: true, anticipatePin: 1) starting when top reaches top of viewport, running the scene, and releasing cleanly with normal scroll into the next section below with no overlap and no gap.
- Lenis lerp set to 0.07, wheelMultiplier to 0.85 site-wide.
HERO STAGE & WORDMARK ARCHITECTURE:
- HERO STAGE: Wrap background, wordmark and cutout in ONE "stage" element: position absolute, left 50%, bottom 0, transform translateX(-50%), with the image's own aspect ratio (read naturalWidth and naturalHeight of hero-bg.jpg at runtime and set aspect-ratio from it), sized to COVER the hero: width = max(100vw, 100dvh * aspectRatio), height = width / aspectRatio. Hero (100dvh, overflow clipped) shows stage anchored at bottom center. Set container-type: inline-size on stage.
- Inside stage: background image (z-0), wordmark layer (z-10), cutout image (z-20) all use inset 0, width 100%, height 100%, object-fit fill (stage already has exact aspect ratio) so they stay pixel-aligned at every viewport size. Wordmark is positioned and sized with percentages and cqw units of stage, never vw or vh. Keep filter brightness(0.82) saturate(1.05) on both image layers.
- WORDMARK: Single element "PORCH LIGHT" in Anton, uppercase, one line on desktop/medium, normal word space 0.18em, centered horizontally in stage.
- Color treatment (approved permanent styling across all breakpoints): Warm Sunset gradient from Sunrise Cream (#FFF5E1) at top to Golden Glow (#FFD188) at bottom, with subtle dark shadow (rgba(0, 0, 0, 0.25), 10px blur, 4px vertical offset). Applied consistently to both "PORCH" and "LIGHT" at every size.
- Large desktop (>= 1024px): "PORCH" preserves baseline scale (--wordmark-size: 13.6cqw) and top position (--wordmark-top: 39.2cqh). "LIGHT" is slightly enlarged (~1.13em) and aligned at the top with "PORCH" (both words share the same top alignment; the extra height of "LIGHT" extends downward into the background space behind the house cutout).
- Medium screens (768px to 1023px): Raised vertical position (--wordmark-top: 31cqh) so most of each letter remains clearly readable above the foreground house cutout with only a small portion tucked behind the roofline. Both words maintain uniform standard scale and one-line alignment.
- Small screens (< 768px): Centered two-line stacked layout ("PORCH" over "LIGHT") sized (clamp(3rem, 20vw, 4.8rem)) and positioned (--wordmark-top: 20cqh) cleanly in the sky above the house cutout without clipping or horizontal overflow.
- No lemon square next to wordmark (removed completely).
- LETTER ANIMATION FROM THE VERY BOTTOM:
  - Remove overflow-hidden clip wrappers around each letter. Cutout layer does hiding.
  - Start every letter at very bottom of stage (translateY set so it sits fully below bottom edge of stage, computed with getBoundingClientRect).
  - Animate to translateY 0, staggered 0.06s per letter, duration 1.6s, easing cubic-bezier(0.16, 1, 0.3, 1).
  - Letters only become visible as they rise through sky behind house, trees, rocks and mountains.
  - Opacity 0 until first frame of animation to prevent flash. Start after background, cutout and fonts decoded.
  - Cutout has higher z-index (z-20) than wordmark (z-10).
HEADER & DROPDOWN:
- Logo dot: Write "Light" with dotless i (U+0131, ı) and place 6px lemon circle exactly over it, positioned with position absolute inside an inline-block span around that letter (left 50%, translateX(-50%), using em units so it scales with logo). Fully inside header, never clipped. Lemon #E6FF3D.
- Profile dropdown: anchored under name (right aligned, 8px below header, 240px wide, 12px corners). Fixed colors explicitly set on every element: background #F1ECE3, text and icons #26262B, role tag background #26262B with #F1ECE3 text. Contents: name row with role tag, then "Profile", "Notifications" (with unread count), "Dashboard" or "Moderation", divider, "Sign out", each with icon and visible label. Closes on outside click and Escape.
- Header glass: rgba(38,38,43,0.4) with backdrop-filter blur(18px) over dark sections (even coverage, no dark patches behind logo).
- Header visibility on first scroll: at scroll 0 visible over hero; as soon as user starts scrolling, slides up out of view (translateY -100%, 0.5s) and stays hidden while section 2 slides up over hero. When section 2 fully covers viewport, slides back down (0.5s) in light theme. After that: normal hide on scroll down, show on scroll up. Managed via HIDE_HEADER_DURING_FIRST_STACK = true boolean.
DEV TOOLS:
- Clearly visible dev button in development builds: 44px circle fixed bottom-left (left 16px, bottom 16px), charcoal bg, porcelain "DEV" label in Space Mono 12px, z-index 120. Opens panel with role buttons (Guest, User, Agent, Admin) and "Reset demo data".
IMAGE SLOTS:
- Fallback chain: local file in public/home/<slot>.jpg (or .webp) -> stock URL -> generated local SVG placeholder (porcelain-to-sand tinted tile with thin line drawing of house/room and slot name in small mono text). Never render an empty box.
SCROLL TOOLS & ENGINE (REVISED - NO PINNING):
- Native window scrolling ONLY. Lenis is completely removed.
- CSS: html { font-size: clamp(16px, 0.45vw + 9.5px, 22px); scroll-behavior: auto; scrollbar-gutter: stable; } body { overflow-x: clip; }
- NO PINNING: Remove every ScrollTrigger `pin: true` and pin spacers from sections 4, 5 and 7. Rebuild each as a "sticky scene":
  `<div class="scene" style="height: calc(100dvh + DISTANCE); display: block;"> <div class="scene-inner" style="position: sticky; top: 0; height: 100dvh"> ...content... </div> </div>`
  DISTANCE in CSS: Section 4 = 260dvh, Section 5 = 650dvh, Section 7 = 280dvh.
- Drive each timeline with ScrollTrigger on the .scene wrapper only: trigger: the wrapper, start "top top", end "bottom bottom", scrub 1.5, NO pin.
- No ancestor of .scene-inner may have overflow other than visible or clip. Sticky elements must not be inside flex items with align-self stretch problems; .scene wrapper has display block.
- Create all triggers in one place (single useLayoutEffect in Home page inside gsap.context), in document order, then call ScrollTrigger.sort() and debounced ScrollTrigger.refresh() after fonts and images load and resize. Kill everything on unmount.

SMALL AND TOUCH SCREENS (NO SCROLL ANIMATION OR HEAVY EFFECTS):
- Desktop query: (min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine).
- Create useDesktop hook (matchMedia, updates on change) and use gsap.matchMedia so scroll scenes exist ONLY when matched.
- Non-desktop / touch / short screen / reduced motion: .scene has height auto, .scene-inner is not sticky and has height auto, no scrub, no timelines, no parallax, no hover-only effects (use tap), hero does not stay sticky and section 2 does not slide over it (normal flow), and the only animation is a short fade-up reveal (opacity and translateY 16 px, 0.6 s, once).
- Simple layouts:
  - Hero: wordmark on two lines, captions stacked, buttons full width.
  - Section 2: auto-scrolling rows slower (70s), 3-photo gallery becomes row of equal photos 40vw high where tapping one expands it.
  - Section 3: single column of 4 cards (~38vh each); tapping a card opens its details inline (accordion), only one open at a time.
  - Section 4: Buy and Rent panels stacked, each showing steps WITH descriptions always visible, no hover; photo row shows only exterior photo at 16:9 (hide map and floor plan graphics); no scene.
  - Section 5: left text block first, then 5 cards stacked vertically with fade-up each, no pin, no stack effect.
  - Section 6: tiles stacked (rating and stat side by side on tablet, single col on phone), photo tile hidden on phone; carousel stays with cards 80vw wide.
  - Section 7: NO scroll animation and no stepped offsets; 3 cards stacked in 1 col (2 cols on tablet) with fade-up each.
  - Section 8: text first, photo (height 50vh).
  - Footer: restructured layout.
  - Non-desktop sections use min-height (not height), nothing clipped, no horizontal scroll at 360, 390, 768 and 1023 px.

FLUID TEXT ON EVERY SCREEN:
- html { font-size: clamp(16px, 0.45vw + 9.5px, 22px); }
- Rem / clamp scaling across sections 1-8 and footer.
- Content max-width 1680px, centered, side padding clamp(20px, 5vw, 96px).

SECTION 4 BACKGROUND:
- Deep purple #5E4F7A background, data-header-theme dark.
- Heading, label, caption text porcelain.
- Buy panel stays charcoal with porcelain text.
- Rent panel stays porcelain with charcoal text (border: none).
- Step lines and numerals: porcelain on Buy panel, charcoal on Rent panel.
- Map and floor plan graphics become porcelain tiles with charcoal line art.
- Caption chip over expanded photo stays charcoal with porcelain text. Contrast >= 4.5:1.

FOOTER (RESTRUCTURED):
- Flex column, min-height 100dvh on desktop:
  (a) top block (brand & newsletter, links, contact) with padding-top clamp(72px, 10vh, 120px).
  (b) giant wordmark below with margin-block: auto (fully visible, no crop, no overflow clip, ~96% width, ~16.5vw, 2 lines under 768px, #34343B to #2C2C33 gradient).
  (c) copyright row pinned to very bottom with >= 24px gap and 24px bottom padding.
  (d) Non-desktop: 2-column grid, brand + newsletter full width on top, input and button stack full width, wordmark 2 lines.
- Email in Manrope: hello@porchlight.in.
- Scroll-to-top button bottom-right, doesn't overlap copyright.

HEADER MENU ON SMALL SCREENS:
- Close button with X icon (48px touch target, Space Mono "Close") in top-right corner.
- Toggle itself changes to "Close" with X while menu open.
- Close on Escape, link tap, route change, viewport resize past desktop.
- Lock body scroll while open. Focus trap and return focus to toggle.
- Solid charcoal background, porcelain text, staggered link reveal on open, quick fade on close.
- Header stays above menu content (z-index).

CARD SIZING AND FLEX/GRID CONSTRAINTS:
- Cards in a clipped container must fit inside it at every state; images inside cards flex to fit (flex 1 1 0, min-height 0), never keep a fixed height.
- Every flex or grid child gets min-width: 0 and max-width: 100%.

PRELOADER LIFECYCLE & IN-APP NAVIGATION:
- Initial Load vs. In-App Navigation Distinction:
  - The full-screen preloader/intro plays on a full browser reload (F5 / window reload) and on the first direct visit to the site through a link (`/`).
  - When the user navigates to Home by clicking the navbar while the site is already running in-app (e.g. returning from `/buy`, `/rent`, or clicking the logo/Home link), the preloader is skipped.
  - Lifecycle state is maintained via an in-memory manager (`src/lib/preloaderState.js`). It is not tied solely to component unmount/remount, preventing accidental re-execution on standard SPA route transitions.
  - When navigating to Home via the navbar:
    - The page starts at the top (`window.scrollTo(0, 0)`).
    - Page content is immediately revealed (`pageRevealed: true`).
    - Standard section reveal effects, wordmark rising animations, and counter effects play normally (`heroTriggered: true`).
  - Preloader styling, video/gif/fallback asset checks, timing (3s minimum, 7s maximum), slide-up animation, and reduced-motion handling are preserved completely for direct first visits and browser reloads.
- PRELOADER EXIT (DIRECT INTRO LAYER SLIDE-UP):
  - Preloader Exit: The active intro video layer itself slides directly upward (`translateY: 0%` to `-102%`, 0.9s duration, easing `[0.76, 0, 0.24, 1]`) to smoothly reveal the Home page underneath without any intermediate content fade-out, white flash, visible seam, or pause.
  - The intro plays on full browser reload and first direct landing, and skips on in-app navbar navigation.
  - The Home page remains covered underneath until the intro begins its slide-up, ensuring no early flash or layout pop.
- INTRO HEADER VISIBILITY, STABLE BACKGROUND & SMOOTH NAVBAR SWITCHING:
  - Header Frame-0 Initial State: The shared navigation header `<Header />` remains mounted to preserve Framer Motion layout trees and tab state. When `isHome && shouldRunHomePreloader()`, state initializes `hidden = true` on frame 0, rendering the header directly at `-translate-y-full pointer-events-none`. Because it is off-screen on frame 0, it never flashes and never slides away.
  - Strict Slide-Completion Synchronization: The header remains completely hidden at `-translate-y-full` for the entire duration that the intro is visible or moving. `onSlideStart` only reveals the Home page underneath (`pageRevealed: true`, `heroTriggered: true`); it does NOT signal completion or alter intro active state. Only when Framer Motion's `onAnimationComplete` fires after the 0.9s slide-up finishes completely does `setHomeIntroActive(false)` broadcast `porchlight-intro-active: { active: false }`, revealing the header smoothly with `duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`.
  - Robust Error Prevention: `setHomeIntroActive` is explicitly imported in `HomePage.jsx`, preventing `ReferenceError` crashes into `ErrorBoundary` when the preloader unmounts or when returning via navbar.
  - Impossible to Strand Scroll Locking: Capture-phase wheel/touch/key listeners and `overflow: hidden` are attached strictly when `<Preloader>` mounts and unconditionally cleared in its unmount cleanup and on `onAnimationComplete`. On unmount, `<HomePage>` proactively restores `document.body` and `document.documentElement` styles and clears `isHomeIntroActive`.
  - Non-Premature Safety Watchdogs: Multi-tiered safety timers (9.5s in `preloaderState.js` and `Header.jsx`) guarantee that even in unexpected media stall or interruption events, intro locks are released, document overflow is cleared, and the header is revealed, while being calibrated safely beyond the 7s max wait + 0.9s animation so fallback timers can never reveal the header prematurely. Respects `prefers-reduced-motion`.




