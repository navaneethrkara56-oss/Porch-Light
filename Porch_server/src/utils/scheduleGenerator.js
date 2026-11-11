/**
 * Payment Schedule Generator & Date Calculator
 * Handles authoritative creation and status computation for EMI and Rent schedules in IST (UTC+5:30).
 */

/**
 * Calculates a due date in IST by adding a month offset and clamping to the maximum days in that month.
 * Returns noon in IST (06:30 UTC) to ensure stable cross-timezone date rendering.
 */
function calculateDueDate(baseDate, monthOffset, desiredDueDay) {
  const d = new Date(baseDate);
  const istTime = d.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istTime);

  let year = istDate.getUTCFullYear();
  let month = istDate.getUTCMonth() + monthOffset;

  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;

  // Last day of month
  const maxDaysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(1, desiredDueDay), maxDaysInMonth);

  return new Date(Date.UTC(year, month, day, 6, 30, 0));
}

/**
 * Gets a YYYY-MM-DD date key in IST
 */
function getISTDateString(date = new Date()) {
  const d = new Date(date);
  const istTime = d.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istTime);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Determines real-time installment status (overdue, due_today, upcoming, or preserves paid/failed)
 */
function computeInstallmentStatus(installment, now = new Date()) {
  if (installment.status === 'paid') return 'paid';

  const todayKey = getISTDateString(now);
  const dueKey = getISTDateString(installment.dueDate);

  if (dueKey < todayKey) return 'overdue';
  if (dueKey === todayKey) return 'due_today';
  return 'upcoming';
}

/**
 * Synchronizes an entire schedule's installment statuses against current server time
 */
function syncScheduleStatuses(schedule, now = new Date()) {
  if (!schedule || !schedule.installments) return schedule;

  let allPaid = true;
  let paidCount = 0;
  let remaining = 0;

  schedule.installments.forEach((inst) => {
    if (inst.status === 'paid') {
      paidCount++;
    } else {
      allPaid = false;
      remaining += inst.amount || 0;
      inst.status = computeInstallmentStatus(inst, now);
    }
  });

  schedule.paidInstallments = paidCount;
  schedule.remainingBalance = remaining;

  if (allPaid && schedule.installments.length > 0) {
    schedule.status = 'completed';
  }

  return schedule;
}

/**
 * Generates an authoritative EMI Schedule from a confirmed checkout payment
 */
function buildEmiSchedule({ payment, property, user, agent }) {
  const financing = payment.financingDetails || {};
  const tenureMonths = Number(financing.tenureMonths) || 240;
  const monthlyEmi = Number(financing.monthlyEmi) || 0;
  const loanAmount = Number(financing.loanAmount) || 0;
  const downPayment = Number(financing.downPayment) || payment.amount || 0;
  const totalRepayment = Number(financing.totalRepayment) || monthlyEmi * tenureMonths;
  const interestRate = Number(financing.interestRate) || 8.5;

  const startDate = payment.paidAt ? new Date(payment.paidAt) : new Date();
  const istTime = startDate.getTime() + 5.5 * 60 * 60 * 1000;
  const dueDay = new Date(istTime).getUTCDate();

  const installments = [];
  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = calculateDueDate(startDate, i, dueDay);
    installments.push({
      installmentNumber: i,
      dueDate,
      dueAt: dueDate,
      amount: monthlyEmi,
      status: computeInstallmentStatus({ dueDate, status: 'upcoming' }),
      paidAt: null,
      paymentId: null,
      receiptNumber: null,
      paymentMethod: null,
      failureReason: null,
      notificationSentAt: null,
    });
  }

  const scheduleId = `SCH-EMI-${payment.customId.replace(/^TX-/, '')}`;
  const endDate = installments[installments.length - 1]?.dueDate || calculateDueDate(startDate, tenureMonths, dueDay);

  return {
    customId: scheduleId,
    type: 'emi',
    propertyId: String(property.id || property.customId || property._id),
    propertyTitle: property.title,
    propertySnapshot: {
      locality: property.locality,
      city: property.city,
      price: property.price,
      listingType: property.listingType,
      image: property.coverImage || (property.images && property.images[0]) || null,
    },
    userId: String(user.customId || user.id || user._id),
    userName: user.name || 'Verified Member',
    agentId: String(agent.customId || agent.id || agent._id),
    agentName: agent.name || 'Representing Agent',
    initialPaymentId: payment.customId,

    totalAmount: totalRepayment,
    downPayment,
    financedPrincipal: loanAmount,
    installmentAmount: monthlyEmi,
    totalInstallments: tenureMonths,
    paidInstallments: 0,
    remainingBalance: totalRepayment,
    interestRate,

    frequency: 'monthly',
    dueDay,
    startDate,
    endDate,
    status: 'active',
    installments,
  };
}

