import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getSessionStatus } from '@/services/payments';
import { generatePaymentReceiptPDF } from '@/services/documents';
import { ReceiptPrinter } from '@/components/payment/ReceiptPrinter';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { formatPaymentDate } from '@/lib/formatDate';
import {
  Download,
  ArrowRight,
  Home,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [stage, setStage] = useState('processing'); // 'processing' | 'printing' | 'complete'
  const [payment, setPayment] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError('No Stripe session reference was provided. Please return to your dashboard.');
      return;
    }

    let isMounted = true;
    let timer = null;

    const checkStatus = async () => {
      try {
        const res = await getSessionStatus(sessionId);
        if (!isMounted) return;

        const status = res?.status || res?.data?.status;
        const confirmedPayment = res?.payment || res?.data?.payment;
        const confirmedSchedule = res?.schedule || res?.data?.schedule;

        if (status === 'completed') {
          setPayment(confirmedPayment);
          setSchedule(confirmedSchedule);

          // Advance to printing phase
          setStage('printing');

          // After paper feeds through, mark complete
          setTimeout(() => {
            if (isMounted) {
              setStage('complete');
              toast.success('Transaction receipt generated.');
            }
          }, 2200);
        } else {
          // Continue polling if pending
          if (pollCount < 15) {
            timer = setTimeout(() => {
              setPollCount((prev) => prev + 1);
            }, 1800);
          } else {
            setError(
              'Payment verification is taking longer than expected. Your card may have been authorized; check your payments history in a few moments.'
            );
          }
        }
      } catch (err) {
        if (!isMounted) return;
        if (pollCount < 5) {
          timer = setTimeout(() => {
            setPollCount((prev) => prev + 1);
          }, 2000);
        } else {
          setError(err.message || 'Unable to verify payment status with server.');
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, pollCount]);

  const handleDownloadPDF = () => {
    if (!payment) return;
    try {
      generatePaymentReceiptPDF(payment);
      toast.success('Official PDF receipt downloaded');
    } catch (err) {
      toast.error('Could not generate PDF receipt.');
    }
  };

  const formatPaymentType = (type) => {
    switch (type) {
      case 'full_purchase':
        return 'Full Residence Acquisition';
      case 'emi_down_payment':
        return 'EMI Down Payment & Agreement';
      case 'emi_installment':
        return `EMI Installment #${payment?.installmentNumber || ''}`;
      case 'rent_deposit':
        return 'Lease Move-in Deposit & Advance';
      case 'rent_installment':
        return `Monthly Rent #${payment?.installmentNumber || ''}`;
      case 'promotion_fee':
        return 'Premium Listing Designation Upgrade';
      default:
        return 'Residential Transaction';
    }
  };

  if (error && !payment) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#26262B] text-[#F1ECE3] rounded-2xl p-8 border border-white/10 shadow-xl text-center">
          <div className="size-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="font-serif text-2xl text-sand mb-2">Verification Notice</h2>
          <p className="font-sans text-xs text-sand/70 mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setError(null);
                setPollCount(0);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sand/30 text-sand hover:bg-sand/10 text-xs font-mono transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Check Again
            </button>
            <Link
              to="/dashboard/payments"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-sand text-charcoal hover:bg-white text-xs font-mono font-medium transition-colors"
            >
              My Payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPromotion = payment?.type === 'promotion_fee';

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex flex-col items-center">
      {/* Title Header */}
      <div className="text-center mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-700 mb-1">
          Stripe Payment Verified
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
          {stage === 'complete' ? 'Transaction Confirmed' : 'Processing Order'}
        </h1>
        <p className="font-sans text-xs sm:text-sm text-dark-gray/70 mt-1 max-w-md mx-auto">
          {stage === 'complete'
            ? 'Your payment was authorized and settled through Stripe. Below is your official Porch Light transaction receipt.'
            : 'Please keep this window open while we secure the backend transaction state.'}
        </p>
      </div>

      {/* Tactile Receipt Printer */}
      <ReceiptPrinter.Root stage={stage} feedMotion="stepped" className="w-full max-w-sm mb-6">
        <ReceiptPrinter.Machine>
          <ReceiptPrinter.Header>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-sand/70">
                Porch Light Terminal
              </span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-sand/60 hover:text-sand transition-colors"
            >
              <Home className="size-3" />
              Home
            </Link>
          </ReceiptPrinter.Header>

          <ReceiptPrinter.Screen>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-base text-sand truncate">
                    {payment?.propertyTitle || 'Residential Sanctuary'}
                  </p>
                  <p className="font-mono text-[11px] text-sand/60 truncate">
                    {payment?.propertySnapshot?.city || formatPaymentType(payment?.type)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-semibold text-sand">
                    <RupeeSymbol className="mr-0.5 text-xs text-amber-300" />
                    {formatINR(payment?.amount || 0, { withSymbol: false })}
                  </p>
                  {payment?.autopayEnabled && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300">
                      Autopay Opted
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <ReceiptPrinter.Status />
              </div>
            </div>
          </ReceiptPrinter.Screen>
        </ReceiptPrinter.Machine>

        <ReceiptPrinter.Output>
          <ReceiptPrinter.Paper>
            <div className="space-y-3 text-[11px] leading-relaxed">
              {/* Paper Header */}
              <div className="text-center border-b border-dashed border-charcoal/20 pb-3">
                <p className="font-serif text-lg tracking-wide text-charcoal font-semibold">
                  PORCH LIGHT
                </p>
                <p className="text-[10px] text-charcoal/60 uppercase tracking-widest">
                  Architectural Residences
                </p>
                <p className="text-[9px] text-charcoal/50 mt-0.5">Stripe Test Payment Receipt</p>
              </div>

              {/* Transaction identifiers */}
              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-charcoal/60">Receipt:</span>
                  <span className="font-semibold text-charcoal">
                    {payment?.receiptNumber || 'REC-PENDING'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal/60">Trans ID:</span>
                  <span className="text-charcoal">{payment?.customId || payment?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal/60">Date:</span>
                  <span className="text-charcoal">
                    {formatPaymentDate(payment, { includeTime: true })}
                  </span>
                </div>
              </div>

              <hr className="border-t border-dashed border-charcoal/20" />

              {/* Items summary */}
              <div className="space-y-1.5">
                <div>
                  <p className="font-semibold text-charcoal text-xs">
                    {payment?.propertyTitle || 'Residence'}
                  </p>
                  <p className="text-[10px] text-charcoal/60">{formatPaymentType(payment?.type)}</p>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-charcoal/70">Payment Method:</span>
                  <span className="font-mono text-charcoal">
                    {payment?.method || 'Stripe Card (Test)'}
                  </span>
                </div>

                {payment?.autopayEnabled && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200/60 text-[10px] text-amber-900 leading-tight">
                    <strong>Autopay Registered:</strong> Monthly scheduled obligations will be
                    automatically processed on the due date.
                  </div>
                )}
              </div>

              <hr className="border-t border-dashed border-charcoal/20" />

              {/* Total Row */}
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-xs uppercase text-charcoal">Total Paid:</span>
                <span className="font-mono text-sm font-bold text-charcoal">
                  <RupeeSymbol className="mr-0.5 text-xs" />
                  {formatINR(payment?.amount || 0, { withSymbol: false })}
                </span>
              </div>

              {/* Footer notice */}
              <div className="pt-2 text-center text-[9px] text-charcoal/50 border-t border-dashed border-charcoal/20">
                <p>Porch Light Real Estate Technologies India</p>
                <p className="mt-0.5">Thank you for leaving the light on for home.</p>
              </div>
            </div>
          </ReceiptPrinter.Paper>
        </ReceiptPrinter.Output>
      </ReceiptPrinter.Root>

      {/* Action Controls */}
      <div className="w-full max-w-sm flex flex-col gap-2.5 pt-2">
        <button
          onClick={handleDownloadPDF}
          disabled={!payment || stage !== 'complete'}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-charcoal text-sand hover:bg-black font-mono text-xs font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="size-4" />
          Download Official Receipt (PDF)
        </button>

        {isPromotion ? (
          <button
            onClick={() => navigate(`/agent/properties/${payment.propertyId}`)}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-sand/40 font-mono text-xs transition-colors"
          >
            <span>Return to Property Management</span>
            <ArrowRight className="size-3.5" />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/dashboard/properties')}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-sand/40 font-mono text-xs transition-colors"
            >
              <span>My Residences</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/payments')}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-sand/40 font-mono text-xs transition-colors"
            >
              <span>View Payments</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentSuccessPage;

