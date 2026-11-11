import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLES } from '@/lib/permissions';
import { DashboardSearchModal } from './DashboardSearchModal';
import { getNotifications, subscribeToNotificationCount } from '@/services/notifications';
import { getBookings } from '@/services/bookings';
import { getProperties } from '@/services/properties';
import { motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Heart,
  SlidersHorizontal,
  Calendar,
  MessageSquare,
  Receipt,
  Bell,
  HelpCircle,
  User,
  BarChart3,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  Users,
  CheckSquare,
  Star,
  LifeBuoy,
  AlertTriangle,
  Megaphone,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Shield,
  ChevronRight,
} from 'lucide-react';

const USER_NAV = [
  { label: 'Overview', path: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'My Properties', path: '/dashboard/properties', icon: Building2 },
  { label: 'Saved Homes', path: '/dashboard/saved', icon: Heart },
  { label: 'Compare', path: '/dashboard/compare', icon: SlidersHorizontal },
  { label: 'Visits & Bookings', path: '/dashboard/visits', icon: Calendar },
  { label: 'Messages', path: '/dashboard/chat', icon: MessageSquare },
  { label: 'Payments & Activity', path: '/dashboard/payments', icon: Receipt },
  { label: 'Notifications', path: '/dashboard/notifications', icon: Bell },
  { label: 'Help & Support', path: '/dashboard/complaints', icon: HelpCircle },
  { label: 'Profile & Settings', path: '/dashboard/profile', icon: User },
];

const AGENT_NAV = [
  { label: 'Overview', path: '/agent/overview', icon: LayoutDashboard },
  { label: 'Sales Analytics', path: '/agent/analytics', icon: BarChart3 },
  { label: 'My Listings', path: '/agent/listings', icon: Building2 },
  { label: 'Add Property', path: '/agent/new-listing', icon: PlusCircle },
  { label: 'Visit Requests', path: '/agent/visits', icon: Calendar },
  { label: 'Messages & Inquiries', path: '/agent/inquiries', icon: MessageSquare },
  { label: 'Transactions', path: '/agent/transactions', icon: Receipt },
  { label: 'Premium Promotions', path: '/agent/promotions', icon: Sparkles },
  { label: 'Notifications', path: '/agent/notifications', icon: Bell },
  { label: 'Profile & Verification', path: '/agent/profile', icon: ShieldCheck },
  { label: 'Help & Support', path: '/agent/support', icon: HelpCircle },
];

const ADMIN_NAV = [
  { label: 'Platform Overview', path: '/admin/overview', icon: LayoutDashboard },
  { label: 'Users & Agents', path: '/admin/users', icon: Users },
  { label: 'Property Review', path: '/admin/approvals', icon: CheckSquare },
  { label: 'Featured Homes', path: '/admin/featured', icon: Sparkles },
  { label: 'Premium Promotions', path: '/admin/promotions', icon: Star },
  { label: 'Transactions & Revenue', path: '/admin/transactions', icon: Receipt },
  { label: 'Support Requests', path: '/admin/complaints', icon: LifeBuoy },
  { label: 'Reports & System Issues', path: '/admin/reports', icon: AlertTriangle },
  { label: 'Notifications', path: '/admin/announcements', icon: Megaphone },
  { label: 'Profile & Settings', path: '/admin/settings', icon: Settings },
];

const SIDEBAR_SCROLL_STORAGE_KEY = 'pl_sidebar_scroll_positions';

