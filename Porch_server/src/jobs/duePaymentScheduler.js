/**
 * Due Payment Notification Scheduler
 * Background job that scans active payment schedules and dispatches idempotent
 * due-day notifications to Users and Agents.
 */

const db = require('../db/dataStore');
const stripeService = require('../services/stripe.service');
const logger = require('../utils/logger');
const { getISTDateString, computeInstallmentStatus } = require('../utils/scheduleGenerator');

let intervalId = null;

async function runDuePaymentCheck() {
  if (!db.isMongoReady()) {
    return;
  }

  try {
    const todayKey = getISTDateString(new Date());
    const schedules = await db.paymentSchedules.find({ status: 'active' });

    for (const schedule of schedules) {
      let modified = false;

      for (const inst of schedule.installments) {
        if (inst.status === 'paid') continue;

        const dueKey = getISTDateString(inst.dueDate);
        const isDueOrPast = dueKey <= todayKey;

        // If schedule has active Autopay and valid Stripe payment method, attempt recurring charge
        if (
          isDueOrPast &&
          schedule.autopayEnabled &&
          schedule.stripeCustomerId &&
          schedule.stripePaymentMethodId &&
          inst.status !== 'paid'
        ) {
          const typeLabel = schedule.type === 'emi' ? 'EMI Installment' : 'Monthly Rent';
          const formattedAmount = `₹${inst.amount.toLocaleString('en-IN')}`;

          try {
            const charge = await stripeService.chargeOffSession({
              customerId: schedule.stripeCustomerId,
              paymentMethodId: schedule.stripePaymentMethodId,
              amount: inst.amount,
              description: `Autopay: ${typeLabel} #${inst.installmentNumber} — ${schedule.propertyTitle}`,
              metadata: {
                scheduleId: schedule.customId,
                installmentNumber: String(inst.installmentNumber),
                propertyId: schedule.propertyId,
                userId: schedule.userId,
              },
            });

            if (charge.status === 'succeeded') {
              const randomNum = Math.floor(100000 + Math.random() * 900000);
              const paymentId = `TX-2026-${randomNum}`;
              const receiptNum = `REC-2026-${randomNum}`;

              const paymentRecord = {
                customId: paymentId,
                receiptNumber: receiptNum,
                propertyId: schedule.propertyId,
                propertyTitle: schedule.propertyTitle,
                propertySnapshot: schedule.propertySnapshot,
                userId: schedule.userId,
                userName: schedule.userName,
                agentId: schedule.agentId,
                agentName: schedule.agentName,
                amount: inst.amount,
                type: schedule.type === 'emi' ? 'emi_installment' : 'rent_installment',
                method: `Autopay (${schedule.autopayCardBrand || 'Card'} •••• ${schedule.autopayCardLast4 || '••••'})`,
                cardBrand: schedule.autopayCardBrand,
                cardLast4: schedule.autopayCardLast4,
                scheduleId: schedule.customId,
                installmentNumber: inst.installmentNumber,
                status: 'completed',
                stripePaymentIntentId: charge.id,
                stripeCustomerId: schedule.stripeCustomerId,
                autopayEnabled: true,
                paidAt: new Date(),
              };

              await db.payments.create(paymentRecord);

              inst.status = 'paid';
              inst.paidAt = new Date();
              inst.paymentId = paymentId;
              inst.receiptNumber = receiptNum;
              inst.paymentMethod = paymentRecord.method;
              inst.notificationSentAt = new Date();

              schedule.paidInstallments = (schedule.paidInstallments || 0) + 1;
              schedule.remainingBalance = Math.max(0, (schedule.remainingBalance || 0) - inst.amount);
              if (
                schedule.paidInstallments >= schedule.totalInstallments ||
                schedule.remainingBalance <= 0
              ) {
                schedule.status = 'completed';
              }

              await db.notifications.create({
                customId: `notif_autopay_succ_${paymentId}`,
                userId: schedule.userId,
                title: `Autopay Succeeded: ${typeLabel} #${inst.installmentNumber}`,
                message: `Your scheduled payment of ${formattedAmount} for ${schedule.propertyTitle} was automatically processed. Receipt ${receiptNum} is ready.`,
                type: 'payment',
                link: '/dashboard/payments',
              });

              modified = true;
              continue;
            }
          } catch (autopayErr) {
            logger.warn(
              `Autopay deduction off-session failed for schedule ${schedule.customId}: ${autopayErr.message}`
            );
            // Notify user of required 3DS step-up or card issue
            await db.notifications.create({
              customId: `notif_autopay_fail_${schedule.customId}_${inst.installmentNumber}_${todayKey}`,
              userId: schedule.userId,
              title: `Autopay Notice: ${typeLabel} #${inst.installmentNumber}`,
              message: `Automatic deduction of ${formattedAmount} for ${schedule.propertyTitle} requires cardholder confirmation. Please complete payment manually.`,
              type: 'payment',
              link: `/dashboard/payments?tab=schedules&pay=${schedule.customId}&inst=${inst.installmentNumber}`,
            }).catch(() => {});
          }
        }

        // Dispatch standard notification once per due date
        if (isDueOrPast && !inst.notificationSentAt) {
          const typeLabel = schedule.type === 'emi' ? 'EMI Installment' : 'Monthly Rent';
          const formattedAmount = `₹${inst.amount.toLocaleString('en-IN')}`;

          const usrNotifId = `notif_due_usr_${schedule.customId}_${inst.installmentNumber}_${dueKey}`;
          const agtNotifId = `notif_due_agt_${schedule.customId}_${inst.installmentNumber}_${dueKey}`;

          // User due notification
          try {
            await db.notifications.create({
              customId: usrNotifId,
              userId: schedule.userId,
              title: `${typeLabel} #${inst.installmentNumber} Due Today`,
              message: `Your payment of ${formattedAmount} for ${schedule.propertyTitle} is due. Complete your installment to keep your account up to date.`,
              type: 'payment',
              link: `/dashboard/payments?tab=schedules&pay=${schedule.customId}&inst=${inst.installmentNumber}`,
            });
          } catch (e) {
            // Duplicate key safely caught if already dispatched
          }

          // Agent due notification
          try {
            await db.notifications.create({
              customId: agtNotifId,
              userId: schedule.agentId,
              title: `${typeLabel} Scheduled for ${schedule.propertyTitle}`,
              message: `A scheduled ${typeLabel.toLowerCase()} payment of ${formattedAmount} is due today for your managed residence.`,
              type: 'payment',
              link: `/agent/analytics`,
            });
          } catch (e) {
            // Duplicate key safely caught
          }

          inst.notificationSentAt = new Date();
          inst.status = computeInstallmentStatus(inst);
          modified = true;
        }
      }

      if (modified) {
        await schedule.save().catch(() => {});
      }
    }
  } catch (err) {
    logger.error('Error during due payment check:', err);
  }
}

function startScheduler(intervalMs = 60 * 60 * 1000) {
  if (intervalId) return;

  // Initial check after 3 seconds
  setTimeout(() => {
    runDuePaymentCheck().catch(() => {});
  }, 3000);

  // Periodic interval (every 1 hour)
  intervalId = setInterval(() => {
    runDuePaymentCheck().catch(() => {});
  }, intervalMs);

  logger.info('Due payment notification scheduler started.');
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Due payment notification scheduler stopped.');
  }
}

module.exports = {
  runDuePaymentCheck,
  startScheduler,
  stopScheduler,
};

