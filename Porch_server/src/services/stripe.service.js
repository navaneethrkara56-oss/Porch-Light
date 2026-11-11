/**
 * Stripe Service for Porch Light Server
 * Centralizes Stripe SDK client, Checkout session generation,
 * webhook signature verification, and recurring mandate execution.
 * (Test Mode Only - US registered account processing INR with RBI-ready SCA support)
 */

const Stripe = require('stripe');
const config = require('../config/env');
const logger = require('../utils/logger');

let stripeClient = null;
let currentKey = null;

function getStripeClient() {
  const secretKey = (process.env.STRIPE_SECRET_KEY || config.stripe.secretKey || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!stripeClient || currentKey !== secretKey) {
    if (!secretKey || secretKey.startsWith('sk_test_placeholder')) {
      logger.warn(
        'Stripe secret key is not set or using placeholder. Stripe calls will fail until valid test key is provided in .env.'
      );
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
    currentKey = secretKey;
  }
  return stripeClient;
}

/**
 * Find or create a Stripe Customer for an authenticated user
 */
async function getOrCreateCustomer({ userId, email, name }) {
  const stripe = getStripeClient();
  const safeEmail = (email || '').toLowerCase().trim();

  if (safeEmail) {
    const existing = await stripe.customers.list({
      email: safeEmail,
      limit: 1,
    });
    if (existing.data && existing.data.length > 0) {
      return existing.data[0];
    }
  }

  const customer = await stripe.customers.create({
    email: safeEmail || undefined,
    name: name || undefined,
    metadata: {
      porchLightUserId: String(userId),
    },
  });

  return customer;
}

/**
 * Create a Stripe Checkout Session
 */
async function createCheckoutSession({
  user,
  property,
  paymentType,
  amount,
  scheduleId = null,
  installmentNumber = null,
  financingDetails = null,
  leaseDetails = null,
  autopayOptIn = false,
  returnUrl = null,
}) {
  const stripe = getStripeClient();
  const customer = await getOrCreateCustomer({
    userId: user.id || user.customId,
    email: user.email,
    name: user.name,
  });

  const amountInPaise = Math.round(Number(amount) * 100);
  if (isNaN(amountInPaise) || amountInPaise <= 0) {
    throw new Error('Invalid payment amount calculated for Stripe checkout.');
  }

  let lineItemName = `${property?.title || 'Porch Light Property'} — Payment`;
  let lineItemDescription = 'Porch Light Architectural Real Estate';

  switch (paymentType) {
    case 'full_purchase':
      lineItemName = `Full Purchase Acquisition — ${property.title}`;
      lineItemDescription = `100% Full ownership acquisition for residence in ${property.locality || ''}, ${property.city || ''}.`;
      break;
    case 'emi_down_payment':
      lineItemName = `EMI Down Payment (${financingDetails?.downPaymentPercent || 20}%) — ${property.title}`;
      lineItemDescription = `Initial down payment agreement. Loan term: ${financingDetails?.tenureMonths || 240} months @ 8.5% p.a.`;
      break;
    case 'emi_installment':
      lineItemName = `EMI Installment #${installmentNumber} — ${property?.title || 'Residence'}`;
      lineItemDescription = `Monthly EMI installment payment under financing agreement.`;
      break;
    case 'rent_deposit':
      lineItemName = `Move-in Security Deposit & 1st Month Rent — ${property.title}`;
      lineItemDescription = `Initial lease reservation, security deposit and first month occupancy advance.`;
      break;
    case 'rent_installment':
      lineItemName = `Monthly Rent #${installmentNumber} — ${property?.title || 'Residence'}`;
      lineItemDescription = `Scheduled monthly rental occupancy payment.`;
      break;
    case 'promotion_fee':
      lineItemName = `Permanent Premium Listing Upgrade — ${property.title}`;
      lineItemDescription = `Agent marketing fee unlocking 360° virtual tour immersion and permanent Premium badge.`;
      break;
    default:
      lineItemName = `Payment — ${property?.title || 'Porch Light'}`;
  }

  const canonicalPropId = property?.id || property?.customId || '';
  const successUrl = `${config.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${config.clientUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}${canonicalPropId ? `&property_id=${canonicalPropId}` : ''}&purpose=${paymentType}`;

  const sessionPayload = {
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: config.stripe.currency,
          product_data: {
            name: lineItemName,
            description: lineItemDescription,
            images: property?.images && property.images[0] ? [property.images[0]] : undefined,
          },
          unit_amount: amountInPaise,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      paymentType,
      userId: String(user.id || user.customId),
      propertyId: String(property?.id || property?.customId || ''),
      propertyTitle: property?.title || '',
      scheduleId: scheduleId ? String(scheduleId) : '',
      installmentNumber: installmentNumber ? String(installmentNumber) : '',
      autopayOptIn: autopayOptIn ? 'true' : 'false',
      downPaymentPercent: financingDetails?.downPaymentPercent ? String(financingDetails.downPaymentPercent) : '',
      loanTenureMonths: financingDetails?.tenureMonths ? String(financingDetails.tenureMonths) : '',
    },
  };

  // If recurring autopay is opted in, collect future usage mandate for recurring charges
  if (autopayOptIn) {
    sessionPayload.payment_intent_data = {
      setup_future_usage: 'off_session',
      metadata: sessionPayload.metadata,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionPayload);
  return {
    sessionId: session.id,
    sessionUrl: session.url,
  };
}

/**
 * Retrieve Session details from Stripe with expanded payment method
 */
async function retrieveSession(sessionId) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'payment_intent.payment_method', 'customer'],
  });
  return session;
}

/**
 * Verify Webhook Event signature using raw request buffer
 */
function verifyWebhookSignature(rawBody, signature) {
  const stripe = getStripeClient();
  if (!config.stripe.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured on server.');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

/**
 * Charge Off-Session Installment (Recurring Autopay)
 */
async function chargeOffSession({ customerId, paymentMethodId, amount, description, metadata }) {
  const stripe = getStripeClient();
  const amountInPaise = Math.round(Number(amount) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInPaise,
    currency: config.stripe.currency,
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    description: description || 'Porch Light Scheduled Obligation',
    metadata: metadata || {},
  });

  return paymentIntent;
}

module.exports = {
  getStripeClient,
  getOrCreateCustomer,
  createCheckoutSession,
  retrieveSession,
  verifyWebhookSignature,
  chargeOffSession,
};