/**
 * Generates an authoritative Rent Schedule from a confirmed checkout payment
 */
function buildRentSchedule({ payment, property, user, agent }) {
  const lease = payment.leaseDetails || {};
  const monthlyRent = Number(lease.monthlyRent) || Number(property.price) || 0;
  const securityDeposit = Number(lease.securityDeposit) || Number(property.deposit) || 0;

  const startDate = lease.startDate ? new Date(lease.startDate) : new Date();
  const endDate = lease.endDate ? new Date(lease.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

  const istTime = startDate.getTime() + 5.5 * 60 * 60 * 1000;
  const dueDay = new Date(istTime).getUTCDate();

  // Calculate number of months between start and end date
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();
  let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  if (totalMonths <= 0) totalMonths = 12;

  const installments = [];

  // Month 1 was paid at checkout (move-in deposit & advance)
  installments.push({
    installmentNumber: 1,
    dueDate: startDate,
    dueAt: startDate,
    amount: monthlyRent,
    status: 'paid',
    paidAt: payment.paidAt || payment.createdAt || new Date(),
    paymentId: payment.customId,
    receiptNumber: payment.receiptNumber,
    paymentMethod: payment.method || 'UPI',
    failureReason: null,
    notificationSentAt: null,
  });

  // Months 2 through totalMonths are recurring rent installments
  for (let i = 2; i <= totalMonths; i++) {
    const dueDate = calculateDueDate(startDate, i - 1, dueDay);
    if (dueDate > endDate) break;

    installments.push({
      installmentNumber: i,
      dueDate,
      dueAt: dueDate,
      amount: monthlyRent,
      status: computeInstallmentStatus({ dueDate, status: 'upcoming' }),
      paidAt: null,
      paymentId: null,
      receiptNumber: null,
      paymentMethod: null,
      failureReason: null,
      notificationSentAt: null,
    });
  }

  const scheduleId = `SCH-RNT-${payment.customId.replace(/^TX-/, '')}`;
  const totalAmount = monthlyRent * installments.length;
  const remainingBalance = totalAmount - monthlyRent;

  return {
    customId: scheduleId,
    type: 'rent',
    propertyId: String(property.id || property.customId || property._id),
    propertyTitle: property.title,
    propertySnapshot: {
      locality: property.locality,
      city: property.city,
      price: property.price,
      listingType: property.listingType,
      image: property.coverImage || (property.images && property.images[0]) || null,
    },
    userId: String(user.customId || user.id || user._id),
    userName: user.name || 'Verified Member',
    agentId: String(agent.customId || agent.id || agent._id),
    agentName: agent.name || 'Representing Agent',
    initialPaymentId: payment.customId,

    totalAmount,
    downPayment: securityDeposit,
    financedPrincipal: 0,
    installmentAmount: monthlyRent,
    totalInstallments: installments.length,
    paidInstallments: 1,
    remainingBalance,
    interestRate: 0,

    frequency: 'monthly',
    dueDay,
    startDate,
    endDate,
    status: 'active',
    installments,
  };
}

module.exports = {
  calculateDueDate,
  getISTDateString,
  computeInstallmentStatus,
  syncScheduleStatuses,
  buildEmiSchedule,
  buildRentSchedule,
};

