/**
 * In-memory lifecycle state for the Home preloader / intro.
 *
 * Deterministic Rules:
 * - Plays ONCE per full browser page load or reload (F5 / window reload) if and only if
 *   the document session initially loaded directly at root '/'.
 * - Any client-side SPA navigation (clicking navbar links, logo, tabs, browser back/forward)
 *   returns to Home WITHOUT replaying the preloader.
 * - Pure trigger condition: does not mutate state inside shouldRunHomePreloader(),
 *   preventing React 18 StrictMode double-invocation bugs.
 * - Watchdog timer guarantees scroll locking and header suppression cannot be stranded.
 */

function checkPrefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
}

// Synchronously check if this document session initially loaded at root '/'
const isInitialLandingAtHome =
  typeof window !== 'undefined' && window.location.pathname === '/' && !checkPrefersReducedMotion();

// Tracks whether the preloader has run or was skipped in this browser session
// Initialized to false if starting at '/', true if starting on a subpage (e.g. /buy)
let hasPreloaderRun = !isInitialLandingAtHome;

// Tracks whether the intro is actively playing right now
let isIntroActive = isInitialLandingAtHome;

// Safety watchdog timer
let watchdogTimer = null;

function clearWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

export function isHomeIntroActive() {
  return isIntroActive;
}

/**
 * Pure check to determine if the preloader should run.
 * Does NOT mutate state, preventing React 18 StrictMode double-invocation bugs.
 */
export function shouldRunHomePreloader() {
  if (typeof window === 'undefined') return false;
  if (checkPrefersReducedMotion()) return false;
  if (hasPreloaderRun) return false;
  return window.location.pathname === '/';
}

export function willHomeIntroRun() {
  return shouldRunHomePreloader();
}

/**
 * Called by Preloader on mount or slide-up start to activate intro state
 */
export function setHomeIntroActive(active) {
  isIntroActive = Boolean(active);
  clearWatchdog();

  if (isIntroActive) {
    // Safety watchdog: ensure intro cannot hold locks for more than 9.5 seconds
    // (max wait 7s + 0.9s animation = 7.9s; 9.5s guarantees fallback without cutting off animation)
    watchdogTimer = setTimeout(() => {
      forceUnlockHomeIntro();
    }, 9500);
  } else {
    hasPreloaderRun = true;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('porchlight-intro-active', { detail: { active: isIntroActive } })
    );
  }
}

export function markHomePreloaderRun() {
  hasPreloaderRun = true;
  setHomeIntroActive(false);
}

export function resetHomePreloaderState() {
  hasPreloaderRun = false;
  setHomeIntroActive(false);
}

/**
 * Emergency safety unlock: clears all locks if anything ever strands state
 */
export function forceUnlockHomeIntro() {
  clearWatchdog();
  isIntroActive = false;
  hasPreloaderRun = true;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('porchlight-intro-active', { detail: { active: false } })
    );
  }
}
