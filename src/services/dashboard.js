/**
 * Dashboard Service for Porch Light Frontend
 * Handles cross-dashboard search and role-specific stats via Porch_server.
 */

import api from './apiClient';

export async function searchDashboard({ query = '', role, userId }) {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return { actions: [], pages: [], properties: [], visits: [], transactions: [], messages: [] };
  }

  const res = await api.get('/dashboard/search', { q: cleanQ, role, userId });
  return res.data || { actions: [], pages: [], properties: [], visits: [], transactions: [], messages: [] };
}

export async function getUserDashboardStats() {
  const res = await api.get('/dashboard/user/stats');
  return res.data;
}

export async function getAgentDashboardStats() {
  const res = await api.get('/dashboard/agent/stats');
  return res.data;
}

export async function getAdminDashboardStats() {
  const res = await api.get('/dashboard/admin/stats');
  const d = res.data || {};

  return {
    ...d,
    totalProperties: d.properties?.totalRegistered ?? d.totalProperties ?? 0,
    availableProperties: d.properties?.availableNow ?? d.availableProperties ?? 0,
    activeProperties: d.properties?.availableNow ?? d.activeProperties ?? 0,
    pendingApprovals: d.properties?.pendingModeration ?? d.pendingApprovals ?? 0,
    soldPropertiesCount: d.properties?.sold ?? d.soldPropertiesCount ?? 0,
    leasedPropertiesCount: d.properties?.leased ?? d.leasedPropertiesCount ?? 0,

    registeredAccounts: d.accounts?.total ?? d.registeredAccounts ?? 0,
    userAccountsCount: d.accounts?.users ?? d.userAccountsCount ?? 0,
    agentAccountsCount: d.accounts?.agents ?? d.agentAccountsCount ?? 0,
    totalUsers: d.accounts?.total ?? d.totalUsers ?? 0,

    pendingAgentVerifications: d.accounts?.pendingAgentVerifications ?? d.pendingAgentVerifications ?? 0,
    openComplaints: d.support?.openTicketsCount ?? d.openComplaints ?? 0,
    pendingPromotions: d.promotions?.pendingCount ?? d.pendingPromotions ?? 0,

    activeFeaturedCount: d.featuredShowcase?.occupiedSlots ?? d.activeFeaturedCount ?? 0,
    waitlistFeaturedCount: d.featuredShowcase?.waitlistCount ?? d.waitlistFeaturedCount ?? 0,

    totalTransactions: d.financialLedger?.totalTransactions ?? d.totalTransactions ?? 0,
    totalVolume: d.financialLedger?.totalSimulatedVolume ?? d.totalVolume ?? 0,
    fullPurchaseVolume: d.financialLedger?.fullPurchaseVolume ?? 0,
    emiVolume: d.financialLedger?.emiVolume ?? 0,
    tokenVolume: d.financialLedger?.tokenAdvanceVolume ?? d.tokenVolume ?? 0,
    rentVolume: d.financialLedger?.rentalDepositVolume ?? d.rentVolume ?? 0,
    promoVolume: d.financialLedger?.promotionFeeVolume ?? d.promoVolume ?? 0,

    platformAvgRating: d.reputation?.averageRating ?? d.platformAvgRating ?? null,
    totalVerifiedRatings: d.reputation?.totalRatings ?? d.totalVerifiedRatings ?? 0,
  };
}