const sidebarScrollMemory = (() => {
  try {
    const raw = sessionStorage.getItem(SIDEBAR_SCROLL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

function recordSidebarScroll(role, scrollTop) {
  sidebarScrollMemory[role] = scrollTop;
  try {
    sessionStorage.setItem(SIDEBAR_SCROLL_STORAGE_KEY, JSON.stringify(sidebarScrollMemory));
  } catch {
    // Ignore storage quota limits
  }
}

function getStoredSidebarScroll(role) {
  return sidebarScrollMemory[role] || 0;
}

export function DashboardLayout({ children, role: propRole }) {
  const { user, role: authRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeRole = propRole || authRole || ROLES.USER;
  const shouldReduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sidebarNavRef = React.useRef(null);

  // Keyboard shortcut listener: keep ⌘K / Ctrl+K working without displaying any badge
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to global header show/hide state to avoid overlap and empty gaps
  const [isHeaderHidden, setIsHeaderHidden] = useState(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      return document.documentElement.dataset.headerHidden === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleHeaderChange = (e) => {
      if (e?.detail && typeof e.detail.hidden === 'boolean') {
        setIsHeaderHidden(e.detail.hidden);
      }
    };

    window.addEventListener('porchlight-header-change', handleHeaderChange);
    return () => window.removeEventListener('porchlight-header-change', handleHeaderChange);
  }, []);

  // Dynamic badge counts from authoritative services
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingVisits, setPendingVisits] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [avatarError, setAvatarError] = useState(false);

  const userAvatar = user?.avatar || user?.profilePhoto || user?.profileImage;

  useEffect(() => {
    setAvatarError(false);
  }, [userAvatar]);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setUnreadNotifications(0);
      setPendingVisits(0);
      setPendingApprovals(0);
      return;
    }

    const fetchCounts = async () => {
      try {
        const notifs = await getNotifications();
        if (isMounted) {
          setUnreadNotifications((notifs || []).filter((n) => !n.read).length);
        }

        if (activeRole === ROLES.AGENT) {
          const bookingsRes = await getBookings({ status: 'pending' });
          if (isMounted) {
            const list = bookingsRes?.data || [];
            setPendingVisits(list.filter((b) => b.status === 'pending').length);
          }
        } else if (activeRole === ROLES.ADMIN) {
          const propsRes = await getProperties({ status: 'pending' });
          if (isMounted) {
            const list = propsRes?.data || [];
            setPendingApprovals(list.length);
          }
        }
      } catch (e) {
        // ignore network error
      }
    };

    fetchCounts();

    const unsubscribe = subscribeToNotificationCount((count) => {
      if (isMounted && typeof count === 'number') {
        setUnreadNotifications(count);
      }
    });

    const handleNotifEvent = (e) => {
      if (typeof e.detail?.unreadCount === 'number') {
        setUnreadNotifications(e.detail.unreadCount);
      }
    };

    window.addEventListener('porch:notifications-updated', handleNotifEvent);
    window.addEventListener('porch:bookings-updated', fetchCounts);
    window.addEventListener('porch:properties-updated', fetchCounts);
    const interval = setInterval(fetchCounts, 60000);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('porch:notifications-updated', handleNotifEvent);
      window.removeEventListener('porch:bookings-updated', fetchCounts);
      window.removeEventListener('porch:properties-updated', fetchCounts);
      clearInterval(interval);
    };
  }, [user?.id, activeRole]);

  // Reset main content scroll to top on dashboard route change,
  // while strictly preserving the sidebar middle navigation scroll position
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    const restore = () => {
      const saved = getStoredSidebarScroll(activeRole);
      if (sidebarNavRef.current && saved > 0) {
        sidebarNavRef.current.scrollTop = saved;
      }
    };

    restore();
    const frameId = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frameId);
  }, [location.pathname, activeRole]);

  const navItems =
    activeRole === ROLES.ADMIN
      ? ADMIN_NAV
      : activeRole === ROLES.AGENT
      ? AGENT_NAV
      : USER_NAV;

  const roleLabel =
    activeRole === ROLES.ADMIN
      ? 'Administrator'
      : activeRole === ROLES.AGENT
      ? user?.isVerified
        ? 'Verified Agent'
        : 'Pending Agent'
      : 'Sanctuary Member';

  const roleBadgeStyle =
    activeRole === ROLES.ADMIN
      ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
      : activeRole === ROLES.AGENT
      ? user?.isVerified
        ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25'
        : 'bg-sand/60 text-charcoal/80 border-charcoal/20'
      : 'bg-charcoal/5 text-charcoal/80 border-charcoal/15';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PL';

  const currentSectionName =
    location.pathname.split('/').pop()?.replace('-', ' ') || 'Overview';

  return (
    <div className="relative min-h-[calc(100vh-72px)] bg-porcelain flex flex-col lg:flex-row">
      {/* Top Mobile Bar for Dashboard Drawer (Sticky below main site header or top-0 if hidden) */}
      <div
        className={`lg:hidden bg-porcelain border-b border-charcoal/15 px-4 py-2.5 flex items-center justify-between sticky ${
          isHeaderHidden ? 'top-0' : 'top-[72px]'
        } z-30 transition-[top] duration-200 shadow-xs`}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-charcoal bg-sand/60 hover:bg-sand border border-charcoal/20 px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px]"
          aria-label="Open dashboard navigation drawer"
        >
          <Menu className="w-4 h-4 text-deep-purple" />
          <span>Dashboard Menu</span>
        </button>

        <div className="flex items-center gap-1.5 font-mono text-xs text-dark-gray/60">
          <span className="uppercase tracking-wider">
            {activeRole === ROLES.ADMIN ? 'Admin' : activeRole === ROLES.AGENT ? 'Agent' : 'Member'}
          </span>
          <span>/</span>
          <span className="text-charcoal font-medium capitalize truncate max-w-[140px]">
            {currentSectionName}
          </span>
        </div>
      </div>

      {/* Sidebar Navigation (Desktop) */}
      <aside
        className={`hidden lg:flex flex-col w-64 shrink-0 bg-porcelain border-r border-charcoal/10 sticky ${
          isHeaderHidden ? 'top-0 h-screen' : 'top-[72px] h-[calc(100vh-72px)]'
        } overflow-hidden transition-[top,height] duration-200`}
      >
        {/* Workspace Brand / Role Tag & Profile Photo (Anchored Top) */}
        <div className="p-5 border-b border-charcoal/10 shrink-0 bg-porcelain">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/60">
              Workspace
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleBadgeStyle}`}
            >
              {roleLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {userAvatar && !avatarError ? (
              <img
                src={userAvatar}
                alt={user?.name || 'User avatar'}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  setAvatarError(true);
                }}
                className="w-10 h-10 rounded-full object-cover border border-charcoal/15 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-deep-purple text-porcelain flex items-center justify-center font-serif text-sm font-semibold shrink-0 shadow-xs">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-serif text-base text-charcoal font-medium truncate">
                {user?.name || 'Porch Light Member'}
              </div>
              <div className="font-mono text-[11px] text-dark-gray/60 truncate">
                {user?.email || 'member@porchlight.in'}
              </div>
            </div>
          </div>
        </div>

        {/* Search Launcher Button (Anchored Top) */}
        <div className="px-4 py-3 shrink-0 border-b border-charcoal/5 bg-porcelain">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-sand/50 hover:bg-sand/80 border border-charcoal/15 text-dark-gray/80 transition-colors group cursor-pointer min-h-[44px]"
            aria-label="Search dashboard"
          >
            <span className="flex items-center gap-2 font-sans text-xs">
              <Search className="w-3.5 h-3.5 text-deep-purple" />
              <span>Search dashboard...</span>
            </span>
          </button>
        </div>

        {/* Navigation Items (Independently Scrollable Middle Region) */}
        <nav
          ref={sidebarNavRef}
          onScroll={(e) => {
            recordSidebarScroll(activeRole, e.currentTarget.scrollTop);
          }}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1 overscroll-contain"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            // Determine badge count
            let badge = null;
            if ((item.path.includes('/notifications') || item.path.includes('/announcements')) && unreadNotifications > 0) {
              badge = unreadNotifications;
            } else if (item.path.includes('/visits') && activeRole === ROLES.AGENT && pendingVisits > 0) {
              badge = pendingVisits;
            } else if (item.path.includes('/approvals') && activeRole === ROLES.ADMIN && pendingApprovals > 0) {
              badge = pendingApprovals;
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/80 hover:bg-sand/60 hover:text-charcoal'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-deep-purple'}`} />
                  <span>{item.label}</span>
                </span>
                {badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive
                        ? 'bg-porcelain text-deep-purple'
                        : 'bg-deep-purple text-porcelain'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Link (Anchored at Bottom) */}
        <div className="p-4 border-t border-charcoal/10 flex items-center justify-between text-xs font-mono text-dark-gray/70 shrink-0 mt-auto bg-porcelain">
          <Link
            to="/"
            className="flex items-center gap-1.5 hover:text-deep-purple transition-colors min-h-[44px] min-w-[44px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Showcase</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 hover:text-rose-700 transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div
          className={`fixed inset-x-0 bottom-0 ${
            isHeaderHidden ? 'top-0' : 'top-[72px]'
          } z-40 lg:hidden flex transition-[top] duration-200`}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel: Header and Search anchored at top, middle nav scrolls independently, Footer anchored at bottom */}
          <div className="relative w-[300px] sm:w-[320px] max-w-[85vw] bg-porcelain h-full shadow-2xl flex flex-col z-10 overflow-hidden border-r border-charcoal/10">
            {/* Drawer Account / Role Header (Anchored Top) */}
            <div className="p-4 border-b border-charcoal/10 flex items-center justify-between shrink-0 bg-porcelain">
              <div className="flex items-center gap-3 min-w-0">
                {userAvatar && !avatarError ? (
                  <img
                    src={userAvatar}
                    alt={user?.name || 'User avatar'}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      setAvatarError(true);
                    }}
                    className="w-10 h-10 rounded-full object-cover border border-charcoal/15 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-deep-purple text-porcelain flex items-center justify-center font-serif text-sm font-semibold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-charcoal/15 bg-sand/40">
                    {roleLabel}
                  </span>
                  <div className="font-serif text-base text-charcoal font-medium mt-0.5 truncate">
                    {user?.name || 'Member'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-dark-gray/70 hover:text-charcoal cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-sand/60"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Drawer Search Launcher (Anchored Top) */}
            <div className="p-3 border-b border-charcoal/10 shrink-0 bg-porcelain">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sand/50 hover:bg-sand/80 border border-charcoal/15 text-dark-gray/80 font-sans text-xs transition-colors min-h-[44px] cursor-pointer"
              >
                <Search className="w-4 h-4 text-deep-purple" />
                <span>Search dashboard...</span>
              </button>
            </div>

            {/* Middle Nav: Independently Scrollable */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                // Determine badge count
                let badge = null;
                if ((item.path.includes('/notifications') || item.path.includes('/announcements')) && unreadNotifications > 0) {
                  badge = unreadNotifications;
                } else if (item.path.includes('/visits') && activeRole === ROLES.AGENT && pendingVisits > 0) {
                  badge = pendingVisits;
                } else if (item.path.includes('/approvals') && activeRole === ROLES.ADMIN && pendingApprovals > 0) {
                  badge = pendingApprovals;
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-mono text-xs uppercase tracking-wider min-h-[44px] transition-colors ${
                      isActive
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/80 hover:bg-sand/60'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-deep-purple'}`} />
                      <span>{item.label}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            isActive
                              ? 'bg-porcelain text-deep-purple'
                              : 'bg-deep-purple text-porcelain'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer (Anchored at Bottom) */}
            <div className="p-4 border-t border-charcoal/10 flex items-center justify-between font-mono text-xs text-dark-gray/70 shrink-0 mt-auto bg-porcelain">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 hover:text-deep-purple min-h-[44px] min-w-[44px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Showcase</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-1.5 hover:text-rose-700 cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (No duplicate header/search/bell toolbar) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <motion.div
          key={location.pathname}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* Role-Scoped Dashboard Search Modal */}
      <DashboardSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

