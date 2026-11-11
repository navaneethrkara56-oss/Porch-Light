import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthContext';
import { getNotifications, subscribeToNotificationCount } from '@/services/notifications';
import { getAnnouncements } from '@/services/admin';
import { Menu, X, Bell, User, LogOut } from 'lucide-react';
import { isHomeIntroActive, shouldRunHomePreloader } from '@/lib/preloaderState';
import { CANONICAL_CITIES } from '@/constants/cities';

const CITIES = CANONICAL_CITIES;

// Single boolean constant to control hiding header during section 2 slide-up
const HIDE_HEADER_DURING_FIRST_STACK = true;

/**
 * TASK B: HEADER (Targeted Fix)
 *
 * Rules:
 * - At scroll 0: visible over hero with even glass rgba(38,38,43,0.4) + blur(18px)
 * - During first scroll: hides while Section 2 slides over hero, returns once Section 2 covers screen
 * - Subsequent scroll: hide on scroll down, show on scroll up
 * - Profile dropdown: explicitly fixed #F1ECE3 bg, #26262B text/icons, #26262B/#F1ECE3 role tag
 */
export function Header() {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const initialIntroActive = isHome && shouldRunHomePreloader();
  const [introActive, setIntroActive] = useState(() => initialIntroActive);
  const [headerTheme, setHeaderTheme] = useState(() => (isHome ? 'dark' : 'light'));
  const [hidden, setHidden] = useState(() => initialIntroActive);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityIndex, setCityIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState(null);

  const lastScrollY = useRef(0);
  const userMenuRef = useRef(null);

  // Keep header hidden while Home intro is actively playing, reveal smoothly when finished
  useEffect(() => {
    const handleIntroActive = (e) => {
      const active = Boolean(e.detail?.active);
      setIntroActive(active);
      if (active) {
        setHidden(true);
      } else {
        if (isHome && window.scrollY < 15) {
          setHidden(false);
        }
      }
    };

    window.addEventListener('porchlight-intro-active', handleIntroActive);
    return () => {
      window.removeEventListener('porchlight-intro-active', handleIntroActive);
    };
  }, [isHome]);

  // Safety watchdog: ensure header is never stuck hidden indefinitely on Home
  useEffect(() => {
    if (isHome && hidden) {
      const timer = setTimeout(() => {
        if (!isHomeIntroActive()) {
          setHidden(false);
        }
      }, 9500);
      return () => clearTimeout(timer);
    }
  }, [isHome, hidden]);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Broadcast header visibility changes to downstream sticky components
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('porchlight-header-change', { detail: { hidden } })
    );
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.headerHidden = hidden ? 'true' : 'false';
    }
  }, [hidden]);

  // Rolling city ticker
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setCityIndex((prev) => (prev + 1) % CITIES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  // Notifications & Announcements (scoped to authenticated user)
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setUnreadNotifications(0);
      setUrgentAnnouncement(null);
      return;
    }

    const fetchHeaderData = async () => {
      try {
        const notifs = await getNotifications();
        if (isMounted) {
          const unread = (notifs || []).filter((n) => !n.read).length;
          setUnreadNotifications(unread);
        }

        const announcements = await getAnnouncements();
        if (isMounted) {
          const urgent = (announcements || []).find((a) => a.priority === 'urgent');
          setUrgentAnnouncement(urgent || null);
        }
      } catch (e) {
        // quiet fallback
      }
    };

    fetchHeaderData();

    // Subscribe to notification count observable & custom events for instant badge clearing
    const unsubscribe = subscribeToNotificationCount((count) => {
      if (isMounted && typeof count === 'number') {
        setUnreadNotifications(count);
      }
    });

    const handleNotifEvent = (e) => {
      if (e.detail?.unreadCount !== undefined) {
        setUnreadNotifications(e.detail.unreadCount);
      } else {
        fetchHeaderData();
      }
    };

    window.addEventListener('porch:notifications-updated', handleNotifEvent);
    window.addEventListener('porch:counts-updated', fetchHeaderData);
    const interval = setInterval(fetchHeaderData, 60000);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('porch:notifications-updated', handleNotifEvent);
      window.removeEventListener('porch:counts-updated', fetchHeaderData);
      clearInterval(interval);
    };
  }, [user?.id]);

  // Header scroll & visibility logic — RAF-throttled, stable, no jitter
  useEffect(() => {
    let rafId = null;
    // Track whether we already scheduled a frame
    let ticking = false;
    // Track the last scrollY where we made a show/hide decision (not every frame)
    let decisionScrollY = 0;
    // Dead zone: only flip visibility after this much delta since last decision
    const DEAD_ZONE_DOWN = 18;
    const DEAD_ZONE_UP = 12;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(() => {
        ticking = false;
        const currentScrollY = window.scrollY;

        if (isHome) {
          const introSection = document.getElementById('intro-section');
          const introRect = introSection ? introSection.getBoundingClientRect() : null;

          // Deterministic theme detection based on section rects (never blocked by header)
          const themedSections = document.querySelectorAll('[data-header-theme]');
          let activeTheme = 'dark';
          const sampleY = 50;
          for (let i = 0; i < themedSections.length; i++) {
            const r = themedSections[i].getBoundingClientRect();
            if (r.top <= sampleY && r.bottom > sampleY) {
              activeTheme = themedSections[i].getAttribute('data-header-theme') || 'dark';
              break;
            }
          }
          setHeaderTheme(activeTheme);

          if (isHomeIntroActive()) {
            setHidden(true);
            return;
          }

          // Visibility on first scroll vs stacked scroll (with clean directional behavior)
          if (HIDE_HEADER_DURING_FIRST_STACK && introRect) {
            if (currentScrollY < 15) {
              // At very top of hero: visible
              setHidden(false);
              decisionScrollY = currentScrollY;
            } else if (introRect.top > 20 && currentScrollY < (window.innerHeight || 800) - 20) {
              // Section 2 is actively sliding up over hero: hidden
              setHidden(true);
              setUserMenuOpen(false);
              decisionScrollY = currentScrollY;
            } else {
              // Once Section 2 has reached the top and for all subsequent sections:
              // Standard directional hide on scroll down, show on scroll up with dead zone
              const delta = currentScrollY - decisionScrollY;
              if (delta > DEAD_ZONE_DOWN) {
                setHidden(true);
                setUserMenuOpen(false);
                decisionScrollY = currentScrollY;
              } else if (delta < -DEAD_ZONE_UP) {
                setHidden(false);
                decisionScrollY = currentScrollY;
              }
            }
          } else {
            // Standard scroll behavior with dead zone
            if (currentScrollY > 120) {
              const delta = currentScrollY - decisionScrollY;
              if (delta > DEAD_ZONE_DOWN) {
                setHidden(true);
                setUserMenuOpen(false);
                decisionScrollY = currentScrollY;
              } else if (delta < -DEAD_ZONE_UP) {
                setHidden(false);
                decisionScrollY = currentScrollY;
              }
            } else {
              setHidden(false);
              decisionScrollY = currentScrollY;
            }
          }
        } else {
          setHeaderTheme('light');
          if (currentScrollY > 120) {
            const delta = currentScrollY - decisionScrollY;
            if (delta > DEAD_ZONE_DOWN) {
              setHidden(true);
              setUserMenuOpen(false);
              decisionScrollY = currentScrollY;
            } else if (delta < -DEAD_ZONE_UP) {
              setHidden(false);
              decisionScrollY = currentScrollY;
            }
          } else {
            setHidden(false);
            decisionScrollY = currentScrollY;
          }
        }

        lastScrollY.current = currentScrollY;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isHome]);

  const menuToggleRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close menus on click outside & Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          menuToggleRef.current?.focus();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu when viewport grows past desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine)');
    const handleBp = (e) => {
      if (e.matches) {
        setMobileMenuOpen(false);
      }
    };
    mq.addEventListener('change', handleBp);
    return () => mq.removeEventListener('change', handleBp);
  }, []);

  // Close menus on navigation & synchronize theme and visibility without lag or flashes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);

    if (location.pathname === '/') {
      if (window.scrollY < 15) {
        setHeaderTheme('dark');
      }
      if (!shouldRunHomePreloader() && !isHomeIntroActive()) {
        setIntroActive(false);
        if (window.scrollY < 15) {
          setHidden(false);
        }
      }
    } else {
      setHeaderTheme('light');
      setIntroActive(false);
      setHidden(false);
    }
  }, [location.pathname]);

  // Lock scroll during mobile menu & manage focus trap
  useEffect(() => {
    if (mobileMenuOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus first link in mobile menu after animation
      const timer = setTimeout(() => {
        if (mobileMenuRef.current) {
          const focusables = mobileMenuRef.current.querySelectorAll(
            'a, button, input, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) focusables[0].focus();
        }
      }, 100);

      const trapFocus = (e) => {
        if (!mobileMenuRef.current || e.key !== 'Tab') return;
        const focusables = Array.from(
          mobileMenuRef.current.querySelectorAll(
            'a, button, input, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      document.addEventListener('keydown', trapFocus);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = origOverflow;
        document.removeEventListener('keydown', trapFocus);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const getNavTabs = () => {
    const base = [
      { label: 'Home', path: '/' },
      { label: 'Buy', path: '/buy' },
      { label: 'Rent', path: '/rent' },
    ];
    if (role === 'guest') {
      return [
        ...base,
        { label: 'Login', path: '/login' },
        { label: 'Register', path: '/register' },
      ];
    }
    if (role === 'admin') {
      return [...base, { label: 'Dashboard', path: '/admin/overview' }];
    }
    if (role === 'agent') {
      return [...base, { label: 'Dashboard', path: '/agent/overview' }];
    }
    return [...base, { label: 'Dashboard', path: '/dashboard/overview' }];
  };

  const isTabActive = (tab) => {
    if (tab.path === '/') {
      return location.pathname === '/';
    }
    // Match dashboard routes across all three dashboards by shared route structure
    if (tab.label === 'Dashboard' || tab.label === 'Moderation') {
      if (tab.path.startsWith('/admin')) {
        return location.pathname.startsWith('/admin');
      }
      if (tab.path.startsWith('/agent')) {
        return location.pathname.startsWith('/agent');
      }
      if (tab.path.startsWith('/dashboard')) {
        return location.pathname.startsWith('/dashboard');
      }
    }
    return location.pathname.startsWith(tab.path);
  };

  const navTabs = getNavTabs();
  const isDark = headerTheme === 'dark';
  const currentCity = CITIES[cityIndex];

  return (
    <>
      <header
        style={{
          paddingLeft: 'clamp(20px, 5vw, 72px)',
          paddingRight: 'clamp(20px, 5vw, 72px)',
        }}
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between select-none ${
          hidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'
        } ${
          isDark
            ? 'bg-[rgba(38,38,43,0.4)] backdrop-blur-[18px] backdrop-saturate-[1.3] border-b border-porcelain/25 text-porcelain'
            : 'bg-[rgba(241,236,227,0.88)] backdrop-blur-[18px] border-b border-charcoal/10 text-charcoal shadow-sm'
        }`}
      >
        {/* Urgent Announcement Banner */}
        {urgentAnnouncement && (
          <div className="absolute top-0 left-0 right-0 bg-lemon text-charcoal text-[13px] font-mono py-1 px-4 text-center border-b border-charcoal/15 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-deep-purple animate-pulse" />
            <span className="font-bold uppercase tracking-wider">Urgent:</span>
            <span>{urgentAnnouncement.content}</span>
          </div>
        )}

        {/* LEFT: Serif Logo + Rolling City Ticker */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            state={{ fromNavbar: true }}
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-2.5 sm:gap-3 group ${
              isDark ? 'photo-text-shadow' : ''
            }`}
          >
            <img
              src="/brand/logo.png"
              alt=""
              aria-hidden="true"
              className="h-9 sm:h-10 w-auto object-contain flex-shrink-0"
            />
            <span className="flex items-baseline">
              <span className="font-serif text-[28px] sm:text-[32px] tracking-tight">
                Porch L
              </span>
              <span className="relative inline-block font-serif text-[28px] sm:text-[32px] tracking-tight">
                {'\u0131'}
                {/* 6px lemon circle positioned over dotless i scaling with em */}
                <span
                  style={{
                    top: '0.15em',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                  className="absolute w-[6px] h-[6px] rounded-full bg-[#E6FF3D] pointer-events-none"
                />
              </span>
              <span className="font-serif text-[28px] sm:text-[32px] tracking-tight">
                ght
              </span>
            </span>
          </Link>

          {/* Rolling City Ticker: Only visible at >= 1280px */}
          <div className="hidden xl:flex items-center font-mono text-[13px] tracking-wide text-current opacity-90 pl-3 border-l border-current/25">
            <span className="opacity-70 mr-2 whitespace-nowrap">Homes in:</span>
            {reducedMotion ? (
              <span className="font-bold">Across India</span>
            ) : (
              <div
                className="h-[24px] w-[185px] overflow-hidden relative cursor-pointer"
                onClick={() => navigate(`/buy?city=${encodeURIComponent(currentCity)}`)}
                title={`Browse properties in ${currentCity}`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={currentCity}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -24, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center font-bold underline-offset-4 hover:underline"
                  >
                    {currentCity}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Navigation Tabs with Sliding Underline (Centered to header) */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2 h-full">
          <LayoutGroup id="header-nav-tabs">
            {navTabs.map((tab) => {
              const active = isTabActive(tab);

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  state={{ fromNavbar: true }}
                  onClick={() => {
                    if (isTabActive(tab)) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`relative py-2 font-mono text-[14px] uppercase tracking-[0.12em] transition-[color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isDark
                      ? active
                        ? 'text-porcelain font-bold photo-text-shadow'
                        : 'text-porcelain/80 hover:text-porcelain photo-text-shadow'
                      : active
                      ? 'text-deep-purple font-bold'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.div
                      layoutId="header-active-tab"
                      className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                        isDark ? 'bg-porcelain' : 'bg-deep-purple'
                      }`}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </LayoutGroup>
        </nav>

        {/* RIGHT: Notifications + Profile name or 'Sign in' */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Notifications Header Control (immediately left of account name) */}
              <Link
                to="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `Notifications (${unreadNotifications} unread)`
                    : 'Notifications'
                }
                title="Notifications"
                className={`relative p-2 rounded-[12px] transition-[background-color,color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple flex items-center justify-center cursor-pointer ${
                  isDark
                    ? 'text-porcelain hover:bg-white/10 photo-text-shadow'
                    : 'text-charcoal hover:bg-black/5'
                }`}
              >
                <Bell className="w-5 h-5 stroke-[1.75]" />
                {unreadNotifications > 0 && (
                  <span
                    style={{ backgroundColor: '#5E4F7A', color: '#F1ECE3' }}
                    className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs"
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>

              {/* Account Dropdown Container */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className={`font-mono text-[14px] tracking-wide py-2 px-3 rounded-[12px] transition-[background-color,color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer flex items-center gap-2 ${
                    isDark
                      ? 'text-porcelain hover:bg-white/10 photo-text-shadow'
                      : 'text-charcoal hover:bg-black/5'
                  }`}
                >
                  {user.avatar && (
                    <img
                      src={user.avatar}
                      alt=""
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="w-5 h-5 rounded-full object-cover border border-charcoal/20 shrink-0"
                    />
                  )}
                  <span className="font-medium">{user.name}</span>
                </button>

                {/* Simplified Profile Panel (Profile and Sign out actions only) */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        backgroundColor: '#F1ECE3',
                        color: '#26262B',
                      }}
                      className="absolute right-0 top-[calc(100%+8px)] w-[220px] rounded-[12px] shadow-2xl border border-[#26262B]/15 font-mono text-[14px] z-50 overflow-hidden"
                    >
                      {/* Header Row: Informational Name + Role Tag */}
                      <div className="p-4 border-b border-[#26262B]/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {user.avatar && (
                            <img
                              src={user.avatar}
                              alt=""
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                          )}
                          <span className="font-bold truncate text-[14px] text-[#26262B]">
                            {user.name}
                          </span>
                        </div>
                        <span
                          style={{
                            backgroundColor: '#26262B',
                            color: '#F1ECE3',
                          }}
                          className="text-[11px] px-2 py-0.5 rounded-[6px] font-bold uppercase tracking-wider shrink-0"
                        >
                          {role === 'admin' ? 'Admin' : role === 'agent' ? 'Agent' : 'User'}
                        </span>
                      </div>

                      {/* Profile Row */}
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="h-[48px] flex items-center gap-3 px-4 text-[#26262B] hover:bg-[#E7DFD2]/60 transition-[background-color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                      >
                        <User className="w-4 h-4 text-[#26262B] stroke-[1.75]" />
                        <span className="text-[#26262B]">Profile</span>
                      </Link>

                      {/* Divider */}
                      <div className="border-t border-[#26262B]/10 my-0.5" />

                      {/* Sign Out Row */}
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full h-[48px] flex items-center gap-3 px-4 text-left hover:bg-[#E7DFD2]/60 transition-[background-color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-[#B91C1C] cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 stroke-[1.75]" />
                        <span className="font-medium">Sign out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className={`font-mono text-[14px] uppercase tracking-wider py-1.5 px-3 rounded-[12px] transition-[background-color,color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isDark
                  ? 'text-porcelain hover:bg-white/10 photo-text-shadow'
                  : 'text-charcoal hover:bg-black/5'
              }`}
            >
              Sign in
            </Link>
          )}
        </div>

        {/* MOBILE MENU TOGGLE + NOTIFICATIONS FOR SIGNED-IN USERS */}
        <div className="flex md:hidden items-center gap-1.5">
          {user && (
            <Link
              to="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications (${unreadNotifications} unread)`
                  : 'Notifications'
              }
              title="Notifications"
              className={`relative p-2 rounded-[12px] min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple ${
                isDark ? 'text-porcelain hover:bg-white/10' : 'text-charcoal hover:bg-black/5'
              }`}
            >
              <Bell className="w-5 h-5 stroke-[1.75]" />
              {unreadNotifications > 0 && (
                <span
                  style={{ backgroundColor: '#5E4F7A', color: '#F1ECE3' }}
                  className="absolute top-1 right-1 px-1.5 min-w-[16px] h-[16px] text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          <button
            ref={menuToggleRef}
            type="button"
            onClick={() => {
              setMobileMenuOpen((prev) => {
                const next = !prev;
                if (!next) menuToggleRef.current?.focus();
                return next;
              });
            }}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className={`min-w-[48px] min-h-[48px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-[12px] font-mono text-[13px] uppercase tracking-wider transition-colors duration-350 cursor-pointer ${
              mobileMenuOpen
                ? 'bg-charcoal text-porcelain border border-porcelain/30'
                : isDark
                ? 'text-porcelain hover:bg-white/10'
                : 'text-charcoal hover:bg-black/5'
            }`}
          >
            {mobileMenuOpen ? (
              <>
                <X className="w-5 h-5 text-porcelain" />
                <span className="font-mono text-[13px] font-bold text-porcelain">Close</span>
              </>
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* FULL SCREEN MOBILE MENU (Solid Charcoal, Porcelain text, z-40 below Header z-50) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-0 z-40 bg-[#26262B] text-porcelain flex flex-col justify-between p-8 pt-28 pb-10 md:hidden select-none overflow-y-auto"
          >
            <div className="flex flex-col gap-6">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-porcelain/60">
                Navigation
              </span>
              <nav className="flex flex-col gap-4">
                {navTabs.map((tab, idx) => (
                  <motion.div
                    key={tab.path}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + idx * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      to={tab.path}
                      state={{ fromNavbar: true }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        menuToggleRef.current?.focus();
                      }}
                      className="font-serif text-3xl tracking-tight text-porcelain hover:text-sand transition-colors block py-1"
                    >
                      {tab.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>

            <div className="border-t border-porcelain/15 pt-6 flex flex-col gap-3 font-mono text-sm">
              {user ? (
                <>
                  <div className="text-porcelain/70 flex items-center gap-2">
                    {user.avatar && (
                      <img
                        src={user.avatar}
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    )}
                    <span>
                      Signed in as <span className="font-bold text-porcelain">{user.name}</span>
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <Link
                      to="/profile"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        menuToggleRef.current?.focus();
                      }}
                      className="text-porcelain/80 hover:text-porcelain hover:underline"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        menuToggleRef.current?.focus();
                      }}
                      className="text-porcelain/80 hover:text-porcelain hover:underline"
                    >
                      Notifications
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                        menuToggleRef.current?.focus();
                      }}
                      className="text-[#FF8A8A] hover:underline cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    menuToggleRef.current?.focus();
                  }}
                  className="font-bold text-porcelain text-base hover:underline"
                >
                  Sign in →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;
