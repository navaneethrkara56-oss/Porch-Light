/**
 * Safe Historical Migration: Backfill canonical payment dates for completed payments.
 * Ensures historical records have authoritative paidAt populated from reliable stored timestamps (createdAt).
 * Never invents dates or uses current time for historical records.
 */

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const Payment = require('../models/Payment');
const PaymentSchedule = require('../models/PaymentSchedule');

async function migrate() {
  console.log('[Migration] Connecting to MongoDB...');
  await connectDB();
  console.log('[Migration] Connected.');

  const payments = await Payment.find({});
  let backfilledPayments = 0;
  let skippedPayments = 0;

  for (const p of payments) {
    if (p.status === 'completed' && !p.paidAt) {
      if (p.createdAt) {
        p.paidAt = p.createdAt;
        await p.save();
        backfilledPayments++;
        console.log(`[Migration] Backfilled payment ${p.customId}: paidAt = ${p.createdAt.toISOString()}`);
      } else {
        skippedPayments++;
        console.warn(`[Migration] Skipped payment ${p.customId}: No trustworthy createdAt found.`);
      }
    } else {
      skippedPayments++;
    }
  }

  // Also verify payment schedules installments have dueAt and paidAt
  const schedules = await PaymentSchedule.find({});
  let backfilledInstallments = 0;

  for (const s of schedules) {
    let modified = false;
    for (const inst of s.installments) {
      if (inst.dueDate && !inst.dueAt) {
        inst.dueAt = inst.dueDate;
        modified = true;
      }
      if (inst.status === 'paid' && !inst.paidAt) {
        if (inst.paymentId) {
          const matchingPayment = await Payment.findOne({ customId: inst.paymentId });
          if (matchingPayment?.paidAt || matchingPayment?.createdAt) {
            inst.paidAt = matchingPayment.paidAt || matchingPayment.createdAt;
            modified = true;
            backfilledInstallments++;
          }
        } else if (s.createdAt) {
          inst.paidAt = s.createdAt;
          modified = true;
          backfilledInstallments++;
        }
      }
    }
    if (modified) {
      await s.save();
    }
  }

  console.log('--------------------------------------------------');
  console.log(`[Migration] Finished.`);
  console.log(`[Migration] Completed payments backfilled: ${backfilledPayments}`);
  console.log(`[Migration] Installments backfilled: ${backfilledInstallments}`);
  console.log(`[Migration] Untouched / already valid: ${skippedPayments}`);
  console.log('--------------------------------------------------');

  await disconnectDB();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migration Error]', err);
  process.exit(1);
});
