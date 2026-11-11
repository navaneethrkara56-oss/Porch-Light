/**
 * Payments & Lease Lifecycle Controller for Porch Light Server
 * Tracks simulated demo payments and mutual lease workflows.
 */

const db = require('../db/dataStore');
const stripeService = require('../services/stripe.service');
const logger = require('../utils/logger');
const { ROLES } = require('../constants/roles');
const {
  buildEmiSchedule,
  buildRentSchedule,
  syncScheduleStatuses,
  computeInstallmentStatus,
} = require('../utils/scheduleGenerator');

/**
 * Get Payments Ledger (Role Scoped)
 * GET /api/payments
 */
async function getPayments(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { type, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) {
      filter.status = status;
    } else {
      // By default, financial ledgers must only contain completed and refunded payments
      // Pending, failed, or cancelled checkout sessions must never pollute transaction history
      filter.status = { $in: ['completed', 'refunded'] };
    }

    if (userRole === ROLES.USER) {
      filter.userId = userId;
    } else if (userRole === ROLES.AGENT) {
      filter.agentId = userId;
    }

    const payments = await db.payments.find(filter);

    // Normalize and serialize every record with canonical date fields
    const normalized = payments.map((p) => {
      const item = p.toJSON ? p.toJSON() : (p.toObject ? p.toObject() : { ...p });

      // Canonical paidAt: If missing on a completed record, safely use trustworthy createdAt
      if (!item.paidAt && item.status === 'completed' && item.createdAt) {
        item.paidAt = new Date(item.createdAt).toISOString();
      } else if (item.paidAt) {
        item.paidAt = new Date(item.paidAt).toISOString();
      }

      if (item.createdAt) {
        item.createdAt = new Date(item.createdAt).toISOString();
      }
      if (item.updatedAt) {
        item.updatedAt = new Date(item.updatedAt).toISOString();
      }
      if (item.dueAt) {
        item.dueAt = new Date(item.dueAt).toISOString();
      }

      // Canonical aliases for backward compatibility across tables and charts
      item.timestamp = item.paidAt || item.createdAt || null;
      item.paymentDate = item.paidAt || null;

      if (userRole === ROLES.ADMIN) {
        // Strip personal receipt files and private banking/financing details from Admin views
        delete item.financingDetails;
        delete item.bankDetails;
        delete item.bankAccount;
        delete item.receiptUrl;
        delete item.receiptFilePath;
        delete item.cardDetails;
      }

      return item;
    });

    res.json({ success: true, data: normalized });
  } catch (err) {
    next(err);
  }
}

/**
 * Process Simulated Payment (Checkout)
 * POST /api/payments/checkout
 */
