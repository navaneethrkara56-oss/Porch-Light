import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { RequireVerifiedAgent } from './guards/RequireVerifiedAgent';
import { GuestOnly } from './guards/GuestOnly';
import { ROLES } from '@/lib/permissions';

// Public pages
import { HomePage } from '@/pages/HomePage';
import { BuyPage } from '@/pages/BuyPage';
import { RentPage } from '@/pages/RentPage';
import { PropertyBrowsePage } from '@/pages/PropertyBrowsePage';
import { PropertyDetailsPage } from '@/pages/PropertyDetailsPage';
import { ComparePage } from '@/pages/ComparePage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';

import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'));
import { AuthLayout } from '@/app/layouts/AuthLayout';

import { CheckoutPage } from '@/pages/CheckoutPage';
import { PaymentSuccessPage } from '@/pages/payment/PaymentSuccessPage';
import { PaymentCancelPage } from '@/pages/payment/PaymentCancelPage';

// User Dashboard Pages
import { UserOverviewPage } from '@/pages/dashboard/user/UserOverviewPage';
import { UserPropertiesPage } from '@/pages/dashboard/user/UserPropertiesPage';
import { UserSavedPage } from '@/pages/dashboard/user/UserSavedPage';
import { UserComparePage } from '@/pages/dashboard/user/UserComparePage';
import { UserVisitsPage } from '@/pages/dashboard/user/UserVisitsPage';
import { UserMessagesPage } from '@/pages/dashboard/user/UserMessagesPage';
import { UserPaymentsPage } from '@/pages/dashboard/user/UserPaymentsPage';
import { UserNotificationsPage } from '@/pages/dashboard/user/UserNotificationsPage';
import { UserHelpPage } from '@/pages/dashboard/user/UserHelpPage';
import { UserProfilePage } from '@/pages/dashboard/user/UserProfilePage';

// Agent Dashboard Pages
import { AgentOverviewPage } from '@/pages/dashboard/agent/AgentOverviewPage';
import { AgentAnalyticsPage } from '@/pages/dashboard/agent/AgentAnalyticsPage';
import { AgentListingsPage } from '@/pages/dashboard/agent/AgentListingsPage';
import { AgentNewListingPage } from '@/pages/dashboard/agent/AgentNewListingPage';
import { AgentVisitsPage } from '@/pages/dashboard/agent/AgentVisitsPage';
import { AgentInquiriesPage } from '@/pages/dashboard/agent/AgentInquiriesPage';
import { AgentTransactionsPage } from '@/pages/dashboard/agent/AgentTransactionsPage';
import { AgentPromotionsPage } from '@/pages/dashboard/agent/AgentPromotionsPage';
import { AgentNotificationsPage } from '@/pages/dashboard/agent/AgentNotificationsPage';
import { AgentProfilePage } from '@/pages/dashboard/agent/AgentProfilePage';
import { AgentSupportPage } from '@/pages/dashboard/agent/AgentSupportPage';
import { AgentPropertyManagePage } from '@/pages/dashboard/agent/AgentPropertyManagePage';

// Admin Dashboard Pages
import { AdminOverviewPage } from '@/pages/dashboard/admin/AdminOverviewPage';
import { AdminUsersPage } from '@/pages/dashboard/admin/AdminUsersPage';
import { AdminApprovalsPage } from '@/pages/dashboard/admin/AdminApprovalsPage';
import { AdminFeaturedPage } from '@/pages/dashboard/admin/AdminFeaturedPage';
import { AdminPromotionsPage } from '@/pages/dashboard/admin/AdminPromotionsPage';
import { AdminTransactionsPage } from '@/pages/dashboard/admin/AdminTransactionsPage';
import { AdminComplaintsPage } from '@/pages/dashboard/admin/AdminComplaintsPage';
import { AdminReportsPage } from '@/pages/dashboard/admin/AdminReportsPage';
import { AdminAnnouncementsPage } from '@/pages/dashboard/admin/AdminAnnouncementsPage';
import { AdminSettingsPage } from '@/pages/dashboard/admin/AdminSettingsPage';

import { useAuth } from '@/features/auth/AuthContext';

