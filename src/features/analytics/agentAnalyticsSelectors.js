/**
 * Agent Analytics Selectors & Pure Calculation Engine
 * Strict deterministic calculations grounded in recorded mockStore events.
 */

export const PERIOD_CONFIGS = {
  '7d': { label: '7 days', days: 7, bucketType: 'daily' },
  '30d': { label: '30 days', days: 30, bucketType: 'weekly' },
  '90d': { label: '90 days', days: 90, bucketType: 'weekly' },
};

/**
 * Format currency in Indian Rupees format (e.g. ₹12,50,000)
 */
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/**
 * Format percentage change safely without NaN or Infinity
 */
export function formatChange(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0) {
    if (curr > 0) return { text: 'New activity', direction: 'up', isNew: true };
    return { text: 'No change', direction: 'neutral', isNew: false };
  }

  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct > 0) {
    return { text: `+${pct}%`, direction: 'up', pct };
  } else if (pct < 0) {
    return { text: `${pct}%`, direction: 'down', pct };
  }
  return { text: '0%', direction: 'neutral', pct: 0 };
}

/**
 * Compute full analytics dataset for an agent
 */
export function computeAgentAnalytics({
  agentId,
  storeState,
  period = '30d',
  filters = {
    listingType: 'all',
    city: 'all',
    propertyType: 'all',
    status: 'all',
  },
  preferences = {
    defaultPeriod: '30d',
    agentEstimateEnabled: false,
    agentEstimateRate: 1.0,
    emailSummaryEnabled: false,
  },
}) {
  if (!storeState || !agentId) {
    return null;
  }

  const properties = storeState.properties || [];
  const bookings = storeState.bookings || [];
  const inquiries = storeState.inquiries || [];
  const chats = storeState.chats || [];
  const payments = storeState.payments || [];
  const propertyViews = storeState.propertyViews || [];
  const tourOpens = storeState.tourOpens || [];
  const reviews = storeState.reviews || [];
  const users = storeState.users || [];

  const currentUser = users.find((u) => u.id === agentId) || storeState.currentUser;

  // 1. Agent portfolio baseline
  const agentProps = properties.filter((p) => p.agentId === agentId);
  const distinctCities = Array.from(new Set(agentProps.map((p) => p.city).filter(Boolean))).sort();
  const distinctTypes = Array.from(new Set(agentProps.map((p) => p.type).filter(Boolean))).sort();

  // 2. Filter properties by drawer criteria
  const filteredProps = agentProps.filter((p) => {
    if (filters.listingType !== 'all' && p.listingType !== filters.listingType) return false;
    if (filters.city !== 'all' && p.city?.toLowerCase() !== filters.city?.toLowerCase()) return false;
    if (filters.propertyType !== 'all' && p.type !== filters.propertyType) return false;
    if (filters.status !== 'all') {
      if (filters.status === 'sold_rented') {
        if (p.status !== 'sold' && p.status !== 'rented') return false;
      } else if (p.status !== filters.status) {
        return false;
      }
    }
    return true;
  });

  const filteredPropIds = new Set(filteredProps.map((p) => p.id));
  const activeFiltersCount = Object.values(filters).filter((v) => v !== 'all').length;

  // 3. Time windows (current vs previous equal-length period)
  // Anchor date 2026-11-03T16:00:00Z to align with seed timeline
  const now = new Date('2026-11-03T16:00:00Z');
  const periodDays = PERIOD_CONFIGS[period]?.days || 30;
  const periodMs = periodDays * 24 * 60 * 60 * 1000;

  const currentPeriodStart = new Date(now.getTime() - periodMs);
  const previousPeriodStart = new Date(now.getTime() - 2 * periodMs);

  const isInCurrentPeriod = (dateInput) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    return d >= currentPeriodStart && d <= now;
  };

  const isInPreviousPeriod = (dateInput) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    return d >= previousPeriodStart && d < currentPeriodStart;
  };

  // 4. Listing Views Metric
  const currentViews = propertyViews.filter(
    (v) => filteredPropIds.has(v.propertyId) && isInCurrentPeriod(v.timestamp)
  );
  const previousViews = propertyViews.filter(
    (v) => filteredPropIds.has(v.propertyId) && isInPreviousPeriod(v.timestamp)
  );

  // 5. Inquiries Metric (Inquiry form submissions + direct Chat threads)
  const currentInquiriesList = inquiries.filter(
    (i) => filteredPropIds.has(i.propertyId) && isInCurrentPeriod(i.createdAt)
  );
  const previousInquiriesList = inquiries.filter(
    (i) => filteredPropIds.has(i.propertyId) && isInPreviousPeriod(i.createdAt)
  );

  const currentChatsList = chats.filter(
    (c) => filteredPropIds.has(c.propertyId) && isInCurrentPeriod(c.messages?.[0]?.timestamp || c.lastMessageAt)
  );
  const previousChatsList = chats.filter(
    (c) => filteredPropIds.has(c.propertyId) && isInPreviousPeriod(c.messages?.[0]?.timestamp || c.lastMessageAt)
  );

  const totalCurrentInquiries = currentInquiriesList.length + currentChatsList.length;
  const totalPreviousInquiries = previousInquiriesList.length + previousChatsList.length;

  const openInquiriesCount = currentInquiriesList.filter((i) => i.status === 'open').length;
  const answeredInquiriesCount = currentInquiriesList.filter((i) => i.status === 'answered').length;

  // Average first reply time calculation
  let totalReplyHours = 0;
  let replyCount = 0;

  currentInquiriesList.forEach((inq) => {
    if (inq.answeredAt && inq.createdAt) {
      const diffHrs = (new Date(inq.answeredAt) - new Date(inq.createdAt)) / (1000 * 60 * 60);
      if (diffHrs >= 0) {
        totalReplyHours += diffHrs;
        replyCount++;
      }
    }
  });

  currentChatsList.forEach((ch) => {
    const msgs = ch.messages || [];
    const firstUserMsg = msgs.find((m) => m.senderId !== agentId);
    const firstAgentMsg = msgs.find((m) => m.senderId === agentId);
    if (firstUserMsg && firstAgentMsg) {
      const diffHrs = (new Date(firstAgentMsg.timestamp) - new Date(firstUserMsg.timestamp)) / (1000 * 60 * 60);
      if (diffHrs >= 0) {
        totalReplyHours += diffHrs;
        replyCount++;
      }
    }
  });

  const avgReplyTimeFormatted = replyCount > 0
    ? (totalReplyHours / replyCount < 1
      ? `${Math.max(5, Math.round((totalReplyHours / replyCount) * 60))} min`
      : `${(totalReplyHours / replyCount).toFixed(1)} hrs`)
    : 'Under 2 hrs';

  // 6. Visits Metric (Bookings for filtered properties)
  const currentVisits = bookings.filter(
    (b) => filteredPropIds.has(b.propertyId) && isInCurrentPeriod(b.createdAt || b.date)
  );
  const previousVisits = bookings.filter(
    (b) => filteredPropIds.has(b.propertyId) && isInPreviousPeriod(b.createdAt || b.date)
  );

  const currentConfirmedVisits = currentVisits.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed'
  );
  const previousConfirmedVisits = previousVisits.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed'
  );

  // Next upcoming visit across portfolio
  const upcomingVisitsList = bookings
    .filter((b) => filteredPropIds.has(b.propertyId) && (b.status === 'confirmed' || b.status === 'pending'))
    .sort((a, b) => new Date(`${a.date}T${(a.timeSlot || '12:00').slice(0, 5)}`) - new Date(`${b.date}T${(b.timeSlot || '12:00').slice(0, 5)}`));
  const nextVisit = upcomingVisitsList[0] || null;

  // 7. Closures Metric (Sold or rented in period)
  const currentPayments = payments.filter(
    (p) => filteredPropIds.has(p.propertyId) && p.type !== 'promotion_fee'
  );

  const currentClosures = filteredProps.filter((p) => {
    if (p.status !== 'sold' && p.status !== 'rented') return false;
    const propPayment = currentPayments.find((pay) => pay.propertyId === p.id && pay.status === 'completed');
    if (propPayment) {
      return isInCurrentPeriod(propPayment.timestamp);
    }
    return isInCurrentPeriod(p.createdAt);
  });

  const previousClosures = filteredProps.filter((p) => {
    if (p.status !== 'sold' && p.status !== 'rented') return false;
    const propPayment = payments.find(
      (pay) => pay.propertyId === p.id && pay.type !== 'promotion_fee' && pay.status === 'completed'
    );
    if (propPayment) {
      return isInPreviousPeriod(propPayment.timestamp);
    }
    return isInPreviousPeriod(p.createdAt);
  });

  const closureConversionRate = totalCurrentInquiries > 0
    ? ((currentClosures.length / totalCurrentInquiries) * 100).toFixed(1)
    : '0.0';

  // 8. Sparklines (8 data points per figure)
  const sparklineSlots = 8;
  const slotDuration = periodMs / sparklineSlots;

  const generateSparkline = (items, dateGetter) => {
    const slots = new Array(sparklineSlots).fill(0);
    items.forEach((item) => {
      const ts = new Date(dateGetter(item)).getTime();
      const offset = ts - currentPeriodStart.getTime();
      const slotIdx = Math.floor(offset / slotDuration);
      if (slotIdx >= 0 && slotIdx < sparklineSlots) {
        slots[slotIdx]++;
      }
    });
    return slots;
  };

  const viewsSparkline = generateSparkline(currentViews, (v) => v.timestamp);
  const inquiriesSparkline = generateSparkline(
    [...currentInquiriesList, ...currentChatsList],
    (i) => i.createdAt || i.messages?.[0]?.timestamp || i.lastMessageAt
  );
  const visitsSparkline = generateSparkline(currentConfirmedVisits, (b) => b.createdAt || b.date);
  const closuresSparkline = generateSparkline(currentClosures, (p) => {
    const pay = currentPayments.find((pay) => pay.propertyId === p.id);
    return pay?.timestamp || p.createdAt;
  });

  // Most viewed property in period
  const propViewsMap = {};
  currentViews.forEach((v) => {
    propViewsMap[v.propertyId] = (propViewsMap[v.propertyId] || 0) + 1;
  });
  let mostViewedPropId = null;
  let maxViewsCount = 0;
  Object.entries(propViewsMap).forEach(([pid, count]) => {
    if (count > maxViewsCount) {
      maxViewsCount = count;
      mostViewedPropId = pid;
    }
  });
  const mostViewedProp = filteredProps.find((p) => p.id === mostViewedPropId);

  // 9. What Needs Attention (Strict Urgency Order, Cap at 5)
  const attentionItems = [];

  // Urgency 1: Unanswered inquiry > 24 hours
  inquiries.forEach((inq) => {
    if (inq.agentId === agentId && inq.status === 'open' && inq.createdAt) {
      const ageHours = (now.getTime() - new Date(inq.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours >= 24) {
        const prop = properties.find((p) => p.id === inq.propertyId);
        attentionItems.push({
          id: `attn-inq-${inq.id}`,
          urgency: 1,
          badge: 'Inquiry waiting',
          badgeColor: 'amber',
          title: `Inquiry from ${inq.userName || 'Prospective client'} waiting ${Math.floor(ageHours)}h without reply`,
          propertyTitle: prop?.title || 'Portfolio listing',
          link: '/agent/inquiries',
          actionText: 'Reply now',
        });
      }
    }
  });

  // Urgency 2: Visit request awaiting reply (status === 'pending')
  bookings.forEach((vst) => {
    if (vst.agentId === agentId && vst.status === 'pending') {
      const prop = properties.find((p) => p.id === vst.propertyId);
      attentionItems.push({
        id: `attn-vst-${vst.id}`,
        urgency: 2,
        badge: 'Visit request',
        badgeColor: 'purple',
        title: `Visit request awaiting reply for ${vst.date} (${vst.timeSlot || 'scheduled slot'})`,
        propertyTitle: prop?.title || 'Portfolio listing',
        link: '/agent/visits',
        actionText: 'Review booking',
      });
    }
  });

  // Urgency 3: Listing with no views in 14 days (status === 'approved')
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  filteredProps.forEach((prop) => {
    if (prop.status === 'approved') {
      const recentViews = propertyViews.filter(
        (v) => v.propertyId === prop.id && new Date(v.timestamp) >= fourteenDaysAgo
      );
      if (recentViews.length === 0) {
        attentionItems.push({
          id: `attn-view-${prop.id}`,
          urgency: 3,
          badge: 'No views (14d)',
          badgeColor: 'sand',
          title: 'Zero views recorded in the last 14 days. Consider refreshing pricing or photos.',
          propertyTitle: prop.title,
          link: `/agent/new-listing?editId=${prop.id}`,
          actionText: 'Edit listing',
        });
      }
    }
  });

  // Urgency 4: Listing awaiting approval or rejected
  agentProps.forEach((prop) => {
    if (prop.status === 'pending' || prop.status === 'rejected') {
      attentionItems.push({
        id: `attn-stat-${prop.id}`,
        urgency: 4,
        badge: prop.status === 'rejected' ? 'Action required' : 'Pending review',
        badgeColor: prop.status === 'rejected' ? 'rose' : 'purple',
        title: prop.status === 'rejected'
          ? `Listing rejected: ${prop.rejectionReason || 'Requires compliance revision'}`
          : 'Submitted listing undergoing RERA and platform compliance review',
        propertyTitle: prop.title,
        link: '/agent/listings',
        actionText: 'View in listings',
      });
    }
  });

  // Urgency 5: Agent verification or profile information incomplete
  if (currentUser && (currentUser.isVerified === false || !currentUser.reraId)) {
    attentionItems.push({
      id: `attn-profile-${currentUser.id}`,
      urgency: 5,
      badge: 'Profile verification',
      badgeColor: 'purple',
      title: !currentUser.reraId
        ? 'RERA license number required to maintain verified agent standing'
        : 'Agency verification pending platform review',
      propertyTitle: 'Agent profile',
      link: '/agent/profile',
      actionText: 'Update profile',
    });
  }

  // Sort by urgency, cap at 5
  attentionItems.sort((a, b) => a.urgency - b.urgency);
  const cappedAttentionItems = attentionItems.slice(0, 5);

  // 10. Conversion Funnel (Views -> Inquiries -> Visits [confirmed/completed] -> Closures)
  const funnelSteps = [
    {
      id: 'views',
      label: 'Listing Views',
      count: currentViews.length,
      subtext: `${currentViews.length} unique visitor opens`,
    },
    {
      id: 'inquiries',
      label: 'Inquiries',
      count: totalCurrentInquiries,
      subtext: `${totalCurrentInquiries} contact threads initiated`,
      rateFromPrev: currentViews.length > 0
        ? ((totalCurrentInquiries / currentViews.length) * 100).toFixed(1)
        : '0.0',
      rateLabel: 'viewers inquired',
    },
    {
      id: 'visits',
      label: 'Visits',
      count: currentConfirmedVisits.length,
      subtext: `${currentConfirmedVisits.length} confirmed or completed tours`,
      rateFromPrev: totalCurrentInquiries > 0
        ? ((currentConfirmedVisits.length / totalCurrentInquiries) * 100).toFixed(1)
        : '0.0',
      rateLabel: 'inquiries scheduled',
    },
    {
      id: 'closures',
      label: 'Closures',
      count: currentClosures.length,
      subtext: `${currentClosures.length} properties acquired or leased`,
      rateFromPrev: currentConfirmedVisits.length > 0
        ? ((currentClosures.length / currentConfirmedVisits.length) * 100).toFixed(1)
        : '0.0',
      rateLabel: 'visits closed',
    },
  ];

  let dropReading = 'Activity is steady across all pipeline stages.';
  if (currentViews.length > 0) {
    const vToIDrop = ((currentViews.length - totalCurrentInquiries) / currentViews.length) * 100;
    const iToVDrop = totalCurrentInquiries > 0
      ? ((totalCurrentInquiries - currentConfirmedVisits.length) / totalCurrentInquiries) * 100
      : 100;
    const vToCDrop = currentConfirmedVisits.length > 0
      ? ((currentConfirmedVisits.length - currentClosures.length) / currentConfirmedVisits.length) * 100
      : 100;

    if (vToIDrop >= iToVDrop && vToIDrop >= vToCDrop) {
      dropReading = `Largest drop-off is between views and inquiries: ${Math.round(vToIDrop)}% of viewers browse without inquiring.`;
    } else if (iToVDrop >= vToCDrop) {
      dropReading = `Largest drop-off is between inquiries and visits: ${Math.round(iToVDrop)}% of prospective clients do not schedule a tour.`;
    } else {
      dropReading = `Largest drop-off is between visits and closures: ${Math.round(vToCDrop)}% of conducted tours did not finalize into contracts.`;
    }
  }

  // 11. Activity Trend Buckets (Daily for 7d, Weekly for 30d/90d)
  const trendBuckets = [];
  const numBuckets = period === '7d' ? 7 : (period === '30d' ? 5 : 12);
  const bucketMs = periodMs / numBuckets;

  for (let b = 0; b < numBuckets; b++) {
    const bStart = new Date(currentPeriodStart.getTime() + b * bucketMs);
    const bEnd = new Date(currentPeriodStart.getTime() + (b + 1) * bucketMs);

    let label = '';
    if (period === '7d') {
      label = bStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    } else if (period === '30d') {
      label = `W${b + 1} (${bStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`;
    } else {
      label = `W${b + 1}`;
    }

    const bInquiries = inquiries.filter(
      (i) => filteredPropIds.has(i.propertyId) && new Date(i.createdAt) >= bStart && new Date(i.createdAt) < bEnd
    ).length + chats.filter(
      (c) => filteredPropIds.has(c.propertyId) &&
        new Date(c.messages?.[0]?.timestamp || c.lastMessageAt) >= bStart &&
        new Date(c.messages?.[0]?.timestamp || c.lastMessageAt) < bEnd
    ).length;

    const bVisits = bookings.filter(
      (v) => filteredPropIds.has(v.propertyId) &&
        (v.status === 'confirmed' || v.status === 'completed') &&
        new Date(v.createdAt || v.date) >= bStart &&
        new Date(v.createdAt || v.date) < bEnd
    ).length;

    trendBuckets.push({
      label,
      inquiries: bInquiries,
      visits: bVisits,
      total: bInquiries + bVisits,
      startDate: bStart.toISOString(),
      endDate: bEnd.toISOString(),
    });
  }

  let peakBucketIndex = -1;
  let maxBucketTotal = 0;
  trendBuckets.forEach((bucket, idx) => {
    if (bucket.total > maxBucketTotal) {
      maxBucketTotal = bucket.total;
      peakBucketIndex = idx;
    }
  });
  if (peakBucketIndex === -1 && trendBuckets.length > 0) {
    peakBucketIndex = trendBuckets.length - 1;
  }

  // 12. Monthly Collected Payments (Last 6 Months: Token vs Rent, Successful Only)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyPaymentBuckets = [];
  let peakPaymentMonthIndex = -1;
  let maxMonthTotal = 0;

  for (let m = 5; m >= 0; m--) {
    const mDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const mMonth = mDate.getMonth();
    const mYear = mDate.getFullYear();
    const mLabel = `${monthNames[mMonth]} ${mYear}`;

    const mPayments = payments.filter((pay) => {
      if (!filteredPropIds.has(pay.propertyId) || pay.type === 'promotion_fee') return false;
      const d = new Date(pay.timestamp);
      return d.getMonth() === mMonth && d.getFullYear() === mYear;
    });

    const successfulTokens = mPayments
      .filter((p) => p.type === 'token_amount' && p.status === 'completed')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const successfulRent = mPayments
      .filter((p) => p.type === 'rent_deposit' && p.status === 'completed')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const pendingAmount = mPayments
      .filter((p) => p.status === 'pending')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const failedAmount = mPayments
      .filter((p) => p.status === 'failed')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const refundedAmount = mPayments
      .filter((p) => p.status === 'refunded')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const totalCollected = successfulTokens + successfulRent;
    if (totalCollected > maxMonthTotal) {
      maxMonthTotal = totalCollected;
      peakPaymentMonthIndex = 5 - m;
    }

    monthlyPaymentBuckets.push({
      month: mLabel,
      tokenAdvances: successfulTokens,
      rentalDeposits: successfulRent,
      totalCollected,
      pendingAmount,
      failedAmount,
      refundedAmount,
      txCount: mPayments.filter((p) => p.status === 'completed').length,
    });
  }

  // 13. Premium Tour Conversion
  // Attribution rule: A unique signed-in user who logged a tour_open on a Premium listing
  // and subsequently scheduled a visit booking for that property within 30 days.
  const premiumPropsWithTours = filteredProps.filter(
    (p) => p.tour360Url && (p.promotions?.some((pr) => pr.status === 'active') || p.premium === true || Number(p.price) >= 30000000)
  );

  const premiumPropIds = new Set(premiumPropsWithTours.map((p) => p.id));
  const relevantTourOpens = tourOpens.filter((t) => premiumPropIds.has(t.propertyId));

  // Count unique viewers
  const uniqueTourViewers = new Set(relevantTourOpens.map((t) => `${t.propertyId}_${t.userId}`));
  const convertedViewers = new Set();

  relevantTourOpens.forEach((t) => {
    const hasAttributedBooking = bookings.some((b) => {
      if (b.propertyId !== t.propertyId || b.userId !== t.userId) return false;
      const tTime = new Date(t.timestamp).getTime();
      const bTime = new Date(b.createdAt || b.date).getTime();
      const diffDays = (bTime - tTime) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 30;
    });

    if (hasAttributedBooking) {
      convertedViewers.add(`${t.propertyId}_${t.userId}`);
    }
  });

  const tourConversionRate = uniqueTourViewers.size > 0
    ? ((convertedViewers.size / uniqueTourViewers.size) * 100).toFixed(1)
    : '0.0';

  // 14. Money: Period Collections, Summaries, Ranked Listings & Transactions
  const periodPayments = payments.filter(
    (p) => filteredPropIds.has(p.propertyId) && p.type !== 'promotion_fee' && isInCurrentPeriod(p.timestamp)
  );

  const successfulPeriodPayments = periodPayments.filter((p) => p.status === 'completed');
  const periodCollectedTotal = successfulPeriodPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const periodTokenAdvancesTotal = successfulPeriodPayments
    .filter((p) => p.type === 'token_amount')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const periodRentalDepositsTotal = successfulPeriodPayments
    .filter((p) => p.type === 'rent_deposit')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const periodPendingPayments = periodPayments.filter((p) => p.status === 'pending');
  const periodFailedPayments = periodPayments.filter((p) => p.status === 'failed');
  const periodRefundedPayments = periodPayments.filter((p) => p.status === 'refunded');

  const periodPendingTotal = periodPendingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const periodFailedTotal = periodFailedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const periodRefundedTotal = periodRefundedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const periodNonCollectedTotal = periodPendingTotal + periodFailedTotal + periodRefundedTotal;

  // Income by listing (successful collected payments only)
  const propIncomeMap = {};
  successfulPeriodPayments.forEach((p) => {
    if (!propIncomeMap[p.propertyId]) {
      propIncomeMap[p.propertyId] = { amount: 0, count: 0 };
    }
    propIncomeMap[p.propertyId].amount += Number(p.amount) || 0;
    propIncomeMap[p.propertyId].count += 1;
  });

  const incomeByListing = Object.entries(propIncomeMap)
    .map(([pid, data]) => {
      const prop = filteredProps.find((p) => p.id === pid);
      return {
        propertyId: pid,
        title: prop?.title || 'Represented Residence',
        listingType: prop?.listingType || 'sale',
        type: prop?.type || 'apartment',
        txCount: data.count,
        amount: data.amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const maxListingIncome = Math.max(...incomeByListing.map((i) => i.amount), 1);

  // All transactions in period with sorting and receipt payload
  const sortedPeriodTransactions = [...periodPayments]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((p) => {
      const prop = filteredProps.find((pr) => pr.id === p.propertyId);
      return {
        id: p.id,
        receiptNumber: p.receiptNumber || `REC-${p.id.slice(-4)}`,
        date: p.timestamp,
        propertyId: p.propertyId,
        propertyTitle: prop?.title || p.propertyTitle || 'Represented Property',
        clientName: p.userName || 'Verified Client',
        userId: p.userId,
        type: p.type === 'token_amount' ? 'Token advance' : 'Rental deposit',
        rawType: p.type,
        amount: Number(p.amount) || 0,
        status: p.status, // 'completed' | 'pending' | 'failed' | 'refunded'
        method: p.method || 'Online Transfer',
      };
    });

  // Optional Agent income estimate
  const estimateRate = Number(preferences.agentEstimateRate) || 1.0;
  const estimateEnabled = Boolean(preferences.agentEstimateEnabled);
  const estimatedEarnings = estimateEnabled
    ? Math.round((periodCollectedTotal * estimateRate) / 100)
    : null;

  // 15. Listing Performance Ranking & Quiet Listings
  const propertyPerformance = filteredProps.map((prop) => {
    const pViews = currentViews.filter((v) => v.propertyId === prop.id).length;
    const pInq = currentInquiriesList.filter((i) => i.propertyId === prop.id).length +
      currentChatsList.filter((c) => c.propertyId === prop.id).length;
    const pVisits = currentConfirmedVisits.filter((b) => b.propertyId === prop.id).length;
    const pClosures = currentClosures.filter((p) => p.id === prop.id).length;
    const conversion = pViews > 0 ? ((pInq / pViews) * 100) : 0;

    // 4-point mini trend for listing detail card
    const miniSlots = 4;
    const miniDuration = periodMs / miniSlots;
    const miniTrend = new Array(miniSlots).fill(0);
    currentViews
      .filter((v) => v.propertyId === prop.id)
      .forEach((v) => {
        const offset = new Date(v.timestamp).getTime() - currentPeriodStart.getTime();
        const sIdx = Math.floor(offset / miniDuration);
        if (sIdx >= 0 && sIdx < miniSlots) miniTrend[sIdx]++;
      });

    // Smart data-driven recommendation based on actual listing attributes
    let suggestion = 'Add more high-resolution interior photos to increase engagement';
    if (!prop.carpetArea && !prop.builtUpArea) {
      suggestion = 'Specify carpet area and floor plan details for serious inquiries';
    } else if (Number(prop.price) > 30000000 && !prop.tour360Url) {
      suggestion = 'Enable a 360° virtual tour to attract out-of-city and NRI buyers';
    } else if (prop.listingType === 'sale' && Number(prop.price) > 40000000) {
      suggestion = 'Review asking price against recent neighborhood registration records';
    } else if (pViews > 10 && pInq === 0) {
      suggestion = 'Highlight architectural features or negotiate terms to convert views into inquiries';
    }

    return {
      id: prop.id,
      title: prop.title,
      listingType: prop.listingType || 'sale',
      city: prop.city || 'Kochi',
      type: prop.type || 'apartment',
      status: prop.status || 'approved',
      price: prop.price,
      coverImage: prop.coverImage || prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      views: pViews,
      inquiries: pInq,
      visits: pVisits,
      closures: pClosures,
      conversion: Number(conversion.toFixed(1)),
      miniTrend,
      suggestion,
    };
  });

  const activeRankedProps = propertyPerformance.filter((p) => p.views > 0 || p.inquiries > 0);
  const quietProps = propertyPerformance.filter((p) => p.views === 0 && p.inquiries === 0);

  // 16. Upcoming Visits (Next 5) & Star-Only Reputation Grounded in Completed Transactions
  const nextFiveVisits = bookings
    .filter((b) => filteredPropIds.has(b.propertyId))
    .sort((a, b) => new Date(`${a.date}T${(a.timeSlot || '10:00').slice(0, 5)}`) - new Date(`${b.date}T${(b.timeSlot || '10:00').slice(0, 5)}`))
    .slice(0, 5)
    .map((b) => {
      const prop = filteredProps.find((p) => p.id === b.propertyId);
      const visitor = users.find((u) => u.id === b.userId);
      return {
        id: b.id,
        date: b.date,
        timeSlot: b.timeSlot || '11:00 AM - 12:00 PM',
        status: b.status, // 'pending' | 'confirmed' | 'completed' | 'declined' | 'cancelled'
        propertyId: b.propertyId,
        propertyTitle: prop?.title || 'Represented Residence',
        visitorName: visitor?.name || b.userName || 'Prospective Buyer',
        visitorPhone: visitor?.phone || '+91 98765 00000',
        notes: b.notes || 'Scheduled walkthrough visit',
      };
    });

  // Calculate star-only reputation strictly from completed transactions
  const agentRatingsList = (storeState.agentRatings || []).filter(
    (r) => r.agentId === agentId && r.status === 'active'
  );
  const completedTxIds = new Set(
    payments.filter((p) => p.status === 'completed').map((p) => p.id)
  );
  const eligibleRatings = agentRatingsList.filter((r) => completedTxIds.has(r.transactionId));

  const ratingCount = eligibleRatings.length;
  let averageRating = null;
  let formattedAverageRating = null;
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (ratingCount > 0) {
    const sum = eligibleRatings.reduce((s, r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
      return s + star;
    }, 0);
    averageRating = parseFloat((sum / ratingCount).toFixed(1));
    formattedAverageRating = averageRating.toFixed(1);
  }

  const responseRate = totalCurrentInquiries > 0
    ? Math.min(100, Math.round(((totalCurrentInquiries - openInquiriesCount) / totalCurrentInquiries) * 100))
    : 95;

  // 17. Deterministic Insight Sentence
  let insightText = 'Activity is steady this period.';
  const inqChange = formatChange(totalCurrentInquiries, totalPreviousInquiries);

  if (totalCurrentInquiries > 0) {
    if (inqChange.isNew) {
      insightText = `Inquiries increased to ${totalCurrentInquiries} this period. `;
    } else if (inqChange.pct > 0) {
      insightText = `Inquiries are up ${inqChange.pct}% on the previous ${periodDays} days. `;
    } else if (inqChange.pct < 0) {
      insightText = `Inquiries are down ${Math.abs(inqChange.pct)}% on the previous ${periodDays} days. `;
    } else {
      insightText = `Inquiries held steady with ${totalCurrentInquiries} contact requests. `;
    }

    if (mostViewedProp && maxViewsCount > 10 && (propViewsMap[mostViewedProp.id] || 0) > 0) {
      const pInqs = currentInquiriesList.filter((i) => i.propertyId === mostViewedProp.id).length;
      if (pInqs === 0) {
        insightText += `${mostViewedProp.title} has the most views (${maxViewsCount}) but no inquiries yet.`;
      } else {
        insightText += `${mostViewedProp.title} leads portfolio engagement.`;
      }
    }
  } else if (currentViews.length > 0) {
    if (mostViewedProp) {
      insightText = `Listing traffic is active across ${filteredProps.length} properties. ${mostViewedProp.title} leads with ${maxViewsCount} views.`;
    } else {
      insightText = 'Listing traffic is active across your portfolio.';
    }
  }

  return {
    period,
    periodDays,
    filters,
    activeFiltersCount,
    distinctCities,
    distinctTypes,
    totalPortfolioCount: agentProps.length,
    filteredPropertiesCount: filteredProps.length,
    insightText,
    preferences: {
      ...preferences,
      estimateRate,
      estimateEnabled,
    },

    // 3. Four Performance Figures
    summaryFigures: {
      views: {
        label: 'Listing views',
        count: currentViews.length,
        change: formatChange(currentViews.length, previousViews.length),
        sparkline: viewsSparkline,
        context: mostViewedProp
          ? `Most viewed: ${mostViewedProp.title}`
          : `Unique visitors across ${filteredProps.length} listings`,
      },
      inquiries: {
        label: 'Inquiries',
        count: totalCurrentInquiries,
        change: formatChange(totalCurrentInquiries, totalPreviousInquiries),
        sparkline: inquiriesSparkline,
        context: `${openInquiriesCount} open · Avg reply: ${avgReplyTimeFormatted}`,
      },
      visits: {
        label: 'Visits',
        count: currentConfirmedVisits.length,
        change: formatChange(currentConfirmedVisits.length, previousConfirmedVisits.length),
        sparkline: visitsSparkline,
        context: nextVisit
          ? `Next: ${nextVisit.date} (${nextVisit.timeSlot || 'slot'})`
          : `${currentConfirmedVisits.length} confirmed or completed`,
      },
      closures: {
        label: 'Closures',
        count: currentClosures.length,
        change: formatChange(currentClosures.length, previousClosures.length),
        sparkline: closuresSparkline,
        context: `${closureConversionRate}% closure rate from inquiries`,
      },
    },

    // 2. What Needs Attention
    attentionItems: cappedAttentionItems,

    // 4. Charts
    charts: {
      funnel: {
        steps: funnelSteps,
        dropReading,
        hasSufficientData: currentViews.length > 0,
      },
      activityTrend: {
        buckets: trendBuckets,
        peakIndex: peakBucketIndex,
        peakBucket: trendBuckets[peakBucketIndex] || null,
        hasSufficientData: trendBuckets.some((b) => b.total > 0),
      },
      monthlyPayments: {
        buckets: monthlyPaymentBuckets,
        peakIndex: peakPaymentMonthIndex,
        peakMonth: monthlyPaymentBuckets[peakPaymentMonthIndex] || null,
        hasSufficientData: monthlyPaymentBuckets.filter((b) => b.totalCollected > 0).length >= 4,
        totalSixMonths: monthlyPaymentBuckets.reduce((s, b) => s + b.totalCollected, 0),
      },
      premiumTourConversion: {
        eligiblePropertiesCount: premiumPropsWithTours.length,
        tourOpensCount: relevantTourOpens.length,
        uniqueViewersCount: uniqueTourViewers.size,
        convertedVisitsCount: convertedViewers.size,
        conversionRate: tourConversionRate,
        hasSufficientData: relevantTourOpens.length >= 4,
        properties: premiumPropsWithTours.map((p) => ({ id: p.id, title: p.title })),
      },
    },

    // 5. Money
    money: {
      collectedTotal: periodCollectedTotal,
      tokenAdvancesTotal: periodTokenAdvancesTotal,
      rentalDepositsTotal: periodRentalDepositsTotal,
      nonCollectedTotal: periodNonCollectedTotal,
      pendingTotal: periodPendingTotal,
      failedTotal: periodFailedTotal,
      refundedTotal: periodRefundedTotal,
      incomeByMonth: monthlyPaymentBuckets,
      incomeByListing,
      maxListingIncome,
      transactions: sortedPeriodTransactions,
      optionalEstimate: {
        enabled: estimateEnabled,
        rate: estimateRate,
        estimatedEarnings,
      },
      payoutDisplay: '₹0 (external)',
    },

    // 6. Upcoming Visits & Star-Only Reputation
    visitsAndReputation: {
      upcomingVisits: nextFiveVisits,
      reputation: {
        averageRating: formattedAverageRating,
        ratingCount,
        hasRatings: ratingCount > 0,
        distribution: ratingDistribution,
        responseRate: `${responseRate}%`,
        ratings: eligibleRatings.slice(0, 5),
      },
    },

    // 7. Listing Performance
    listingPerformance: {
      all: propertyPerformance,
      active: activeRankedProps,
      quiet: quietProps,
    },
  };
}

/**
 * Generate securely escaped CSV string for filtered performance rows & transactions
 */
export function generatePerformanceCSV(performanceRows = [], transactions = [], period = '30d') {
  const escapeCsv = (val) => {
    if (val == null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [
    `"PORTFOLIO PERFORMANCE EXPORT (${period})"`,
    '"Listing ID","Property Title","Listing Type","City","Type","Status","Views","Inquiries","Visits","Closures","Conversion Rate %"',
  ];

  performanceRows.forEach((p) => {
    lines.push([
      escapeCsv(p.id),
      escapeCsv(p.title),
      escapeCsv(p.listingType?.toUpperCase() || 'SALE'),
      escapeCsv(p.city),
      escapeCsv(p.type),
      escapeCsv(p.status),
      p.views,
      p.inquiries,
      p.visits,
      p.closures,
      p.conversion,
    ].join(','));
  });

  if (transactions && transactions.length > 0) {
    lines.push('');
    lines.push(`"TRANSACTIONS LEDGER (${period})"`);
    lines.push('"Date","Transaction ID","Property","Client","Type","Amount (INR)","Status","Method"');
    transactions.forEach((tx) => {
      lines.push([
        escapeCsv(tx.date),
        escapeCsv(tx.id),
        escapeCsv(tx.propertyTitle),
        escapeCsv(tx.clientName),
        escapeCsv(tx.type),
        tx.amount,
        escapeCsv(tx.status),
        escapeCsv(tx.method),
      ].join(','));
    });
  }

  return lines.join('\r\n');
}