async function processMockPayment(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === ROLES.AGENT) {
      return res.status(403).json({
        success: false,
        error: { message: "Agent accounts cannot book or buy properties." },
      });
    }

    const {
      propertyId,
      amount,
      type = 'full_purchase',
      method = 'UPI',
      financingDetails,
      leaseDetails,
    } = req.body;

    if (!propertyId) {
      return res.status(400).json({ success: false, error: { message: 'Property identifier is required.' } });
    }

    if (type === 'token_amount') {
      return res.status(400).json({
        success: false,
        error: { message: 'Priority token advance reservations are deprecated. Buy purchases must be made via Full Payment or EMI Financing with Down Payment.' },
      });
    }

    const prop = await db.properties.findById(propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    if (prop.buyerId === userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'You have already acquired this residence.' },
      });
    }

    if (prop.isSold || prop.availabilityStatus === 'sold' || prop.status === 'sold') {
      return res.status(400).json({
        success: false,
        error: { message: 'This residence has already been acquired through a completed transaction.' },
      });
    }

    // Auto-expire ended leases based on backend stored leaseEndDate
    if (prop.isLeased && prop.leaseEndDate && new Date(prop.leaseEndDate) <= new Date()) {
      prop.isLeased = false;
      prop.rentalStatus = 'available';
      prop.tenantId = null;
      prop.leaseStartDate = null;
      prop.leaseEndDate = null;
      await db.properties.updateById(prop.id || prop.customId, {
        isLeased: false,
        rentalStatus: 'available',
        tenantId: null,
        leaseStartDate: null,
        leaseEndDate: null,
      }).catch(() => {});
    }

    if ((type === 'rent_deposit' || prop.listingType === 'rent') && (prop.isLeased || prop.rentalStatus === 'leased' || prop.status === 'rented')) {
      return res.status(400).json({
        success: false,
        error: { message: 'This rental sanctuary is currently under an active lease.' },
      });
    }

    const user = await db.users.findById(userId);
    const agent = await db.users.findById(prop.agentId);

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const paymentId = `TX-2026-${randomNum}`;
    const receiptNum = `REC-2026-${randomNum}`;

    const isBuy = type === 'full_purchase' || type === 'full_payment' || type === 'emi_down_payment' || type === 'emi';
    const isRent = type === 'rent_deposit' || prop.listingType === 'rent';

    // Authoritative calculation on backend — never trust client-provided amounts
    let calculatedAmount = 0;
    let validatedFinancingDetails = null;

    if (isBuy) {
      const price = Number(prop.price) || 0;
      if (type === 'emi_down_payment' || type === 'emi') {
        const minDownPct = Number(prop.minDownPaymentPercent) || 20;
        let downPaymentPercent = Number(financingDetails?.downPaymentPercent);
        if (isNaN(downPaymentPercent) || downPaymentPercent < minDownPct) {
          downPaymentPercent = minDownPct;
        }
        if (downPaymentPercent > 80) downPaymentPercent = 80;

        let tenureMonths = Number(financingDetails?.tenureMonths);
        if (isNaN(tenureMonths) || tenureMonths < 12 || tenureMonths > 360) {
          tenureMonths = 240;
        }

        const downPayment = Math.round((price * downPaymentPercent) / 100);
        const loanAmount = Math.max(0, price - downPayment);
        const benchmarkRate = 8.5; // platform benchmark p.a.
        const monthlyRate = (benchmarkRate / 12) / 100;
        const monthlyEmi = loanAmount > 0 && tenureMonths > 0
          ? Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
          : 0;
        const totalRepayment = monthlyEmi * tenureMonths;
        const totalInterest = Math.max(0, totalRepayment - loanAmount);

        validatedFinancingDetails = {
          planType: 'emi_down_payment',
          downPayment,
          downPaymentPercent,
          loanAmount,
          tenureMonths,
          tenureYears: Math.round((tenureMonths / 12) * 10) / 10,
          interestRate: benchmarkRate,
          monthlyEmi,
          totalInterest,
          totalRepayment,
        };
        calculatedAmount = downPayment;
      } else {
        // Full purchase valuation
        calculatedAmount = price;
      }

      // Atomic property status transition to prevent concurrent purchases
      const transitioned = await db.properties.atomicTransition(
        propertyId,
        {
          isSold: { $ne: true },
          status: { $ne: 'sold' },
          availabilityStatus: { $ne: 'sold' },
        },
        {
          isSold: true,
          status: 'sold',
          availabilityStatus: 'sold',
          buyerId: userId,
          soldAt: new Date(),
          featured: false,
        }
      );

      if (!transitioned) {
        return res.status(400).json({
          success: false,
          error: { message: 'This residence has just been acquired by another client or is no longer available.' },
        });
      }
    } else if (isRent) {
      calculatedAmount = (Number(prop.deposit) || 0) + (Number(prop.price) || 0) + (Number(prop.maintenanceFee) || 0);

      // Atomic transition for rental
      const transitioned = await db.properties.atomicTransition(
        propertyId,
        {
          isLeased: { $ne: true },
          status: { $ne: 'rented' },
          rentalStatus: { $ne: 'leased' },
        },
        {
          isLeased: true,
          status: 'rented',
          rentalStatus: 'leased',
          tenantId: userId,
          leasedAt: new Date(),
          leaseStartDate: new Date(),
          leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          featured: false,
        }
      );

      if (!transitioned) {
        return res.status(400).json({
          success: false,
          error: { message: 'This rental property has just been leased by another member.' },
        });
      }
    } else {
      calculatedAmount = Number(amount) || Number(prop.price) || 0;
    }

    const paymentRecord = {
      customId: paymentId,
      id: paymentId,
      receiptNumber: receiptNum,
      propertyId: prop.id || prop.customId,
      propertyTitle: prop.title,
      propertySnapshot: {
        locality: prop.locality,
        city: prop.city,
        price: prop.price,
        listingType: prop.listingType,
        image: prop.coverImage || (prop.images && prop.images[0]) || null,
      },
      userId,
      userName: user ? user.name : 'Verified Member',
      agentId: prop.agentId,
      agentName: agent ? agent.name : 'Representing Agent',
      amount: calculatedAmount,
      type: isBuy ? (type === 'emi_down_payment' || type === 'emi' ? 'emi_down_payment' : 'full_purchase') : type,
      method,
      status: 'completed',
      financingDetails: validatedFinancingDetails,
      leaseDetails: isRent
        ? {
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            monthlyRent: prop.price,
            securityDeposit: prop.deposit,
            maintenanceFee: prop.maintenanceFee,
          }
        : null,
      paidAt: new Date(),
    };

    const savedPayment = await db.payments.create(paymentRecord);

    // Authoritative schedule creation from confirmed terms
    let createdSchedule = null;
    if (isBuy && (type === 'emi_down_payment' || type === 'emi' || validatedFinancingDetails?.planType === 'emi_down_payment')) {
      try {
        const emiData = buildEmiSchedule({
          payment: savedPayment,
          property: prop,
          user: user || { id: userId, name: 'Verified Member' },
          agent: agent || { id: prop.agentId, name: 'Representing Agent' },
        });
        createdSchedule = await db.paymentSchedules.create(emiData);
      } catch (schedErr) {
        // Idempotency: ignore duplicate schedule key collision
      }
    } else if (isRent) {
      try {
        const rentData = buildRentSchedule({
          payment: savedPayment,
          property: prop,
          user: user || { id: userId, name: 'Verified Member' },
          agent: agent || { id: prop.agentId, name: 'Representing Agent' },
        });
        createdSchedule = await db.paymentSchedules.create(rentData);
      } catch (schedErr) {
        // Idempotency: ignore duplicate schedule key collision
      }
    }

    // Notifications with idempotent keys
    await db.notifications.create({
      customId: `notif_pay_usr_${savedPayment.customId || savedPayment.id}`,
      userId,
      title: isBuy ? 'Property Acquisition Confirmed' : 'Rental Lease Secured',
      message: `Simulated transaction ${paymentId} completed for ${prop.title}. Receipt ${savedPayment.receiptNumber || paymentId} is ready.`,
      type: 'payment',
      link: '/dashboard/payments',
    });

    await db.notifications.create({
      customId: `notif_pay_agt_${savedPayment.customId || savedPayment.id}`,
      userId: prop.agentId,
      title: isBuy ? 'Property Sale Executed' : 'Lease Agreement Executed',
      message: `${user ? user.name : 'Client'} completed transaction for ${prop.title}.`,
      type: 'payment',
      link: '/agent/transactions',
    });

    // Rating eligibility notification
    await db.notifications.create({
      customId: `notif_rating_elig_${savedPayment.customId || savedPayment.id}`,
      userId,
      title: 'Verified Agent Rating Unlocked',
      message: `Transaction completed for "${prop.title}". You are now eligible to rate your agent's service.`,
      type: 'rating',
      link: '/dashboard/properties',
    });

    res.status(201).json({ success: true, data: savedPayment });
  } catch (err) {
    next(err);
  }
}

/**
 * Request Early Lease Cancellation
 * POST /api/leases/:id/cancellation-request
 */
