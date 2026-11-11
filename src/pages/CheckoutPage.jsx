import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import * as propertyService from '@/services/properties';
import * as paymentService from '@/services/payments';
import { submitAgentRating, getRatingForTransaction } from '@/services/ratings';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { SmartImage } from '@/components/media/SmartImage';
import { Button } from '@/components/ui/Button';
import {
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronLeft,
  Lock,
  Download,
  Info,
  Star,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculator carried values from location.state (if navigated from calculator)
  const calcState = location.state || {};
  const isRent = property?.listingType === 'rent';

  // Buy payment plan: 'full' | 'loan_plan'
  const [buyPlan, setBuyPlan] = useState(() => {
    if (location.state?.fromLoanCalculator || location.state?.loanTermMonths) {
      return 'loan_plan';
    }
    return 'full';
  });

  // Interactive loan plan adjustments (minDown - 80% down payment, 12 - 360 months tenure)
  const minDown = Number(property?.minDownPaymentPercent) || 20;
  const [downPaymentPercent, setDownPaymentPercent] = useState(() => {
    return Math.min(80, Math.max(minDown, Number(location.state?.downPaymentPercent) || minDown));
  });
  const [loanTenureMonths, setLoanTenureMonths] = useState(() => {
    return Math.min(360, Math.max(12, Number(location.state?.loanTermMonths) || 240));
  });

  // Autopay recurring opt-in state
  const [autopayOptIn, setAutopayOptIn] = useState(false);

  // Simulated processing & completed state
  const [processing, setProcessing] = useState(false);
  const [completedPayment, setCompletedPayment] = useState(null);

  // Star-only agent rating prompt state
  const [ratingPromptDismissed, setRatingPromptDismissed] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Dev toggle
  const [forceFail, setForceFail] = useState(paymentService.getForcePaymentFailure());

  // Form fields
  const [upiId, setUpiId] = useState('user@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Aarav Sharma');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('•••');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  useEffect(() => {
    let active = true;
    setLoading(true);
    propertyService
      .getPropertyById(id)
      .then((p) => {
        if (!active) return;
        setProperty(p);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Property not found');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleDevFailToggle = (e) => {
    const val = e.target.checked;
    setForceFail(val);
    paymentService.setForcePaymentFailure(val);
    toast(val ? 'Dev force failure enabled' : 'Dev force failure disabled', {
      icon: val ? '⚠️' : '✅',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center font-mono text-xs text-dark-gray/60">
        Preparing secure escrow session...
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h2 className="font-serif text-2xl text-charcoal mb-2">Checkout Unavailable</h2>
        <p className="font-mono text-xs text-dark-gray/60 mb-6">{error || 'Invalid property reference'}</p>
        <Link to="/buy">
          <Button variant="dark">Browse Properties</Button>
        </Link>
      </div>
    );
  }

  const isSold = property.isSold || property.status === 'sold' || property.availabilityStatus === 'sold';
  if (isSold) {
    const isMyAcquisition = Boolean(user && property.buyerId && (user.customId === property.buyerId || user.id === property.buyerId || user._id === property.buyerId));
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h2 className="font-serif text-2xl text-charcoal mb-2">
          {isMyAcquisition ? 'Residence Already Acquired by You' : 'Residence Already Acquired'}
        </h2>
        <p className="font-mono text-xs text-dark-gray/60 mb-6">
          {isMyAcquisition
            ? 'You have already finalized the acquisition of this residence. You can view your ownership details in your buyer dashboard.'
            : 'This property has already been acquired through a completed transaction and is no longer available for purchase.'}
        </p>
        <Link to={isMyAcquisition ? '/dashboard/properties' : '/buy'}>
          <Button variant="dark">{isMyAcquisition ? 'View My Acquisitions' : 'Browse Available Residences'}</Button>
        </Link>
      </div>
    );
  }

  const isActivelyLeased = isRent && (property.isLeased || property.status === 'rented') && (!property.leaseEndDate || new Date(property.leaseEndDate) > new Date());
  if (isActivelyLeased) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h2 className="font-serif text-2xl text-charcoal mb-2">Residence Currently Leased</h2>
        <p className="font-mono text-xs text-dark-gray/60 mb-6">
          This rental sanctuary is currently under an active lease and is unavailable for new lease agreements.
        </p>
        <Link to="/rent">
          <Button variant="dark">Browse Available Rentals</Button>
        </Link>
      </div>
    );
  }

  // Financial Breakdown calculations
  const tokenAdvanceAmount = property.tokenAmount || 100000; // standard 1 Lakh priority token
  const securityDeposit = property.deposit || 0;
  const monthlyRent = property.price || 0;
  const platformFee = 999;

  // Live Home Loan / EMI calculations based on interactive checkout sliders
  const BENCHMARK_RATE = 8.5; // p.a. platform benchmark estimate
  const salePrice = Number(property.price) || 0;
  const downPaymentAmount = Math.round((salePrice * downPaymentPercent) / 100);
  const loanPrincipal = Math.max(0, salePrice - downPaymentAmount);
  const monthlyRate = (BENCHMARK_RATE / 12) / 100;
  const estimatedEMI = loanPrincipal > 0 && loanTenureMonths > 0
    ? Math.round((loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, loanTenureMonths)) / (Math.pow(1 + monthlyRate, loanTenureMonths) - 1))
    : 0;
  const totalRepayment = estimatedEMI * loanTenureMonths;
  const totalInterest = Math.max(0, totalRepayment - loanPrincipal);

  // Determine amount due today based on type & plan
  let amountDueToday = 0;
  let paymentType = 'full_purchase';

  if (isRent) {
    amountDueToday = securityDeposit + monthlyRent + platformFee;
    paymentType = 'rent_deposit';
  } else {
    if (buyPlan === 'loan_plan') {
      amountDueToday = downPaymentAmount;
      paymentType = 'emi_down_payment';
    } else {
      amountDueToday = salePrice;
      paymentType = 'full_purchase';
    }
  }

  const handleExecutePayment = async (e) => {
    e.preventDefault();
    if (processing) return;

    setProcessing(true);

    try {
      const financingDetails =
        !isRent && buyPlan === 'loan_plan'
          ? {
              planType: 'emi_down_payment',
              downPayment: downPaymentAmount,
              downPaymentPercent,
              loanAmount: loanPrincipal,
              tenureMonths: loanTenureMonths,
              interestRate: BENCHMARK_RATE,
              monthlyEmi: estimatedEMI,
              totalInterest,
              totalRepayment,
            }
          : !isRent && buyPlan === 'full'
          ? {
              planType: 'full',
              downPayment: salePrice,
              downPaymentPercent: 100,
              loanAmount: 0,
              tenureMonths: 0,
              interestRate: 0,
              monthlyEmi: 0,
              totalInterest: 0,
              totalRepayment: salePrice,
            }
          : null;

      const res = await paymentService.createCheckoutSession({
        propertyId: property.id,
        type: paymentType,
        financingDetails,
        autopayOptIn: (isRent || buyPlan === 'loan_plan') && autopayOptIn,
      });

      const checkoutUrl = res?.sessionUrl || res?.data?.sessionUrl;
      if (checkoutUrl) {
        toast.loading('Redirecting to Stripe Test Checkout...');
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to obtain Stripe checkout URL from server.');
      }
    } catch (err) {
      toast.error(err.message || 'Payment initiation failed');
      setProcessing(false);
    }
  };

  const handleSubmitCheckoutRating = async () => {
    if (!completedPayment || ratingValue === 0) return;
    setSubmittingRating(true);
    try {
      await submitAgentRating({
        transactionId: completedPayment.id,
        propertyId: property.id,
        rating: ratingValue,
        userId: user?.id,
      });
      setRatingSaved(true);
      toast.success('Agent rating submitted');
    } catch (err) {
      toast.error(err?.message || 'Failed to save rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!completedPayment) return;
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('PORCH LIGHT', 20, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Architectural Residences & Sanctuaries • India', 20, 32);
      doc.text('DEMO SIMULATION RECEIPT — NOT A LEGAL TITLE DEED', 20, 38);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 42, 190, 42);

      doc.setFontSize(12);
      doc.text(`Receipt Number: ${completedPayment.receiptNumber}`, 20, 52);
      doc.text(`Transaction ID: ${completedPayment.id}`, 20, 60);
      doc.text(`Date & Time: ${new Date(completedPayment.timestamp).toLocaleString('en-IN')}`, 20, 68);

      doc.text(`Customer Name: ${completedPayment.userName}`, 20, 80);
      doc.text(`Property: ${property.title}`, 20, 88);
      doc.text(`Location: ${property.locality}, ${property.city}`, 20, 96);
      doc.text(`RERA ID: ${property.reraId || 'Verified Project'}`, 20, 104);

      doc.line(20, 112, 190, 112);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Summary', 20, 122);
      doc.setFont('helvetica', 'normal');
      doc.text(`Type: ${isRent ? 'Rental Move-in Deposit & Advance' : buyPlan === 'full' ? 'Full Purchase Valuation' : 'Priority Token Reservation'}`, 20, 132);
      doc.text(`Method: ${completedPayment.method}`, 20, 140);
      doc.text(`Total Amount Paid: Rs ${completedPayment.amount.toLocaleString('en-IN')}`, 20, 148);

      let nextY = 170;
      if (completedPayment.financingDetails) {
        doc.text(`Financing: Loan / EMI (${completedPayment.financingDetails.tenureMonths} Mos @ ${completedPayment.financingDetails.interestRate || 8.5}% p.a.)`, 20, 156);
        doc.text(`Planned Down Payment: Rs ${completedPayment.financingDetails.downPayment?.toLocaleString('en-IN')} (${completedPayment.financingDetails.downPaymentPercent}%)`, 20, 162);
        doc.text(`Indicative EMI: Rs ${completedPayment.financingDetails.monthlyEmi?.toLocaleString('en-IN')}/mo`, 20, 168);
        nextY = 184;
      }

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Disclaimer: This receipt is generated by the Porch Light demo simulation environment.',
        20,
        nextY
      );
      doc.text(
        'No real funds were transferred, and no real estate ownership or lease contract has taken legal effect.',
        20,
        nextY + 6
      );

      doc.save(`${completedPayment.receiptNumber}.pdf`);
      toast.success('Receipt PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF receipt');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(`/property/${property.id || property.customId}`)}
          className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-medium text-dark-gray hover:text-deep-purple bg-porcelain border border-dark-gray/25 px-3.5 py-1.5 rounded-xl transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to Property</span>
        </button>

        <div className="flex items-center gap-2 font-mono text-xs text-dark-gray/60">
          <Lock className="w-3.5 h-3.5 text-emerald-700" />
          <span>256-Bit Escrow Simulator</span>
        </div>
      </div>

      {/* Demo Simulation Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-sand/60 border border-dark-gray/15 flex items-start gap-3">
        <Info className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
        <div className="font-mono text-xs text-dark-gray/80 leading-relaxed">
          <span className="font-bold uppercase tracking-wider text-charcoal">Demo Mode Active: </span>
          All checkout transactions on Porch Light are simulated. No real money is charged, no real loan is issued, and no real property ownership or tenancy is transferred.
        </div>
      </div>

      {completedPayment ? (
        /* COMPLETED SUCCESS CARD */
        <div className="bg-porcelain border border-dark-gray/20 rounded-3xl p-6 sm:p-10 shadow-xl max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-emerald-800 font-bold mb-1">
              Reservation Confirmed
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple">
              {isRent ? 'Lease Reservation Placed' : buyPlan === 'full' ? 'Acquisition Valuation Paid' : 'EMI Down Payment Paid'}
            </h1>
            <p className="font-sans text-sm text-dark-gray/70 mt-1 max-w-md mx-auto">
              Your simulated transaction has been processed. The property has been queued for agent follow-up.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-dark-gray/15 text-left font-mono text-xs sm:text-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-dark-gray/10">
              <span className="text-dark-gray/60">Transaction ID:</span>
              <span className="font-bold text-charcoal">{completedPayment.id}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-dark-gray/10">
              <span className="text-dark-gray/60">Receipt Number:</span>
              <span className="font-bold text-charcoal">{completedPayment.receiptNumber}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-dark-gray/10">
              <span className="text-dark-gray/60">Sanctuary:</span>
              <span className="font-medium text-deep-purple truncate max-w-[240px]">
                {property.title}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-dark-gray/10">
              <span className="text-dark-gray/60">Amount Paid (Demo):</span>
              <span className="font-medium text-charcoal text-base flex items-center">
                <RupeeSymbol className="mr-0.5" />
                <span>{completedPayment.amount.toLocaleString('en-IN')}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-gray/60">Method:</span>
              <span className="font-medium text-charcoal">{completedPayment.method}</span>
            </div>
          </div>

          {completedPayment.financingDetails && (
            <div className="p-4 rounded-2xl bg-sand/30 border border-dark-gray/15 text-left font-mono text-xs space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-deep-purple font-semibold">
                Financing Structure Recorded
              </div>
              <div className="flex justify-between text-dark-gray/70">
                <span>Planned Down Payment:</span>
                <span className="font-medium text-charcoal">₹{formatINR(completedPayment.financingDetails.downPayment)} ({completedPayment.financingDetails.downPaymentPercent}%)</span>
              </div>
              <div className="flex justify-between text-dark-gray/70">
                <span>Financed Principal:</span>
                <span className="font-medium text-charcoal">₹{formatINR(completedPayment.financingDetails.loanAmount)}</span>
              </div>
              <div className="flex justify-between text-dark-gray/70">
                <span>Tenure & Benchmark Rate:</span>
                <span className="font-medium text-charcoal">{completedPayment.financingDetails.tenureMonths} Months ({completedPayment.financingDetails.tenureYears} Years) @ {completedPayment.financingDetails.interestRate || 8.5}% p.a.</span>
              </div>
              <div className="flex justify-between text-deep-purple font-bold pt-1.5 border-t border-dark-gray/10">
                <span>Indicative Monthly EMI:</span>
                <span>₹{completedPayment.financingDetails.monthlyEmi?.toLocaleString('en-IN')} /mo</span>
              </div>
            </div>
          )}

          {/* Small Themed Star-Only Agent Rating Prompt */}
          {!ratingPromptDismissed && !ratingSaved && (
            <div className="p-4 rounded-2xl bg-sand/40 border border-charcoal/15 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-charcoal/70">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Rate your experience with {property?.agent?.name || 'your agent'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRatingPromptDismissed(true)}
                  className="text-[11px] font-mono text-charcoal/50 hover:text-charcoal hover:underline"
                >
                  Rate later
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rate Agent">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (ratingHover || ratingValue);
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={ratingValue === star}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => setRatingValue(star)}
                        className="p-1 rounded-lg hover:bg-amber-500/10 transition-transform active:scale-95"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                              : 'text-charcoal/25 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  {ratingValue > 0 && (
                    <span className="font-mono text-xs text-charcoal/70 ml-2">
                      {ratingValue} ★
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  disabled={ratingValue === 0 || submittingRating}
                  onClick={handleSubmitCheckoutRating}
                  className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider shrink-0"
                >
                  {submittingRating ? 'Saving...' : 'Submit Rating'}
                </Button>
              </div>
            </div>
          )}

          {ratingSaved && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Thank you! Your rating of {ratingValue} ★ for {property?.agent?.name || 'your agent'} has been recorded.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="dark"
              onClick={handleDownloadReceipt}
              className="flex-1 py-3 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt PDF</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/property/${property.id || property.customId}`)}
              className="flex-1 py-3 text-xs font-mono uppercase tracking-wider"
            >
              Back to Property
            </Button>
          </div>
        </div>
      ) : (
        /* MAIN CHECKOUT FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Plan Selection & Payment Method */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Buy Payment Plan Choice (Sale Only) */}
            {!isRent && (
              <div className="p-6 rounded-3xl bg-porcelain border border-dark-gray/15 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-deep-purple font-medium">
                    1. Select Acquisition Plan
                  </h3>
                  <span className="font-mono text-xs text-dark-gray/60 font-normal">Ownership Options</span>
                </div>

                <div className="space-y-3 font-sans">
                  {/* Option A: Full Purchase Valuation */}
                  <label
                    className={`block p-4 rounded-2xl border transition-all cursor-pointer ${
                      buyPlan === 'full'
                        ? 'border-deep-purple bg-sand/30 shadow-xs'
                        : 'border-dark-gray/20 hover:border-dark-gray/40 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="buyPlan"
                          value="full"
                          checked={buyPlan === 'full'}
                          onChange={() => setBuyPlan('full')}
                          className="mt-1 accent-deep-purple"
                        />
                        <div>
                          <div className="font-serif text-base font-medium text-charcoal">
                            Full Purchase Valuation (Simulated)
                          </div>
                          <p className="font-mono text-xs text-dark-gray/70 mt-0.5 font-normal">
                            Full consideration settled upfront. The sanctuary transfers atomically upon payment.
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-medium text-deep-purple">
                          {formatINR(property.price, { withSymbol: true, short: true })}
                        </div>
                        <div className="font-mono text-[10px] text-dark-gray/50">Full amount due today</div>
                      </div>
                    </div>
                  </label>

                  {/* Option B: Home Loan / EMI Financing Plan */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      buyPlan === 'loan_plan'
                        ? 'border-deep-purple bg-sand/30 shadow-xs'
                        : 'border-dark-gray/20 hover:border-dark-gray/40 bg-white'
                    }`}
                  >
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setBuyPlan('loan_plan')}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="buyPlan"
                          value="loan_plan"
                          checked={buyPlan === 'loan_plan'}
                          onChange={() => setBuyPlan('loan_plan')}
                          className="mt-1 accent-deep-purple cursor-pointer"
                        />
                        <div>
                          <div className="font-serif text-base font-medium text-charcoal">
                            Home Loan / EMI Financing Plan
                          </div>
                          <p className="font-mono text-xs text-dark-gray/70 mt-0.5 font-normal">
                            Pay down payment today to acquire the property with structured monthly financing installments.
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-medium text-deep-purple flex items-center justify-end">
                          <RupeeSymbol className="mr-0.5" />
                          <span>{downPaymentAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="font-mono text-[10px] text-dark-gray/50">Down payment due today</div>
                      </div>
                    </div>

                    {buyPlan === 'loan_plan' && (
                      <div className="mt-4 pt-4 border-t border-dark-gray/15 space-y-4 bg-porcelain-tint p-4 rounded-2xl">
                        {/* Down Payment Slider & Presets */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                            <span className="text-dark-gray/70">Down Payment ({downPaymentPercent}%):</span>
                            <span className="font-semibold text-deep-purple">
                              ₹{formatINR(downPaymentAmount)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="80"
                            step="5"
                            value={downPaymentPercent}
                            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                            className="w-full accent-deep-purple cursor-pointer"
                          />
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {[10, 20, 30, 40, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDownPaymentPercent(pct);
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                                  downPaymentPercent === pct
                                    ? 'bg-deep-purple text-white border-deep-purple'
                                    : 'bg-white text-dark-gray/70 border-dark-gray/20 hover:border-dark-gray/40'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tenure Slider & Presets */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                            <span className="text-dark-gray/70">
                              Tenure ({loanTenureMonths} Mos / {Math.round(loanTenureMonths / 12)} Yrs):
                            </span>
                            <span className="font-semibold text-charcoal">
                              {Math.round(loanTenureMonths / 12)} Years
                            </span>
                          </div>
                          <input
                            type="range"
                            min="12"
                            max="360"
                            step="12"
                            value={loanTenureMonths}
                            onChange={(e) => setLoanTenureMonths(Number(e.target.value))}
                            className="w-full accent-deep-purple cursor-pointer"
                          />
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {[
                              { label: '5Y', months: 60 },
                              { label: '10Y', months: 120 },
                              { label: '15Y', months: 180 },
                              { label: '20Y', months: 240 },
                              { label: '25Y', months: 300 },
                              { label: '30Y', months: 360 },
                            ].map((preset) => (
                              <button
                                key={preset.months}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLoanTenureMonths(preset.months);
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                                  loanTenureMonths === preset.months
                                    ? 'bg-deep-purple text-white border-deep-purple'
                                    : 'bg-white text-dark-gray/70 border-dark-gray/20 hover:border-dark-gray/40'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Recalculated Financial Breakdown */}
                        <div className="p-3.5 rounded-xl bg-white/80 border border-dark-gray/10 space-y-2 font-mono text-xs">
                          <div className="flex justify-between text-dark-gray/70">
                            <span>Purchase Valuation:</span>
                            <span className="font-medium text-charcoal">
                              {formatINR(salePrice, { withSymbol: true })}
                            </span>
                          </div>
                          <div className="flex justify-between text-dark-gray/70">
                            <span>Planned Down Payment ({downPaymentPercent}%):</span>
                            <span className="text-charcoal font-medium">₹{formatINR(downPaymentAmount)}</span>
                          </div>
                          <div className="flex justify-between text-dark-gray/70">
                            <span>Financed Loan Principal:</span>
                            <span className="text-charcoal font-medium">₹{formatINR(loanPrincipal)}</span>
                          </div>
                          <div className="flex justify-between text-dark-gray/70">
                            <span>Benchmark Interest Rate:</span>
                            <span className="text-emerald-800 font-medium">{BENCHMARK_RATE}% p.a. (Estimate)</span>
                          </div>
                          <div className="flex justify-between text-deep-purple font-bold pt-1.5 border-t border-dark-gray/10 text-sm">
                            <span>Estimated Monthly Installment:</span>
                            <span className="flex items-center">
                              <RupeeSymbol className="mr-0.5" />
                              {estimatedEMI.toLocaleString('en-IN')} /mo
                            </span>
                          </div>
                          <div className="flex justify-between text-dark-gray/60 text-[11px]">
                            <span>Total Interest:</span>
                            <span>₹{formatINR(totalInterest)}</span>
                          </div>
                          <div className="flex justify-between text-dark-gray/60 text-[11px]">
                            <span>Total Repayment:</span>
                            <span>₹{formatINR(totalRepayment)}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-dark-gray/60 leading-relaxed font-mono">
                          Platform Notice: Estimates are computed with Porch Light's platform benchmark rate (8.5% p.a.) for planning. In this purchase flow, the down payment (₹{downPaymentAmount.toLocaleString('en-IN')}) is settled today in simulated escrow to atomically acquire the residence and initiate financing terms. Porch Light is not a banking institution and will not deduct monthly loan installments.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Autopay Enrollment (For Recurring EMI or Rent Plans) */}
            {(isRent || buyPlan === 'loan_plan') && (
              <div className="p-6 rounded-3xl bg-porcelain border border-dark-gray/15 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-deep-purple font-medium">
                      Automatic Monthly Deductions
                    </h3>
                    <p className="font-mono text-xs text-dark-gray/60 mt-0.5">
                      Optional RBI-compliant recurring card mandate via Stripe
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    Autopay
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-dark-gray/15 space-y-3 font-mono text-xs">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autopayOptIn}
                      onChange={(e) => setAutopayOptIn(e.target.checked)}
                      className="mt-1 size-4 accent-deep-purple rounded cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="font-semibold text-charcoal text-xs block">
                        Enroll in monthly Autopay for {isRent ? 'monthly rent' : 'EMI installments'}
                      </span>
                      <p className="text-[11px] text-dark-gray/70 leading-relaxed font-sans">
                        Automatically deducts{' '}
                        <strong>
                          ₹{isRent ? monthlyRent.toLocaleString('en-IN') : estimatedEMI.toLocaleString('en-IN')}
                        </strong>{' '}
                        on the scheduled monthly due date.
                        {isRent
                          ? ' Deductions automatically stop when your residential lease ends.'
                          : ` Finite term: exactly ${loanTenureMonths} scheduled monthly installments.`}
                      </p>
                    </div>
                  </label>

                  {autopayOptIn && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 space-y-1.5 font-sans leading-relaxed">
                      <p className="font-semibold font-mono text-xs text-amber-900">
                        Mandate & Consent Notice:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-dark-gray/80">
                        <li>Card credentials are tokenized directly with Stripe. Porch Light never stores raw card data.</li>
                        <li>An in-app notification and email reminder will be dispatched before each monthly debit.</li>
                        <li>If required by your issuing bank, a 3D Secure verification link will be provided.</li>
                        <li>You may pause or revoke Autopay at any time from your User Payments dashboard.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Secure Stripe Checkout Gateway */}
            <div className="p-6 rounded-3xl bg-porcelain border border-dark-gray/15 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Payment Gateway
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                  Stripe Test Mode
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-dark-gray/15 space-y-3 font-sans text-xs text-dark-gray/80">
                <p className="leading-relaxed">
                  You will complete this transaction in Stripe's hosted Checkout interface.
                  All payments in this environment run in <strong>Stripe Test Mode</strong> with INR currency.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-sand/30 border border-dark-gray/10 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-700 shrink-0" />
                    <span>3D Secure 2.0 Ready</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sand/30 border border-dark-gray/10 flex items-center gap-2">
                    <Lock className="size-4 text-deep-purple shrink-0" />
                    <span>256-Bit Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-porcelain border border-dark-gray/15 shadow-xs space-y-5">
              <h3 className="font-serif text-xl text-deep-purple font-bold">
                Order & Escrow Summary
              </h3>

              {/* Property mini-card */}
              <div className="flex gap-3.5 pb-4 border-b border-dark-gray/15">
                <div className="w-16 h-14 rounded-xl overflow-hidden bg-sand shrink-0 border border-dark-gray/15">
                  <SmartImage
                    src={property.coverImage}
                    alt={property.title}
                    aspect="listing"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-base font-bold text-charcoal truncate">
                    {property.title}
                  </div>
                  <div className="font-mono text-xs text-dark-gray/60 truncate">
                    {property.locality}, {property.city}
                  </div>
                  <div className="font-mono text-[11px] text-emerald-800 mt-0.5">
                    RERA: {property.reraId || 'Verified'}
                  </div>
                </div>
              </div>

              {/* Breakdown lines */}
              <div className="space-y-2.5 font-mono text-xs">
                {isRent ? (
                  <>
                    <div className="flex justify-between text-dark-gray/80">
                      <span>Refundable Security Deposit:</span>
                      <span className="font-medium text-charcoal">
                        {securityDeposit > 0 ? formatINR(securityDeposit, { withSymbol: true }) : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between text-dark-gray/80">
                      <span>First Month's Rent:</span>
                      <span className="font-medium text-charcoal">
                        {formatINR(monthlyRent, { withSymbol: true })}
                      </span>
                    </div>
                    <div className="flex justify-between text-dark-gray/80">
                      <span>Platform Verification & Onboarding:</span>
                      <span className="font-medium text-charcoal flex items-center">
                        <RupeeSymbol className="mr-0.5" />
                        <span>{platformFee.toLocaleString('en-IN')}</span>
                      </span>
                    </div>

                    {calcState.utilitiesEst && (
                      <div className="pt-2 border-t border-dark-gray/10 text-[11px] text-dark-gray/60">
                        <span className="font-medium text-charcoal">Reference Note: </span>
                        Your estimated utility budget of Rs {calcState.utilitiesEst.toLocaleString('en-IN')}/mo is for your personal planning and is not charged today.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-dark-gray/80">
                      <span>Property Valuation:</span>
                      <span className="font-medium text-charcoal">
                        {formatINR(property.price, { withSymbol: true })}
                      </span>
                    </div>
                    <div className="flex justify-between text-dark-gray/80">
                      <span>Selected Plan:</span>
                      <span className="font-medium text-charcoal uppercase">
                        {buyPlan === 'loan_plan' ? 'EMI Financing with Down Payment' : 'Full Valuation Outright'}
                      </span>
                    </div>
                    {buyPlan === 'loan_plan' && (
                      <div className="p-3 rounded-xl bg-sand/30 border border-dark-gray/10 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-dark-gray/70">
                          <span>Loan Principal:</span>
                          <span className="text-charcoal font-medium">₹{formatINR(loanPrincipal)}</span>
                        </div>
                        <div className="flex justify-between text-dark-gray/70">
                          <span>Indicative Monthly EMI:</span>
                          <span className="text-deep-purple font-bold">₹{estimatedEMI.toLocaleString('en-IN')}/mo</span>
                        </div>
                        <div className="flex justify-between text-dark-gray/60 text-[10px]">
                          <span>Benchmark Rate:</span>
                          <span>{BENCHMARK_RATE}% p.a. • {loanTenureMonths} mos</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-dark-gray/80">
                      <span>Escrow Processing Fee:</span>
                      <span className="text-emerald-800 font-medium">Included (No Fee)</span>
                    </div>
                  </>
                )}

                {/* Total Line */}
                <div className="pt-3 border-t border-dark-gray/15 flex justify-between items-baseline">
                  <span className="font-medium text-charcoal text-sm">Total Due Today:</span>
                  <div className="text-right">
                    <div className="font-serif text-3xl font-medium text-deep-purple leading-none flex items-baseline justify-end">
                      <RupeeSymbol className="mr-1 text-2xl align-baseline" />
                      <span>{amountDueToday.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="font-mono text-[10px] text-dark-gray/50 mt-0.5">Stripe Test Checkout</div>
                  </div>
                </div>
              </div>

              {/* Submit Payment Button */}
              <Button
                type="button"
                variant="dark"
                onClick={handleExecutePayment}
                disabled={processing}
                className="w-full py-4 text-xs font-mono uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Lock className="size-3.5" />
                {processing
                  ? 'Connecting to Stripe...'
                  : `Proceed to Stripe Checkout (₹${amountDueToday.toLocaleString('en-IN')})`}
              </Button>

              <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-dark-gray/60 text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Stripe Test Mode • Safe Card Simulation</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
