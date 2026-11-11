import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { RotateCcw, ArrowLeft, ShieldAlert, Home, Building2, CreditCard } from 'lucide-react';
import { cancelCheckoutSession } from '@/services/payments';
import { getPropertyById } from '@/services/properties';
import { useAuth } from '@/features/auth/AuthContext';

export function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const propertyId = searchParams.get('property_id');
  const sessionId = searchParams.get('session_id');
  const purpose = searchParams.get('purpose') || '';
  const returnToParam = searchParams.get('return_to');

  const [property, setProperty] = useState(null);
  const [propertyChecking, setPropertyChecking] = useState(Boolean(propertyId));
  const [propertyError, setPropertyError] = useState(null);

  // Background cancel synchronization: mark the pending Stripe checkout record cancelled on backend
  useEffect(() => {
    if (sessionId) {
      cancelCheckoutSession(sessionId).catch(() => {});
    }
  }, [sessionId]);

  // Validate property accessibility if a propertyId was passed
  useEffect(() => {
    if (!propertyId) {
      setPropertyChecking(false);
      return;
    }

    let active = true;
    setPropertyChecking(true);

    getPropertyById(propertyId)
      .then((prop) => {
        if (!active) return;
        if (!prop) {
          setPropertyError('The requested property is no longer accessible.');
        } else {
          setProperty(prop);
        }
        setPropertyChecking(false);
      })
      .catch((err) => {
        if (!active) return;
        setPropertyError(err?.message || 'Property details could not be retrieved.');
        setPropertyChecking(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId]);

  // Safe internal return URL sanitization (reject external protocols, double slashes, and javascript:)
  const sanitizeInternalUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes(':')) {
      return null;
    }
    return trimmed;
  };

  const safeReturnTo = sanitizeInternalUrl(returnToParam);

  const isAgent = user?.role === 'agent';
  const isPromotion = purpose === 'promotion_fee';
  const isInstallment = purpose === 'emi_installment' || purpose === 'rent_installment';

  // Determine canonical return destination based on validated context
  let primaryReturnUrl = '/dashboard/payments';
  let primaryReturnLabel = 'Return to My Payments';

  if (isPromotion || (isAgent && propertyId)) {
    primaryReturnUrl = propertyId ? `/agent/properties/${propertyId}` : '/agent/properties';
    primaryReturnLabel = 'Return to Property Management';
  } else if (property && propertyId && !propertyError) {
    primaryReturnUrl = `/property/${propertyId}`;
    primaryReturnLabel = `Return to ${property.title ? `"${property.title}"` : 'Property Details'}`;
  } else if (isInstallment) {
    primaryReturnUrl = '/dashboard/payments';
    primaryReturnLabel = 'Return to Scheduled Payments';
  } else if (propertyError) {
    primaryReturnUrl = purpose === 'rent_deposit' ? '/rent' : '/buy';
    primaryReturnLabel = purpose === 'rent_deposit' ? 'Browse Available Rentals' : 'Browse Available Residences';
  } else if (safeReturnTo) {
    primaryReturnUrl = safeReturnTo;
    primaryReturnLabel = 'Return to Previous Page';
  }

  const handleTryAgain = () => {
    if (isPromotion && propertyId) {
      navigate(`/agent/properties/${propertyId}`);
    } else if (propertyId && !propertyError) {
      navigate(`/checkout/${propertyId}`);
    } else if (isInstallment) {
      navigate('/dashboard/payments');
    } else {
      navigate('/dashboard/payments');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-sand/40 border border-charcoal/15 rounded-3xl p-8 sm:p-10 text-center shadow-lg">
        {/* Calm Icon */}
        <div className="size-14 rounded-full bg-amber-100 border border-amber-300 text-amber-800 mx-auto flex items-center justify-center mb-5">
          <ShieldAlert className="size-7" />
        </div>

        {/* Content */}
        <p className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
          Checkout Cancelled
        </p>
        <h1 className="font-serif text-3xl text-charcoal font-medium mb-3">
          Payment Was Not Completed
        </h1>
        <p className="font-sans text-xs sm:text-sm text-dark-gray/75 mb-6 leading-relaxed">
          No funds were transferred and no charge was placed on your card. If you navigated away or
          cancelled the Stripe checkout window, your session was closed safely with no pending liability.
        </p>

        {propertyError && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs text-left">
            <span className="font-semibold block mb-0.5">Notice:</span>
            {propertyError}
          </div>
        )}

        {/* Call to actions */}
        <div className="flex flex-col gap-2.5">
          {!propertyError && (
            <button
              onClick={handleTryAgain}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-charcoal text-sand hover:bg-black font-mono text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Try Payment Again</span>
            </button>
          )}

          <Link
            to={primaryReturnUrl}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-sand/60 font-mono text-xs transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span className="truncate">{primaryReturnLabel}</span>
          </Link>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              to={isAgent ? '/agent/properties' : '/dashboard/payments'}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-dark-gray/70 hover:text-charcoal font-mono text-xs hover:bg-sand/30 transition-colors"
            >
              {isAgent ? <Building2 className="size-3.5" /> : <CreditCard className="size-3.5" />}
              <span>{isAgent ? 'My Listings' : 'My Payments'}</span>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-dark-gray/70 hover:text-charcoal font-mono text-xs hover:bg-sand/30 transition-colors"
            >
              <Home className="size-3.5" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancelPage;