function ProfileRedirect() {
  const { role } = useAuth();
  if (role === ROLES.ADMIN) return <Navigate to="/admin/settings" replace />;
  if (role === ROLES.AGENT) return <Navigate to="/agent/profile" replace />;
  return <Navigate to="/dashboard/profile" replace />;
}

function NotificationsRedirect() {
  const { role } = useAuth();
  if (role === ROLES.ADMIN) return <Navigate to="/admin/announcements" replace />;
  if (role === ROLES.AGENT) return <Navigate to="/agent/notifications" replace />;
  return <Navigate to="/dashboard/notifications" replace />;
}

function RedirectToManage() {
  const { id } = useParams();
  return <Navigate to={`/agent/properties/${id}`} replace />;
}

function RedirectToPropertyDetails() {
  const { id } = useParams();
  return <Navigate to={id ? `/property/${id}` : '/buy'} replace />;
}

function SuspenseWrapper({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center font-mono text-xs text-dark-gray/60">
          Loading view...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <PageLayout>
      <SuspenseWrapper>
        <Routes>
          {/* Public Showcase & Browse Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/buy" element={<BuyPage />} />
          <Route path="/rent" element={<RentPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Guest Only Auth Routes with persistent AuthLayout and single guard mount */}
          <Route
            element={
              <GuestOnly>
                <AuthLayout />
              </GuestOnly>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Logged-in only core routes */}
          <Route
            path="/property/:id"
            element={
              <RequireAuth>
                <PropertyDetailsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <RequireAuth>
                <RedirectToPropertyDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/compare"
            element={
              <RequireAuth>
                <ComparePage />
              </RequireAuth>
            }
          />
          <Route
            path="/checkout/:id"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <CheckoutPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/payment/success"
            element={
              <RequireAuth>
                <PaymentSuccessPage />
              </RequireAuth>
            }
          />
          <Route
            path="/payment/cancel"
            element={
              <RequireAuth>
                <PaymentCancelPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfileRedirect />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationsRedirect />
              </RequireAuth>
            }
          />

          {/* User Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <Navigate to="/dashboard/overview" replace />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/overview"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserOverviewPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/properties"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserPropertiesPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/saved"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserSavedPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/compare"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserComparePage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/visits"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserVisitsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserPropertiesPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/payments"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserPaymentsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/documents"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserPaymentsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/expenses"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserPaymentsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/inquiries"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserHelpPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/chat"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserMessagesPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/complaints"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserHelpPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/feedback"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserHelpPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/notifications"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserNotificationsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.USER]}>
                  <UserProfilePage />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Agent Routes */}
          <Route
            path="/agent"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <Navigate to="/agent/overview" replace />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/overview"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentOverviewPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/analytics"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentAnalyticsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/listings"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentListingsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/new-listing"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <RequireVerifiedAgent>
                    <AgentNewListingPage />
                  </RequireVerifiedAgent>
                </RequireRole>
              </RequireAuth>
            }
          />
          {/* Dedicated Central Property Management Route */}
          <Route
            path="/agent/properties/:id"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT, ROLES.ADMIN]}>
                  <AgentPropertyManagePage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="/agent/properties/manage/:id" element={<RedirectToManage />} />
          <Route path="/agent/properties/edit/:id" element={<RedirectToManage />} />
          <Route path="/agent/edit-listing/:id" element={<RedirectToManage />} />
          <Route path="/agent/listings/edit/:id" element={<RedirectToManage />} />
          <Route path="/agent/new-listing/:id" element={<RedirectToManage />} />
          <Route
            path="/agent/visits"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentVisitsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/inquiries"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentInquiriesPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/income"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentAnalyticsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/reviews"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentAnalyticsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/chat"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentInquiriesPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/transactions"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentTransactionsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/promotions"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <RequireVerifiedAgent>
                    <AgentPromotionsPage />
                  </RequireVerifiedAgent>
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/notifications"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentNotificationsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/profile"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentProfilePage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/agent/support"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.AGENT]}>
                  <AgentSupportPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <Navigate to="/admin/overview" replace />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/overview"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminOverviewPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/approvals"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminApprovalsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/agents"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminUsersPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminUsersPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/featured"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminFeaturedPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminPromotionsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminComplaintsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminReportsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminComplaintsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminTransactionsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminAnnouncementsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminOverviewPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={[ROLES.ADMIN]}>
                  <AdminSettingsPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Error & Fallback Routes */}
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SuspenseWrapper>
    </PageLayout>
  );
}