async function requestLeaseCancellation(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, requestedDate } = req.body;
    const payment = await db.payments.findById(id);

    if (!payment) {
      return res.status(404).json({ success: false, error: { message: 'Lease transaction not found.' } });
    }

    const isTenant = payment.userId === req.user.id;
    const isAgent = payment.agentId === req.user.id || payment.agentId === req.user.customId;
    if (!isTenant && !isAgent && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const effDate = requestedDate ? new Date(requestedDate) : new Date();
    const cancellationRequest = {
      requestedBy: isTenant ? 'tenant' : 'agent',
      requestedDate: effDate,
      reason: reason ? reason.trim() : '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const leaseDetails = { ...(payment.leaseDetails || {}), cancellationRequest };
    const updated = await db.payments.updateById(id, { leaseDetails });

    // Mark property as having a pending cancellation request
    await db.properties.updateById(payment.propertyId, { leaseCancellationPending: true });

    // Notify managing agent
    await db.notifications.create({
      userId: payment.agentId,
      title: 'Mutual Early Lease Cancellation Requested',
      message: `Tenant has requested early lease cancellation for "${payment.propertyTitle}". Requested effective date: ${effDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Please review on your Property Management page.`,
      type: 'lease',
      link: `/agent/properties/${payment.propertyId}`,
    });

    // Notify user confirmation
    if (isTenant) {
      await db.notifications.create({
        userId: payment.userId,
        title: 'Early Lease Cancellation Request Submitted',
        message: `Your request to end the lease for "${payment.propertyTitle}" has been sent to the managing agent for mutual approval.`,
        type: 'lease',
        link: '/dashboard/properties',
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Respond to Early Lease Cancellation Request
 * POST /api/leases/:id/cancellation-response
 */
async function respondLeaseCancellation(req, res, next) {
  try {
    const { id } = req.params;
    const { agree, decisionReason } = req.body;
    const payment = await db.payments.findById(id);

    if (!payment) {
      return res.status(404).json({ success: false, error: { message: 'Lease transaction not found.' } });
    }

    // Agent ownership check: ensure an agent cannot review or approve another agent's lease
    const isOwnerAgent = payment.agentId === req.user.id || payment.agentId === req.user.customId;
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isOwnerAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to respond to lease cancellations for another agent\'s listing.' },
      });
    }

    const currentReq = payment.leaseDetails?.cancellationRequest;
    if (!currentReq || currentReq.status !== 'pending') {
      return res.status(400).json({ success: false, error: { message: 'No pending cancellation request for this lease.' } });
    }

    const status = agree ? 'agreed' : 'declined';
    const agreedEffectiveDate = agree ? (currentReq.requestedDate || new Date()) : null;

    const cancellationRequest = {
      ...currentReq,
      status,
      agreedEffectiveDate,
      decisionReason: decisionReason ? decisionReason.trim() : '',
      updatedAt: new Date(),
    };

    const leaseDetails = { ...(payment.leaseDetails || {}), cancellationRequest };
    const paymentUpdates = { leaseDetails };
    if (agree) {
      paymentUpdates.leaseStatus = 'ended';
    }
    const updated = await db.payments.updateById(id, paymentUpdates);

    if (agree) {
      // Transition property to pending_handover (remains unavailable on public search)
      await db.properties.updateById(payment.propertyId, {
        rentalStatus: 'pending_handover',
        availabilityStatus: 'pending_handover',
        leaseCancellationPending: false,
      });

      // Stop future rent schedule installments after agreed date
      const schedules = await db.paymentSchedules.find({ propertyId: payment.propertyId, type: 'rent' });
      const effDate = new Date(agreedEffectiveDate);
      for (const s of schedules) {
        if (s.status === 'active') {
          const updatedInstallments = (s.installments || []).map((inst) => {
            if (new Date(inst.dueDate) > effDate && inst.status !== 'paid') {
              return { ...inst, status: 'cancelled' };
            }
            return inst;
          });
          await db.paymentSchedules.updateById(s._id || s.id, {
            status: 'cancelled',
            autopayEnabled: false,
            autopayMandateStatus: 'revoked',
            installments: updatedInstallments,
          });
        }
      }

      // Notify tenant
      await db.notifications.create({
        userId: payment.userId,
        title: 'Early Lease Cancellation Approved',
        message: `Your managing agent agreed to the early lease termination for "${payment.propertyTitle}". The lease has ended and the property is awaiting handover inspection.`,
        type: 'lease',
        link: '/dashboard/properties',
      });

      // Notify agent
      await db.notifications.create({
        userId: payment.agentId,
        title: 'Early Lease Termination Confirmed',
        message: `Early exit agreed for "${payment.propertyTitle}". Future rent installments cancelled. The residence has entered pending handover inspection.`,
        type: 'lease',
        link: `/agent/properties/${payment.propertyId}`,
      });
    } else {
      // Declined: Keep lease active
      await db.properties.updateById(payment.propertyId, {
        leaseCancellationPending: false,
      });

      // Notify tenant
      await db.notifications.create({
        userId: payment.userId,
        title: 'Early Lease Cancellation Declined',
        message: `The managing agent declined the early lease cancellation for "${payment.propertyTitle}". Standard lease terms and recurring obligations remain active.`,
        type: 'lease',
        link: '/dashboard/properties',
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Agent-Initiated Rental Lease Termination
 * POST /api/payments/leases/:id/agent-terminate
 */
async function agentTerminateLease(req, res, next) {
  try {
    const { id } = req.params;
    const { effectiveDate, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'A termination explanation/reason is required.' },
      });
    }

    // Find lease payment record by payment ID or property ID
    let payment = await db.payments.findById(id);
    if (!payment) {
      const candidates = await db.payments.find({
        propertyId: id,
        type: { $in: ['rent_deposit', 'rent_installment'] },
      });
      payment = candidates[0];
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: 'No recorded lease transaction found for this residence.' },
      });
    }

    // Ownership check: must be the representing agent or admin
    const isOwnerAgent = payment.agentId === req.user.id || payment.agentId === req.user.customId;
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isOwnerAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized. Only the representing agent can terminate this lease.' },
      });
    }

    // Fetch property
    const prop = await db.properties.findById(payment.propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Associated property not found.' } });
    }

    if (!prop.isLeased && prop.rentalStatus !== 'leased') {
      return res.status(400).json({
        success: false,
        error: { message: 'This property does not currently have an active lease.' },
      });
    }

    // Enforce 1 complete rental month rule
    // Determine the completed month from lease start date and backend-confirmed payment coverage
    const leaseStartDate = prop.leaseStartDate || payment.leaseDetails?.startDate || payment.paidAt || payment.createdAt;
    const startDateObj = new Date(leaseStartDate);
    const oneMonthLater = new Date(startDateObj.getTime() + 28 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const monthElapsed = now >= oneMonthLater;

    // Check backend-confirmed rent payment coverage
    const hasPaidCoverage =
      (payment.type === 'rent_deposit' && payment.status === 'completed') ||
      (await db.payments.find({
        propertyId: payment.propertyId,
        type: 'rent_installment',
        status: 'completed',
      }).then((r) => r.length > 0));

    if (!monthElapsed || !hasPaidCoverage) {
      const formattedEligibleDate = oneMonthLater.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return res.status(400).json({
        success: false,
        error: {
          message: `Agent-initiated rental termination is restricted until the rent for at least one complete rental month has been successfully paid and recorded. This lease becomes eligible on ${formattedEligibleDate}.`,
          eligibleDate: oneMonthLater.toISOString(),
        },
      });
    }

    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    // Update payment record
    const terminationRecord = {
      initiatedBy: 'agent',
      agentId: req.user.id,
      reason: reason.trim(),
      effectiveDate: effDate.toISOString(),
      terminatedAt: new Date().toISOString(),
    };

    const leaseDetails = {
      ...(payment.leaseDetails || {}),
      termination: terminationRecord,
    };

    const updatedPayment = await db.payments.updateById(payment.id || payment.customId, {
      leaseStatus: 'ended',
      leaseDetails,
    });

    // Update property availability to pending_handover (remains unlisted in public discovery)
    await db.properties.updateById(prop.id || prop.customId, {
      rentalStatus: 'pending_handover',
      availabilityStatus: 'pending_handover',
      isLeased: false,
      leaseCancellationPending: false,
    });

    // Stop future rent schedule installments after effective date
    const schedules = await db.paymentSchedules.find({ propertyId: payment.propertyId, type: 'rent' });
    for (const s of schedules) {
      if (s.status === 'active') {
        const updatedInstallments = (s.installments || []).map((inst) => {
          if (new Date(inst.dueDate) >= effDate && inst.status !== 'paid') {
            return { ...inst, status: 'cancelled' };
          }
          return inst;
        });
        await db.paymentSchedules.updateById(s._id || s.id, {
          status: 'cancelled',
          autopayEnabled: false,
          autopayMandateStatus: 'revoked',
          installments: updatedInstallments,
        });
      }
    }

    // Notify Tenant (User)
    await db.notifications.create({
      userId: payment.userId,
      title: 'Rental Lease Terminated by Managing Agent',
      message: `Your managing agent has terminated the lease for "${payment.propertyTitle}" effective ${effDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Reason: ${reason.trim()}. Future recurring rent obligations have been stopped. Please coordinate handover inspection.`,
      type: 'lease',
      link: '/dashboard/properties',
    });

    // Notify Agent
    await db.notifications.create({
      userId: req.user.id,
      title: 'Lease Termination Recorded',
      message: `You initiated early termination for "${payment.propertyTitle}". The residence has entered pending handover inspection.`,
      type: 'lease',
      link: `/agent/properties/${prop.id || prop.customId}`,
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Rental lease terminated successfully. Future rent schedule items have been cancelled and property is pending handover inspection.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Confirm Rental Handover
 * POST /api/properties/:id/confirm-handover
 */
async function confirmRentalHandover(req, res, next) {
  try {
    const { id } = req.params;
    const prop = await db.properties.findById(id);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    const isAgent = prop.agentId === req.user.id || prop.agentId === req.user.customId;
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isAgent && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    // Return property to public Rent availability
    const updated = await db.properties.updateById(id, {
      isLeased: false,
      tenantId: null,
      rentalStatus: 'available',
      availabilityStatus: 'available',
      leaseStartDate: null,
      leaseEndDate: null,
      leaseCancellationPending: false,
    });

    // Notify agent
    await db.notifications.create({
      userId: prop.agentId,
      title: 'Handover Completed & Listing Active',
      message: `Handover inspection confirmed for "${prop.title}". The residence is now available on public Rent browse.`,
      type: 'property',
      link: `/agent/properties/${prop.id}`,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Payment Schedules (Role Scoped)
 * GET /api/payments/schedules
 */
async function getPaymentSchedules(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { type, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    if (userRole === ROLES.USER) {
      filter.userId = userId;
    } else if (userRole === ROLES.AGENT) {
      filter.agentId = userId;
    }

    const schedules = await db.paymentSchedules.find(filter);
    const now = new Date();

    const synced = schedules.map((s) => {
      const obj = s.toObject ? s.toObject() : { ...s };
      return syncScheduleStatuses(obj, now);
    });

    res.json({ success: true, data: synced });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Payment Schedule by ID
 * GET /api/payments/schedules/:id
 */
async function getPaymentScheduleById(req, res, next) {
  try {
    const { id } = req.params;
    const schedule = await db.paymentSchedules.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, error: { message: 'Schedule not found.' } });
    }

    const isOwner = schedule.userId === req.user.id;
    const isAgent = schedule.agentId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }

    const obj = schedule.toObject ? schedule.toObject() : { ...schedule };
    const synced = syncScheduleStatuses(obj, new Date());
    res.json({ success: true, data: synced });
  } catch (err) {
    next(err);
  }
}

/**
 * Pay Schedule Installment
 * POST /api/payments/schedules/:id/installments/:installmentNumber/pay
 */
async function payScheduleInstallment(req, res, next) {
  try {
    const { id, installmentNumber } = req.params;
    const { method = 'UPI' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === ROLES.AGENT) {
      return res.status(403).json({
        success: false,
        error: { message: 'Agent accounts cannot submit installment payments.' },
      });
    }

    const schedule = await db.paymentSchedules.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, error: { message: 'Payment schedule not found.' } });
    }

    if (schedule.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to pay this installment.' },
      });
    }

    if (schedule.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: `This schedule is ${schedule.status} and cannot accept payments.` },
      });
    }

    const instNum = Number(installmentNumber);
    const installment = schedule.installments.find((i) => i.installmentNumber === instNum);
    if (!installment) {
      return res.status(404).json({ success: false, error: { message: 'Installment not found in schedule.' } });
    }

    if (installment.status === 'paid') {
      return res.status(400).json({ success: false, error: { message: 'This installment has already been paid.' } });
    }

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const paymentId = `TX-2026-${randomNum}`;
    const receiptNum = `REC-2026-${randomNum}`;
    const paidAt = new Date();

    const paymentType = schedule.type === 'emi' ? 'emi_installment' : 'rent_installment';

    // Record authoritative payment in ledger
    const paymentRecord = {
      customId: paymentId,
      id: paymentId,
      receiptNumber: receiptNum,
      propertyId: schedule.propertyId,
      propertyTitle: schedule.propertyTitle,
      propertySnapshot: schedule.propertySnapshot,
      userId,
      userName: schedule.userName,
      agentId: schedule.agentId,
      agentName: schedule.agentName,
      amount: installment.amount,
      type: paymentType,
      method: String(method).toUpperCase(),
      status: 'completed',
      scheduleId: schedule.customId,
      installmentNumber: instNum,
      dueAt: installment.dueDate || installment.dueAt || null,
      paidAt,
    };

    const savedPayment = await db.payments.create(paymentRecord);

    // Update installment status
    installment.status = 'paid';
    installment.paidAt = paidAt;
    installment.paymentId = paymentId;
    installment.receiptNumber = receiptNum;
    installment.paymentMethod = String(method).toUpperCase();
    installment.failureReason = null;

    schedule.paidInstallments = (schedule.paidInstallments || 0) + 1;
    schedule.remainingBalance = Math.max(0, (schedule.remainingBalance || 0) - installment.amount);

    if (schedule.paidInstallments >= schedule.totalInstallments || schedule.remainingBalance <= 0) {
      schedule.status = 'completed';
    }

    await schedule.save();

    // Idempotent notifications
    const typeLabel = schedule.type === 'emi' ? 'EMI Installment' : 'Monthly Rent';
    await db.notifications.create({
      customId: `notif_inst_usr_${paymentId}`,
      userId,
      title: `${typeLabel} #${instNum} Payment Confirmed`,
      message: `Your payment of ₹${installment.amount.toLocaleString('en-IN')} for ${schedule.propertyTitle} was confirmed. Receipt ${receiptNum} is ready.`,
      type: 'payment',
      link: '/dashboard/payments',
    });

    await db.notifications.create({
      customId: `notif_inst_agt_${paymentId}`,
      userId: schedule.agentId,
      title: `${typeLabel} Received for ${schedule.propertyTitle}`,
      message: `${schedule.userName} completed ${typeLabel.toLowerCase()} #${instNum} (₹${installment.amount.toLocaleString('en-IN')}).`,
      type: 'payment',
      link: '/agent/transactions',
    });

    res.status(200).json({
      success: true,
      data: {
        payment: savedPayment,
        schedule: syncScheduleStatuses(schedule.toObject(), new Date()),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fulfill a successful Stripe Checkout Session
 * Idempotently invoked from Webhook or sync session status check
 */
async function fulfillSuccessfulCheckoutSession(session) {
  const metadata = session.metadata || {};
  const {
    paymentType,
    userId,
    propertyId,
    scheduleId,
    installmentNumber,
    autopayOptIn,
    downPaymentPercent,
    loanTenureMonths,
  } = metadata;

  // Retrieve existing payment record by stripeSessionId
  let payment = await db.payments.findOne({ stripeSessionId: session.id });
  if (payment && payment.status === 'completed') {
    let schedule = null;
    if (scheduleId) {
      schedule = await db.paymentSchedules.findById(scheduleId);
    } else {
      schedule = await db.paymentSchedules.findOne({ initialPaymentId: payment.customId });
    }
    return { payment, schedule };
  }

  // Extract payment method details (card brand, last 4)
  let cardBrand = 'Card';
  let cardLast4 = '••••';
  let stripePaymentMethodId = null;

  try {
    const fullSession = await stripeService.retrieveSession(session.id);
    const pi = fullSession.payment_intent;
    if (pi && typeof pi === 'object') {
      const pm = pi.payment_method;
      if (pm && typeof pm === 'object' && pm.card) {
        cardBrand = pm.card.brand ? pm.card.brand.toUpperCase() : 'Card';
        cardLast4 = pm.card.last4 || '••••';
        stripePaymentMethodId = pm.id;
      }
    }
  } catch (err) {
    logger.warn('Could not extract card details from Stripe session:', err.message);
  }

  const prop = propertyId ? await db.properties.findById(propertyId) : null;
  const user = userId ? await db.users.findById(userId) : null;
  const agent = prop?.agentId ? await db.users.findById(prop.agentId) : null;

  const paidAmount = Number(session.amount_total)
    ? Number(session.amount_total) / 100
    : (payment?.amount || 0);

  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const paymentId = payment?.customId || `TX-2026-${randomNum}`;
  const receiptNum = payment?.receiptNumber || `REC-2026-${randomNum}`;

  const authoritativePaidAt = payment?.paidAt
    ? new Date(payment.paidAt)
    : session.created
    ? new Date(session.created * 1000)
    : payment?.createdAt
    ? new Date(payment.createdAt)
    : new Date();

  // If this payment fulfills a scheduled installment, resolve its authoritative due date
  let installmentDueAt = null;
  if (scheduleId && installmentNumber) {
    try {
      const targetSched = await db.paymentSchedules.findById(scheduleId);
      const targetInst = targetSched?.installments?.find(
        (i) => i.installmentNumber === Number(installmentNumber)
      );
      if (targetInst) {
        installmentDueAt = targetInst.dueDate || targetInst.dueAt || null;
      }
    } catch (schedLookupErr) {
      // Non-fatal
    }
  }

  let createdSchedule = null;

  // Atomic state transition on Property
  if (paymentType === 'full_purchase') {
    if (prop) {
      await db.properties.atomicTransition(
        propertyId,
        { isSold: { $ne: true }, status: { $ne: 'sold' } },
        {
          isSold: true,
          status: 'sold',
          availabilityStatus: 'sold',
          buyerId: userId,
          soldAt: authoritativePaidAt,
          featured: false,
        }
      );
    }
  } else if (paymentType === 'emi_down_payment') {
    if (prop) {
      await db.properties.atomicTransition(
        propertyId,
        { isSold: { $ne: true }, status: { $ne: 'sold' } },
        {
          isSold: true,
          status: 'sold',
          availabilityStatus: 'sold',
          buyerId: userId,
          soldAt: authoritativePaidAt,
          featured: false,
        }
      );
    }
  } else if (paymentType === 'rent_deposit') {
    if (prop) {
      await db.properties.atomicTransition(
        propertyId,
        { isLeased: { $ne: true }, status: { $ne: 'rented' } },
        {
          isLeased: true,
          status: 'rented',
          rentalStatus: 'leased',
          tenantId: userId,
          leasedAt: authoritativePaidAt,
          leaseStartDate: authoritativePaidAt,
          leaseEndDate: new Date(authoritativePaidAt.getTime() + 365 * 24 * 60 * 60 * 1000),
          featured: false,
        }
      );
    }
  } else if (paymentType === 'promotion_fee') {
    if (prop) {
      await db.properties.updateById(propertyId, {
        isPremium: true,
        isPremiumAdminFlag: true,
      });
      await db.promotions.create({
        propertyId,
        propertyTitle: prop.title,
        agentId: prop.agentId,
        agentName: agent ? agent.name : 'Agent',
        type: 'premium_badge',
        feeAmount: paidAmount,
        paymentReference: paymentId,
        status: 'approved',
        isPermanent: true,
      });
    }
  }

  // Update or create payment record in DB
  const paymentPayload = {
    customId: paymentId,
    receiptNumber: receiptNum,
    propertyId: prop?.id || propertyId || '',
    propertyTitle: prop?.title || metadata.propertyTitle || 'Residence',
    propertySnapshot: prop
      ? {
          locality: prop.locality,
          city: prop.city,
          price: prop.price,
          listingType: prop.listingType,
          image: prop.coverImage || (prop.images && prop.images[0]) || null,
        }
      : payment?.propertySnapshot || null,
    userId: userId,
    userName: user ? user.name : payment?.userName || 'Verified Member',
    agentId: prop?.agentId || payment?.agentId || '',
    agentName: agent ? agent.name : payment?.agentName || 'Representing Agent',
    amount: paidAmount,
    type: paymentType,
    method: `Card (${cardBrand} •••• ${cardLast4})`,
    cardBrand,
    cardLast4,
    status: 'completed',
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
    stripeCustomerId:
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || null,
    paidAt: authoritativePaidAt,
    dueAt: installmentDueAt,
    scheduleId: scheduleId || null,
    installmentNumber: installmentNumber ? Number(installmentNumber) : null,
    autopayEnabled: autopayOptIn === 'true',
  };

  if (payment) {
    payment = await db.payments.updateById(payment.id || payment.customId, paymentPayload);
  } else {
    payment = await db.payments.create(paymentPayload);
  }

  // Schedules handling
  if (paymentType === 'emi_down_payment' && prop) {
    try {
      const emiData = buildEmiSchedule({
        payment,
        property: prop,
        user: user || { id: userId, name: payment.userName },
        agent: agent || { id: prop.agentId, name: payment.agentName },
      });
      if (autopayOptIn === 'true') {
        emiData.autopayEnabled = true;
        emiData.stripeCustomerId = session.customer;
        emiData.stripePaymentMethodId = stripePaymentMethodId;
        emiData.autopayCardBrand = cardBrand;
        emiData.autopayCardLast4 = cardLast4;
        emiData.autopayMandateStatus = 'active';
      }
      createdSchedule = await db.paymentSchedules.create(emiData);
    } catch (schedErr) {
      logger.warn('Schedule creation duplicate or skipped:', schedErr.message);
    }
  } else if (paymentType === 'rent_deposit' && prop) {
    try {
      const rentData = buildRentSchedule({
        payment,
        property: prop,
        user: user || { id: userId, name: payment.userName },
        agent: agent || { id: prop.agentId, name: payment.agentName },
      });
      if (autopayOptIn === 'true') {
        rentData.autopayEnabled = true;
        rentData.stripeCustomerId = session.customer;
        rentData.stripePaymentMethodId = stripePaymentMethodId;
        rentData.autopayCardBrand = cardBrand;
        rentData.autopayCardLast4 = cardLast4;
        rentData.autopayMandateStatus = 'active';
      }
      createdSchedule = await db.paymentSchedules.create(rentData);
    } catch (schedErr) {
      logger.warn('Schedule creation duplicate or skipped:', schedErr.message);
    }
  } else if (
    (paymentType === 'emi_installment' || paymentType === 'rent_installment') &&
    scheduleId
  ) {
    const schedule = await db.paymentSchedules.findById(scheduleId);
    if (schedule) {
      const instNum = Number(installmentNumber);
      const inst = schedule.installments.find((i) => i.installmentNumber === instNum);
      if (inst && inst.status !== 'paid') {
        inst.status = 'paid';
        inst.paidAt = authoritativePaidAt;
        inst.paymentId = payment.customId;
        inst.receiptNumber = payment.receiptNumber;
        inst.paymentMethod = payment.method;

        schedule.paidInstallments = (schedule.paidInstallments || 0) + 1;
        schedule.remainingBalance = Math.max(0, (schedule.remainingBalance || 0) - inst.amount);

        if (
          schedule.paidInstallments >= schedule.totalInstallments ||
          schedule.remainingBalance <= 0
        ) {
          schedule.status = 'completed';
        }
        await schedule.save();
        createdSchedule = schedule;
      }
    }
  }

  // Idempotent In-App Notifications
  const isBuy = paymentType === 'full_purchase' || paymentType === 'emi_down_payment';
  const isRent = paymentType === 'rent_deposit';
  const isInst = paymentType === 'emi_installment' || paymentType === 'rent_installment';

  try {
    if (isBuy || isRent) {
      await db.notifications.create({
        customId: `notif_stripe_usr_${payment.customId}`,
        userId,
        title: isBuy ? 'Property Acquisition Confirmed' : 'Rental Lease Secured',
        message: `Stripe payment confirmed for ${prop?.title || 'property'}. Receipt ${receiptNum} is ready.`,
        type: 'payment',
        link: '/dashboard/payments',
      });
      if (prop?.agentId) {
        await db.notifications.create({
          customId: `notif_stripe_agt_${payment.customId}`,
          userId: prop.agentId,
          title: isBuy ? 'Property Sale Executed' : 'Lease Agreement Executed',
          message: `${payment.userName} completed payment for ${prop.title}.`,
          type: 'payment',
          link: '/agent/transactions',
        });
      }
    } else if (isInst) {
      await db.notifications.create({
        customId: `notif_stripe_inst_usr_${payment.customId}`,
        userId,
        title: `Installment #${installmentNumber} Payment Confirmed`,
        message: `Your payment of ₹${paidAmount.toLocaleString('en-IN')} for ${prop?.title || 'property'} was confirmed via Stripe. Receipt ${receiptNum} is ready.`,
        type: 'payment',
        link: '/dashboard/payments',
      });
      if (prop?.agentId) {
        await db.notifications.create({
          customId: `notif_stripe_inst_agt_${payment.customId}`,
          userId: prop.agentId,
          title: `Installment Received for ${prop.title}`,
          message: `${payment.userName} completed installment #${installmentNumber} (₹${paidAmount.toLocaleString('en-IN')}).`,
          type: 'payment',
          link: '/agent/transactions',
        });
      }
    } else if (paymentType === 'promotion_fee') {
      await db.notifications.create({
        customId: `notif_stripe_promo_agt_${payment.customId}`,
        userId,
        title: 'Premium Upgrade Unlocked',
        message: `Your listing "${prop?.title || 'property'}" is now permanently designated as Premium. 360° virtual tour is active.`,
        type: 'promotion',
        link: `/agent/properties/${propertyId}`,
      });
      const admins = await db.users.find({ role: ROLES.ADMIN });
      for (const adm of admins) {
        await db.notifications.create({
          customId: `notif_stripe_promo_adm_${payment.customId}_${adm.id || adm.customId}`,
          userId: adm.id || adm.customId,
          title: 'Premium Promotion Fee Paid',
          message: `Agent paid ₹${paidAmount.toLocaleString('en-IN')} Premium tier fee for "${prop?.title || 'property'}".`,
          type: 'promotion',
          link: '/admin/promotions',
        });
      }
    }
  } catch (notifErr) {
    // Non-fatal
  }

  return { payment, schedule: createdSchedule };
}

/**
 * Create Stripe Checkout Session
 * POST /api/payments/create-checkout-session
 */
async function createStripeCheckoutSession(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      propertyId,
      type = 'full_purchase',
      scheduleId,
      installmentNumber,
      financingDetails,
      leaseDetails,
      autopayOptIn = false,
    } = req.body;

    if (!propertyId && !scheduleId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Property or Schedule identifier is required.' },
      });
    }

    let prop = null;
    let schedule = null;

    if (scheduleId) {
      schedule = await db.paymentSchedules.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: { message: 'Payment schedule not found.' },
        });
      }
      if (schedule.userId !== userId && userRole !== ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          error: { message: 'Unauthorized for this payment schedule.' },
        });
      }
      prop = await db.properties.findById(schedule.propertyId);
    } else {
      prop = await db.properties.findById(propertyId);
      if (!prop) {
        return res.status(404).json({
          success: false,
          error: { message: 'Property not found.' },
        });
      }
    }

    if (type === 'promotion_fee') {
      if (userRole !== ROLES.AGENT && userRole !== ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          error: { message: 'Only listing agents or administrators can upgrade property tiers.' },
        });
      }
      if (prop.agentId !== userId && userRole !== ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          error: { message: 'Unauthorized for this property.' },
        });
      }
      if (prop.isPremium || prop.isPremiumAdminFlag) {
        return res.status(400).json({
          success: false,
          error: { message: 'This property already has permanent Premium status.' },
        });
      }
    } else {
      if (userRole === ROLES.AGENT) {
        return res.status(403).json({
          success: false,
          error: { message: 'Agent accounts cannot acquire or rent residential properties.' },
        });
      }
    }

    // Authoritative calculation on backend
    let calculatedAmount = 0;
    let validatedFinancing = null;

    if (type === 'full_purchase' || type === 'full_payment') {
      if (prop.isSold || prop.availabilityStatus === 'sold' || prop.status === 'sold') {
        return res.status(400).json({
          success: false,
          error: { message: 'This residence has already been acquired.' },
        });
      }
      calculatedAmount = Number(prop.price) || 0;
    } else if (type === 'emi_down_payment' || type === 'emi') {
      if (prop.isSold || prop.availabilityStatus === 'sold' || prop.status === 'sold') {
        return res.status(400).json({
          success: false,
          error: { message: 'This residence has already been acquired.' },
        });
      }
      const price = Number(prop.price) || 0;
      const minDownPct = Number(prop.minDownPaymentPercent) || 20;
      let downPaymentPercent = Number(financingDetails?.downPaymentPercent);
      if (isNaN(downPaymentPercent) || downPaymentPercent < minDownPct) {
        downPaymentPercent = minDownPct;
      }
      if (downPaymentPercent > 80) downPaymentPercent = 80;

      let tenureMonths = Number(financingDetails?.tenureMonths);
      if (isNaN(tenureMonths) || tenureMonths < 12 || tenureMonths > 360) {
        tenureMonths = 240;
      }

      const downPayment = Math.round((price * downPaymentPercent) / 100);
      const loanAmount = Math.max(0, price - downPayment);
      const benchmarkRate = 8.5;
      const monthlyRate = (benchmarkRate / 12) / 100;
      const monthlyEmi =
        loanAmount > 0 && tenureMonths > 0
          ? Math.round(
              (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                (Math.pow(1 + monthlyRate, tenureMonths) - 1)
            )
          : 0;

      validatedFinancing = {
        planType: 'emi_down_payment',
        downPayment,
        downPaymentPercent,
        loanAmount,
        tenureMonths,
        interestRate: benchmarkRate,
        monthlyEmi,
      };
      calculatedAmount = downPayment;
    } else if (type === 'rent_deposit') {
      if (prop.isLeased || prop.rentalStatus === 'leased' || prop.status === 'rented') {
        return res.status(400).json({
          success: false,
          error: { message: 'This rental property is currently under an active lease.' },
        });
      }
      calculatedAmount =
        (Number(prop.deposit) || 0) +
        (Number(prop.price) || 0) +
        (Number(prop.maintenanceFee) || 0);
    } else if (type === 'emi_installment' || type === 'rent_installment') {
      const instNum = Number(installmentNumber);
      const inst = schedule.installments.find((i) => i.installmentNumber === instNum);
      if (!inst) {
        return res.status(404).json({
          success: false,
          error: { message: 'Installment not found in schedule.' },
        });
      }
      if (inst.status === 'paid') {
        return res.status(400).json({
          success: false,
          error: { message: 'Installment is already paid.' },
        });
      }
      calculatedAmount = inst.amount;
    } else if (type === 'promotion_fee') {
      const promoConfig = await db.promotions.getConfig().catch(() => null);
      calculatedAmount = Number(promoConfig?.premiumFee) || 15000;
    } else {
      calculatedAmount = Number(prop?.price) || 0;
    }

    const user = await db.users.findById(userId);
    const session = await stripeService.createCheckoutSession({
      user: { id: userId, email: user?.email, name: user?.name },
      property: prop,
      paymentType:
        type === 'emi'
          ? 'emi_down_payment'
          : type === 'full_payment'
          ? 'full_purchase'
          : type,
      amount: calculatedAmount,
      scheduleId: schedule?.id || scheduleId || null,
      installmentNumber,
      financingDetails: validatedFinancing,
      leaseDetails,
      autopayOptIn: Boolean(autopayOptIn),
    });

    // Create pending payment record
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const paymentId = `TX-2026-${randomNum}`;
    const receiptNum = `REC-2026-${randomNum}`;

    await db.payments.create({
      customId: paymentId,
      receiptNumber: receiptNum,
      propertyId: prop ? prop.id || prop.customId : '',
      propertyTitle: prop?.title || schedule?.propertyTitle || 'Residence',
      propertySnapshot: prop
        ? {
            locality: prop.locality,
            city: prop.city,
            price: prop.price,
            listingType: prop.listingType,
            image: prop.coverImage || (prop.images && prop.images[0]) || null,
          }
        : schedule?.propertySnapshot || null,
      userId,
      userName: user ? user.name : 'Verified Member',
      agentId: prop?.agentId || schedule?.agentId || '',
      agentName: prop?.agentId ? 'Representing Agent' : '',
      amount: calculatedAmount,
      type:
        type === 'emi'
          ? 'emi_down_payment'
          : type === 'full_payment'
          ? 'full_purchase'
          : type,
      method: 'Card / Stripe Checkout',
      status: 'pending',
      stripeSessionId: session.sessionId,
      financingDetails: validatedFinancing,
      scheduleId: schedule?.id || scheduleId || null,
      installmentNumber: installmentNumber ? Number(installmentNumber) : null,
      autopayEnabled: Boolean(autopayOptIn),
    });

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        sessionUrl: session.sessionUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Stripe Webhook Events
 * POST /api/payments/webhook
 */
async function handleStripeWebhook(req, res, next) {
  try {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripeService.verifyWebhookSignature(req.body, sig);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency check
    const existing = await db.stripeEvents.findByEventId(event.id);
    if (existing) {
      return res.json({ received: true, idempotent: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await fulfillSuccessfulCheckoutSession(session);
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const pendingPayment = await db.payments.findOne({ stripeSessionId: session.id });
      if (pendingPayment && pendingPayment.status === 'pending') {
        await db.payments.updateById(pendingPayment.id || pendingPayment.customId, {
          status: 'expired',
          expiredAt: new Date(),
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const pendingPayment = await db.payments.findOne({ stripePaymentIntentId: pi.id });
      if (pendingPayment && pendingPayment.status === 'pending') {
        await db.payments.updateById(pendingPayment.id || pendingPayment.customId, {
          status: 'failed',
        });
      }
    }

    await db.stripeEvents.record(event.id, event.type, event.livemode);
    res.json({ received: true });
  } catch (err) {
    logger.error('Error handling Stripe webhook event:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Get Session Status & Fallback Sync Check
 * GET /api/payments/session-status/:sessionId
 */
async function getSessionStatus(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Session ID is required.' },
      });
    }

    let payment = await db.payments.findOne({ stripeSessionId: sessionId });

    // Fallback sync verification: If payment is not yet completed in DB, query Stripe API directly
    if (!payment || payment.status === 'pending') {
      try {
        const session = await stripeService.retrieveSession(sessionId);
        if (session && session.payment_status === 'paid') {
          const fulfilled = await fulfillSuccessfulCheckoutSession(session);
          payment = fulfilled.payment;
        }
      } catch (stripeErr) {
        logger.warn('Direct Stripe session status query error:', stripeErr.message);
      }
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment session not found.' },
      });
    }

    // Role-scoped authorization check: only payer, listing agent, or admin can access session status
    const isOwner = payment.userId === req.user.id;
    const isAgent = payment.agentId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized access to this transaction record.' },
      });
    }

    let schedule = null;
    if (payment.scheduleId) {
      schedule = await db.paymentSchedules.findById(payment.scheduleId);
    } else {
      schedule = await db.paymentSchedules.findOne({ initialPaymentId: payment.customId });
    }

    const serializedPayment = payment.toJSON ? payment.toJSON() : (payment.toObject ? payment.toObject() : { ...payment });
    if (!serializedPayment.paidAt && serializedPayment.status === 'completed' && serializedPayment.createdAt) {
      serializedPayment.paidAt = new Date(serializedPayment.createdAt).toISOString();
    } else if (serializedPayment.paidAt) {
      serializedPayment.paidAt = new Date(serializedPayment.paidAt).toISOString();
    }
    if (serializedPayment.createdAt) {
      serializedPayment.createdAt = new Date(serializedPayment.createdAt).toISOString();
    }
    serializedPayment.timestamp = serializedPayment.paidAt || serializedPayment.createdAt || null;
    serializedPayment.paymentDate = serializedPayment.paidAt || null;

    res.json({
      success: true,
      data: {
        status: serializedPayment.status,
        payment: serializedPayment,
        schedule: schedule
          ? syncScheduleStatuses(schedule.toObject ? schedule.toObject() : schedule, new Date())
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle Autopay on Payment Schedule
 * PATCH /api/payments/schedules/:id/autopay
 */
async function toggleScheduleAutopay(req, res, next) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const userId = req.user.id;

    const schedule = await db.paymentSchedules.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Schedule not found.' },
      });
    }
    if (schedule.userId !== userId && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized for this schedule.' },
      });
    }

    schedule.autopayEnabled = Boolean(enabled);
    schedule.autopayMandateStatus = schedule.autopayEnabled ? 'active' : 'revoked';
    await schedule.save();

    await db.notifications.create({
      customId: `notif_autopay_${schedule.customId}_${Date.now()}`,
      userId,
      title: schedule.autopayEnabled ? 'Autopay Activated' : 'Autopay Revoked',
      message: schedule.autopayEnabled
        ? `Automatic deductions enabled for ${schedule.propertyTitle}. You will receive a reminder before each due date.`
        : `Automatic deductions paused for ${schedule.propertyTitle}. You can pay upcoming installments manually.`,
      type: 'payment',
      link: '/dashboard/payments',
    });

    res.json({
      success: true,
      data: syncScheduleStatuses(schedule.toObject ? schedule.toObject() : schedule, new Date()),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel a pending Stripe Checkout Session
 * POST /api/payments/cancel-session/:sessionId
 */
async function cancelCheckoutSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: { message: 'Session ID is required.' } });
    }

    const payment = await db.payments.findOne({ stripeSessionId: sessionId });
    if (payment) {
      const isOwner = payment.userId === req.user.id;
      const isAgent = payment.agentId === req.user.id;
      const isAdmin = req.user.role === ROLES.ADMIN;
      if (!isOwner && !isAgent && !isAdmin) {
        return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
      }

      if (payment.status === 'pending') {
        await db.payments.updateById(payment.id || payment.customId, {
          status: 'cancelled',
          cancelledAt: new Date(),
        });
      }
    }

    res.json({ success: true, message: 'Checkout session marked as cancelled.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayments,
  processMockPayment,
  requestLeaseCancellation,
  respondLeaseCancellation,
  agentTerminateLease,
  confirmRentalHandover,
  getPaymentSchedules,
  getPaymentScheduleById,
  payScheduleInstallment,
  createStripeCheckoutSession,
  fulfillSuccessfulCheckoutSession,
  handleStripeWebhook,
  getSessionStatus,
  cancelCheckoutSession,
  toggleScheduleAutopay,
};
