/**
 * Analytics Controller for Porch Light Server
 * Tracks views, 360 tour opens, and serves agent sales intelligence datasets.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');
const { AnalyticsEvent } = require('../models/Operational');
const { computeInstallmentStatus } = require('../utils/scheduleGenerator');

/**
 * Record Property View Telemetry
 * POST /api/analytics/views
 */
async function recordView(req, res, next) {
  try {
    const { propertyId } = req.body;
    const userId = req.user?.id || req.body.userId || 'guest';
    const userRole = req.user?.role;

    if (!propertyId) {
      return res.status(400).json({ success: false, error: { message: 'Property ID required.' } });
    }

    const prop = await db.properties.findById(propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    // Exclude owner agent previews and admin inspections from view metrics
    const userDoc = req.user?.id ? await db.users.findById(req.user.id) : null;
    const userIds = [userId, userDoc?.customId, String(userDoc?._id)].filter(Boolean);
    const isOwner = userIds.includes(prop.agentId);

    if (isOwner || userRole === ROLES.ADMIN) {
      return res.json({ success: true, recorded: false, reason: 'Privileged preview excluded.' });
    }

    const recorded = await db.analytics.recordEvent({
      propertyId: prop.id || prop.customId,
      agentId: prop.agentId,
      userId,
      type: 'view',
    });

    if (recorded) {
      // Increment views count on property
      await db.properties.updateById(prop.id || prop.customId, { views: (prop.views || 0) + 1 });
    }

    res.json({ success: true, recorded: Boolean(recorded) });
  } catch (err) {
    next(err);
  }
}

/**
 * Record 360 Tour Open Event
 * POST /api/analytics/tour-opens
 */
async function recordTourOpen(req, res, next) {
  try {
    const { propertyId } = req.body;
    const userId = req.user?.id || req.body.userId || 'guest';
    const userRole = req.user?.role;

    if (!propertyId) {
      return res.status(400).json({ success: false, error: { message: 'Property ID required.' } });
    }

    const prop = await db.properties.findById(propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    const userDoc = req.user?.id ? await db.users.findById(req.user.id) : null;
    const userIds = [userId, userDoc?.customId, String(userDoc?._id)].filter(Boolean);
    const isOwner = userIds.includes(prop.agentId);

    if (isOwner || userRole === ROLES.ADMIN) {
      return res.json({ success: true, recorded: false });
    }

    const recorded = await db.analytics.recordEvent({
      propertyId: prop.id || prop.customId,
      agentId: prop.agentId,
      userId,
      type: 'tour_open',
    });

    res.json({ success: true, recorded: Boolean(recorded) });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Comprehensive Agent Analytics Dataset
 * GET /api/analytics/agent
 */
async function getAgentAnalytics(req, res, next) {
  try {
    const targetAgentId = req.user.role === ROLES.ADMIN && req.query.agentId ? req.query.agentId : req.user.id;
    const period = req.query.period === '7d' || req.query.period === '90d' ? req.query.period : '30d';

    const agentUser = await db.users.findById(targetAgentId);
    if (!agentUser) {
      return res.status(404).json({ success: false, error: { message: 'Agent account not found.' } });
    }

    // Pending agent check
    if (agentUser.isVerified === false && req.user.role !== ROLES.ADMIN) {
      return res.json({
        success: true,
        data: {
          isVerified: false,
          verificationStatus: 'pending',
          message: 'Your agent account is currently pending administrative verification. Analytics will activate once your agency credentials and RERA license are approved.',
        },
      });
    }

    const agentIds = [targetAgentId, agentUser.customId, String(agentUser._id)].filter(Boolean);

    // Compute period dates
    const now = new Date();
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevCutoff = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    // 1. Properties
    const allProperties = await db.properties.find({ agentId: { $in: agentIds } });
    const isDemoData = allProperties.some((p) => p.isDevSeed || String(p.customId || '').startsWith('prop_') || String(p.customId || '').startsWith('prop-'));

    const propIds = allProperties.map((p) => p.id || p.customId || String(p._id));

    // 2. Views (Lifetime unique per user-property pair)
    const allViews = await AnalyticsEvent.find({ propertyId: { $in: propIds }, type: 'view' });
    const currentPeriodViews = allViews.filter((v) => new Date(v.timestamp || v.createdAt) >= cutoff);
    const prevPeriodViews = allViews.filter((v) => {
      const t = new Date(v.timestamp || v.createdAt);
      return t >= prevCutoff && t < cutoff;
    });

    // 3. Inquiries
    const allInquiries = await db.inquiries.find({ agentId: { $in: agentIds } });
    const currentPeriodInquiries = allInquiries.filter((i) => new Date(i.createdAt) >= cutoff);
    const prevPeriodInquiries = allInquiries.filter((i) => {
      const t = new Date(i.createdAt);
      return t >= prevCutoff && t < cutoff;
    });

    // 4. Bookings / Visits
    const allBookings = await db.bookings.find({ agentId: { $in: agentIds } });
    const currentPeriodBookings = allBookings.filter((b) => {
      const t = new Date(b.createdAt);
      return (b.status === 'confirmed' || b.status === 'completed') && t >= cutoff;
    });
    const prevPeriodBookings = allBookings.filter((b) => {
      const t = new Date(b.createdAt);
      return (b.status === 'confirmed' || b.status === 'completed') && t >= prevCutoff && t < cutoff;
    });

    // 5. Payments & Transaction lifecycle
    const allPayments = await db.payments.find({ agentId: { $in: agentIds } });
    const completedPayments = allPayments.filter((p) => p.status === 'completed');

    // Rentals in period & lifetime
    const currentRentalPayments = completedPayments.filter((p) => p.type === 'rent_deposit' && new Date(p.createdAt || p.paidAt) >= cutoff);
    const prevRentalPayments = completedPayments.filter((p) => {
      const t = new Date(p.createdAt || p.paidAt);
      return p.type === 'rent_deposit' && t >= prevCutoff && t < cutoff;
    });
    const rentedInPeriodProps = new Set(currentRentalPayments.map((p) => p.propertyId));
    const prevRentedProps = new Set(prevRentalPayments.map((p) => p.propertyId));
    const lifetimeRentedCount = allProperties.filter((p) => p.isLeased || p.status === 'rented').length;

    // Sales in period & lifetime
    const currentSalePayments = completedPayments.filter((p) => {
      const isSale = p.type === 'full_purchase' || p.type === 'token_amount' || p.type === 'emi_down_payment' || p.type === 'full_payment';
      return isSale && new Date(p.createdAt || p.paidAt) >= cutoff;
    });
    const prevSalePayments = completedPayments.filter((p) => {
      const isSale = p.type === 'full_purchase' || p.type === 'token_amount' || p.type === 'emi_down_payment' || p.type === 'full_payment';
      const t = new Date(p.createdAt || p.paidAt);
      return isSale && t >= prevCutoff && t < cutoff;
    });
    const soldInPeriodProps = new Set(currentSalePayments.map((p) => p.propertyId));
    const prevSoldProps = new Set(prevSalePayments.map((p) => p.propertyId));
    const lifetimeSoldCount = allProperties.filter((p) => p.isSold || p.status === 'sold').length;

    // 6. Property Performance Breakdown
    const propertyPerformance = allProperties.map((p) => {
      const pId = p.id || p.customId || String(p._id);
      const pViews = currentPeriodViews.filter((v) => v.propertyId === pId || v.propertyId === p.id || v.propertyId === p.customId).length;
      const pInqs = currentPeriodInquiries.filter((i) => i.propertyId === pId || i.propertyId === p.id || i.propertyId === p.customId).length;
      const pVisits = currentPeriodBookings.filter((b) => b.propertyId === pId || b.propertyId === p.id || b.propertyId === p.customId).length;
      const conversion = pViews > 0 ? Math.round((pInqs / pViews) * 100) : 0;

      return {
        id: pId,
        title: p.title,
        city: p.city || 'Bengaluru',
        locality: p.locality || '',
        image: p.coverImage || (p.images && p.images[0]) || '',
        price: p.price || 0,
        listingType: p.listingType || 'sale',
        status: p.status || 'approved',
        isSold: Boolean(p.isSold || p.status === 'sold'),
        isLeased: Boolean(p.isLeased || p.status === 'rented'),
        views: pViews,
        inquiries: pInqs,
        visits: pVisits,
        conversion,
      };
    });

    // 7. Deterministic Insight Generation
    let insight = 'Activity is steady this period.';
    const hasEnoughComparison = prevPeriodViews.length > 0 || prevPeriodInquiries.length > 0;

    if (!hasEnoughComparison && currentPeriodViews.length === 0 && currentPeriodInquiries.length === 0) {
      insight = 'Not enough activity to compare yet.';
    } else if (hasEnoughComparison) {
      const inqDelta = currentPeriodInquiries.length - prevPeriodInquiries.length;
      const viewDelta = currentPeriodViews.length - prevPeriodViews.length;

      let parts = [];
      if (prevPeriodInquiries.length > 0) {
        const inqPct = Math.round((inqDelta / prevPeriodInquiries.length) * 100);
        if (inqPct !== 0) {
          parts.push(`Inquiries are ${inqPct > 0 ? `up ${inqPct}%` : `down ${Math.abs(inqPct)}%`} compared with the previous ${days} days.`);
        }
      } else if (currentPeriodInquiries.length > 0) {
        parts.push(`Recorded ${currentPeriodInquiries.length} new ${currentPeriodInquiries.length === 1 ? 'inquiry' : 'inquiries'} this period.`);
      }

      // Check for property with highest views but zero inquiries
      const sortedByViews = [...propertyPerformance].sort((a, b) => b.views - a.views);
      const highViewZeroInq = sortedByViews.find((p) => p.views >= 3 && p.inquiries === 0);

      if (highViewZeroInq) {
        parts.push(`${highViewZeroInq.title} has the most views (${highViewZeroInq.views}) but no inquiries.`);
      } else if (parts.length === 0 && prevPeriodViews.length > 0) {
        const viewPct = Math.round((viewDelta / prevPeriodViews.length) * 100);
        if (viewPct !== 0) {
          parts.push(`Unique listing views are ${viewPct > 0 ? `up ${viewPct}%` : `down ${Math.abs(viewPct)}%`} versus the previous ${days} days.`);
        }
      }

      if (parts.length > 0) {
        insight = parts.join(' ');
      }
    }

    // 8. Ratings Analytics (Full-width, scoped to agent)
    const allRatings = await db.ratings.find({ agentId: { $in: agentIds }, status: 'active' });
    const ratingCount = allRatings.length;
    const ratingSum = allRatings.reduce((acc, r) => acc + (r.rating || 0), 0);
    const averageRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
      distribution[star] = (distribution[star] || 0) + 1;
    });

    let mostCommonRating = null;
    let maxStarCount = 0;
    [5, 4, 3, 2, 1].forEach((s) => {
      if (distribution[s] > maxStarCount) {
        maxStarCount = distribution[s];
        mostCommonRating = s;
      }
    });

    // Rating trend over period
    const currentPeriodRatings = allRatings.filter((r) => new Date(r.createdAt) >= cutoff);
    const prevPeriodRatings = allRatings.filter((r) => {
      const t = new Date(r.createdAt);
      return t >= prevCutoff && t < cutoff;
    });

    let ratingTrend = null;
    let ratingTrendNote = 'Not enough rating activity this period to compare trend.';
    if (currentPeriodRatings.length >= 2 && prevPeriodRatings.length >= 2) {
      const currAvg = currentPeriodRatings.reduce((acc, r) => acc + r.rating, 0) / currentPeriodRatings.length;
      const prevAvg = prevPeriodRatings.reduce((acc, r) => acc + r.rating, 0) / prevPeriodRatings.length;
      const delta = Math.round((currAvg - prevAvg) * 10) / 10;
      ratingTrend = delta;
      ratingTrendNote = delta > 0 ? `Average score improved by +${delta} stars vs previous ${days} days.` : delta < 0 ? `Average score shifted by ${delta} stars vs previous ${days} days.` : 'Average score maintained steady performance.';
    } else if (mostCommonRating) {
      ratingTrendNote = `Most frequent verified client rating: ${mostCommonRating} stars (${distribution[mostCommonRating]} ${distribution[mostCommonRating] === 1 ? 'rating' : 'ratings'}).`;
    }

    // 9. Money & Obligations
    // Recorded amounts associated with this agent's properties
    const rentReceived = completedPayments.filter((p) => p.type === 'rent_deposit').reduce((acc, p) => acc + (p.amount || 0), 0);
    const salePaymentsReceived = completedPayments
      .filter((p) => p.type === 'full_purchase' || p.type === 'token_amount' || p.type === 'emi_down_payment' || p.type === 'full_payment')
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const pendingPayments = allPayments.filter((p) => p.status === 'pending');
    const pendingAmount = pendingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Upcoming obligations from real schedule and property records
    const upcomingRentMonthly = allProperties
      .filter((p) => p.isLeased || p.status === 'rented')
      .reduce((acc, p) => acc + (p.price || 0), 0);

    const activeFinancingPayments = completedPayments.filter((p) => p.financingDetails?.monthlyEmi > 0);
    const upcomingEmiMonthly = activeFinancingPayments.reduce((acc, p) => acc + (p.financingDetails.monthlyEmi || 0), 0);

    // Query active payment schedules for this agent's properties
    const agentSchedules = await db.paymentSchedules.find({ agentId: { $in: agentIds }, status: 'active' });
    const scheduledObligations = [];
    let scheduledUpcomingRentTotal = 0;
    let scheduledUpcomingEmiTotal = 0;
    let scheduledOverdueTotal = 0;
    let scheduledPaidTotal = 0;

    agentSchedules.forEach((sched) => {
      // Find the next actionable unpaid installment
      const nextInst = (sched.installments || []).find((i) => {
        const s = computeInstallmentStatus(i);
        return s !== 'paid';
      });

      // Synchronize running totals across all installments
      (sched.installments || []).forEach((inst) => {
        const s = computeInstallmentStatus(inst);
        if (s === 'paid') {
          scheduledPaidTotal += inst.amount || 0;
        } else if (s === 'overdue') {
          scheduledOverdueTotal += inst.amount || 0;
        } else {
          if (sched.type === 'rent') scheduledUpcomingRentTotal += inst.amount || 0;
          if (sched.type === 'emi') scheduledUpcomingEmiTotal += inst.amount || 0;
        }
      });

      // Group by property and plan: exactly one summary entry per schedule
      if (nextInst) {
        const status = computeInstallmentStatus(nextInst);
        const remainingMonths = sched.totalInstallments - (sched.paidInstallments || 0);

        scheduledObligations.push({
          id: sched.customId,
          scheduleId: sched.customId,
          propertyId: sched.propertyId,
          propertyTitle: sched.propertyTitle,
          propertySnapshot: sched.propertySnapshot,
          type: sched.type,
          recurringAmount: sched.installmentAmount || nextInst.amount,
          amount: nextInst.amount,
          dueDate: nextInst.dueDate,
          installmentNumber: nextInst.installmentNumber,
          totalInstallments: sched.totalInstallments,
          paidInstallments: sched.paidInstallments || 0,
          remainingMonths,
          remainingBalance: sched.remainingBalance,
          interestRate: sched.interestRate,
          downPayment: sched.downPayment,
          financedPrincipal: sched.financedPrincipal,
          startDate: sched.startDate,
          endDate: sched.endDate,
          status,
        });
      }
    });

    scheduledObligations.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      success: true,
      data: {
        isVerified: true,
        period,
        days,
        isDemoData,
        insight,
        summary: {
          views: {
            current: currentPeriodViews.length,
            previous: prevPeriodViews.length,
            delta: currentPeriodViews.length - prevPeriodViews.length,
            hasComparison: prevPeriodViews.length > 0 || currentPeriodViews.length > 0,
            context: `Across ${allProperties.length} total listings`,
          },
          inquiries: {
            current: currentPeriodInquiries.length,
            previous: prevPeriodInquiries.length,
            delta: currentPeriodInquiries.length - prevPeriodInquiries.length,
            hasComparison: prevPeriodInquiries.length > 0 || currentPeriodInquiries.length > 0,
            context: `${currentPeriodInquiries.length} received in ${days} days`,
          },
          rented: {
            current: rentedInPeriodProps.size,
            previous: prevRentedProps.size,
            delta: rentedInPeriodProps.size - prevRentedProps.size,
            hasComparison: prevRentedProps.size > 0 || rentedInPeriodProps.size > 0,
            lifetime: lifetimeRentedCount,
            context: `${lifetimeRentedCount} active ${lifetimeRentedCount === 1 ? 'lease' : 'leases'} lifetime`,
          },
          sold: {
            current: soldInPeriodProps.size,
            previous: prevSoldProps.size,
            delta: soldInPeriodProps.size - prevSoldProps.size,
            hasComparison: prevSoldProps.size > 0 || soldInPeriodProps.size > 0,
            lifetime: lifetimeSoldCount,
            context: `${lifetimeSoldCount} closed ${lifetimeSoldCount === 1 ? 'sale' : 'sales'} lifetime`,
          },
        },
        ratings: {
          averageRating,
          totalRatings: ratingCount,
          distribution,
          mostCommonRating,
          ratingTrend,
          ratingTrendNote,
        },
        financials: {
          rentReceived,
          salePaymentsReceived,
          totalPaymentsRecorded: rentReceived + salePaymentsReceived,
          pendingAmount,
          pendingCount: pendingPayments.length,
          upcomingRentMonthly: scheduledUpcomingRentTotal > 0 ? scheduledUpcomingRentTotal : upcomingRentMonthly,
          upcomingEmiMonthly: scheduledUpcomingEmiTotal > 0 ? scheduledUpcomingEmiTotal : upcomingEmiMonthly,
          scheduledUpcomingRentTotal,
          scheduledUpcomingEmiTotal,
          scheduledOverdueTotal,
          scheduledPaidTotal,
          scheduledObligations: scheduledObligations.slice(0, 10),
          disclaimer: 'Client transaction amounts are logged in Porch Light escrow records. Agent brokerage commissions and payouts are settled externally and are not logged as platform revenue.',
        },
        properties: propertyPerformance,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordView,
  recordTourOpen,
  getAgentAnalytics,
};


