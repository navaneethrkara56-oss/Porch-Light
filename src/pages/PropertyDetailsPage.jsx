import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as propertyService from '@/services/properties';
import * as bookingService from '@/services/bookings';
import * as inquiryService from '@/services/inquiries';
import * as compareService from '@/services/compare';
import * as analyticsService from '@/services/analytics';
import { getAgentRatingAggregate, getUserRatingStatusForProperty } from '@/services/ratings';
import { AgentRatingModal } from '@/components/rating/AgentRatingModal';
import { useAuth } from '@/features/auth/AuthContext';
import { SmartImage } from '@/components/media/SmartImage';
import { Arch, Leaf, Circle } from '@/components/shapes';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/ErrorState';
import { PropertyDetailsSkeleton } from '@/components/ui/Skeleton';
import { PropertyMap } from '@/components/map/PropertyMap';
import { PanoramaViewer } from '@/components/panorama/PanoramaViewer';
import { LoginOverlay } from '@/components/property/LoginOverlay';
import { ContactAgentModal } from '@/components/property/ContactAgentModal';
import { PropertyChatModal } from '@/components/chat/PropertyChatModal';
import { formatINR, formatArea, RupeeSymbol } from '@/lib/formatINR';
import { calculateEMI } from '@/lib/emi';
import { isPremium } from '@/lib/isPremium';
import {
  getFloorFieldConfig,
  getPropertyFieldApplicability,
  formatPropertyType,
  formatFacingDirection,
  formatPossessionStatus,
} from '@/constants/propertyTypes';
import { cn } from '@/lib/utils';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import {
  Calendar,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Bookmark,
  Columns,
  CreditCard,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CheckCircle,
  Clock,
  Compass,
  Star,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DEFAULT_HOME_LOAN_INTEREST_RATE = 8.5;

export function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isUser, isAgent, isAdmin } = useAuth();

  const [property, setProperty] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const headerOffset = useHeaderOffset();

  // Map preview selection state
  const [mapPreviewSelected, setMapPreviewSelected] = useState(true);

  // Buy purchase-financing interactive state (Sale)
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [loanTermMonths, setLoanTermMonths] = useState(240);

  // Rental Outlay interactive state (Rent)
  const [utilitiesEst, setUtilitiesEst] = useState(3500);
  const [leaseMonths, setLeaseMonths] = useState(11);
  const [userIncome, setUserIncome] = useState('');

  // Modals state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [guestOverlayOpen, setGuestOverlayOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [agentAvatarError, setAgentAvatarError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setAgentAvatarError(false);
  }, [property?.agent?.avatar, property?.id]);
  const [isCompared, setIsCompared] = useState(false);
  const [storeVersion, setStoreVersion] = useState(0);

  const [visitDate, setVisitDate] = useState('');
  const [visitSlot, setVisitSlot] = useState('11:00 AM - 12:00 PM');
  const [visitNotes, setVisitNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Request tracking to prevent race conditions and stale data between route switches
  const activeRequestIdRef = useRef(0);

  // Load property details
  useEffect(() => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);
    // Explicitly reset property and similar to guarantee no stale data from previous property is ever displayed
    setProperty(null);
    setSimilar([]);

    if (!id) {
      setLoading(false);
      setError('Invalid property ID');
      return;
    }

    propertyService
      .getPropertyById(id)
      .then((data) => {
        // Discard stale response if a newer request or ID change has occurred
        if (requestId !== activeRequestIdRef.current) return;
        if (!data) {
          setError('Property not found');
          setProperty(null);
          setLoading(false);
          return;
        }
        setProperty(data);
        setLoading(false);

        // Fetch similar properties asynchronously in background without blocking main view
        propertyService
          .getSimilarProperties(data.id)
          .then((sim) => {
            if (requestId === activeRequestIdRef.current) {
              setSimilar(sim || []);
            }
          })
          .catch(() => {
            if (requestId === activeRequestIdRef.current) {
              setSimilar([]);
            }
          });
      })
      .catch((err) => {
        if (requestId !== activeRequestIdRef.current) return;
        setError(err?.message || 'Property not found');
        setProperty(null);
        setLoading(false);
      });

    return () => {
      // Invalidate active request on unmount or id change
      activeRequestIdRef.current++;
    };
  }, [id]);

  // Record property view for signed-in users (deduplicated once per user per property per day)
  useEffect(() => {
    if (property?.id && user?.id && role === 'user') {
      analyticsService.recordPropertyView({
        propertyId: property.id,
        userId: user.id,
        userRole: role,
      }).catch((e) => console.warn('Failed to record property view', e));
    }
  }, [property?.id, user?.id, role]);

  // Record 360 virtual tour open for signed-in users when immersion is active
  useEffect(() => {
    if (property?.id && property?.tour360Url && isPremium(property) && user?.id && role === 'user') {
      analyticsService.recordTourOpen({
        propertyId: property.id,
        userId: user.id,
        userRole: role,
      }).catch((e) => console.warn('Failed to record tour open', e));
    }
  }, [property?.id, property?.tour360Url, user?.id, role]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const imagesList = Array.isArray(property?.images) && property.images.length > 0
      ? property.images
      : (property?.coverImage ? [property.coverImage] : []);

    const handleKeyDown = (e) => {
      if (lightboxIndex === null || imagesList.length === 0) return;
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % imagesList.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, property]);

  // Synchronize saved state
  useEffect(() => {
    if (isAuthenticated && property) {
      const propId = property.id || property.customId;
      const checkSaved = () => {
        setIsSaved(
          propertyService.isPropertySaved(propId) ||
          (property.customId ? propertyService.isPropertySaved(property.customId) : false) ||
          (property.id ? propertyService.isPropertySaved(property.id) : false)
        );
      };
      checkSaved();
      const unsub = propertyService.subscribeToSavedProperties(() => {
        checkSaved();
      });
      return () => unsub();
    } else {
      setIsSaved(false);
    }
  }, [isAuthenticated, property?.id, property?.customId]);

  // Synchronize compare state
  useEffect(() => {
    if (property?.id) {
      const mode = property.listingType === 'rent' ? 'rent' : 'sale';
      const items = compareService.getComparedProperties(mode);
      setIsCompared(items.some((p) => p.id === property.id));
      const unsub = compareService.subscribeToCompare(mode, (newItems) => {
        setIsCompared(newItems.some((p) => p.id === property.id));
      });
      return () => unsub();
    }
  }, [property?.id, property?.listingType]);

  // Agent star rating aggregate and user rating eligibility (hooks must run unconditionally before early returns)
  const agentRatingSummary = useMemo(() => {
    const agtId = property?.agentId || 'agt_1';
    return getAgentRatingAggregate(agtId);
  }, [property?.agentId, storeVersion]);

  const userRatingStatus = useMemo(() => {
    if (!property?.id || !user?.id || role !== 'user') {
      return { canRate: false, reason: 'unauthorized', existingRating: null, transaction: null };
    }
    return getUserRatingStatusForProperty({ propertyId: property.id, userId: user.id });
  }, [property?.id, user?.id, role, storeVersion]);

  const isAcquiredByMe = useMemo(() => {
    if (!property || !user?.id) return false;
    return Boolean(
      property.buyerId === user.id ||
      property.buyerId === user.customId ||
      String(property.buyerId) === String(user._id) ||
      (property.isSold && userRatingStatus?.transaction)
    );
  }, [property, user, userRatingStatus]);

  const isLeasedByMe = useMemo(() => {
    if (!property || !user?.id) return false;
    return Boolean(
      property.tenantId === user.id ||
      property.tenantId === user.customId ||
      String(property.tenantId) === String(user._id)
    );
  }, [property, user]);

  // Loading state with calm, layout-matching skeleton
  if (loading) {
    return <PropertyDetailsSkeleton />;
  }

  // Error / Not Found state
  if (error || !property) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24">
        <ErrorState
          title="Sanctuary not found"
          message={error || 'We could not find the architectural residence you were looking for. It may have been archived or unlisted.'}
          retry={() => navigate('/buy')}
        />
      </div>
    );
  }

  const isRent = property.listingType === 'rent';
  const isPrem = isPremium(property);
  const floorConfig = getFloorFieldConfig(property?.type);
  const applicability = getPropertyFieldApplicability(property?.type, property?.listingType);
  const galleryImages = Array.isArray(property?.images) && property.images.length > 0
    ? property.images
    : (property?.coverImage ? [property.coverImage] : []);

  // Buy purchase-financing calculations
  const salePrice = !isRent && property?.price ? property.price : 0;
  const boundedDownPaymentPercent = Math.min(Math.max(10, downPaymentPercent), 80);
  const downPaymentAmount = Math.round((salePrice * boundedDownPaymentPercent) / 100);
  const loanPrincipal = Math.max(0, salePrice - downPaymentAmount);
  const safeTenureMonths = Math.max(12, loanTermMonths || 12);
  const safeInterestRate = DEFAULT_HOME_LOAN_INTEREST_RATE;

  // Safe standard EMI calculation
  const calculateMonthlyEMI = (principal, annualRate, tenureMonths) => {
    if (!principal || principal <= 0 || !tenureMonths || tenureMonths <= 0) return 0;
    if (!annualRate || annualRate <= 0) return Math.round(principal / tenureMonths);
    const monthlyRate = annualRate / (12 * 100);
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    if (!isFinite(factor) || factor <= 1) return Math.round(principal / tenureMonths);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    return isFinite(emi) && !isNaN(emi) ? Math.round(emi) : 0;
  };

  const calculatedMonthlyEMI = calculateMonthlyEMI(loanPrincipal, safeInterestRate, safeTenureMonths);
  const totalLoanPayment = calculatedMonthlyEMI * safeTenureMonths;
  const totalLoanInterest = Math.max(0, totalLoanPayment - loanPrincipal);

  // Rental outlay & affordability calculations
  const monthlyRent = isRent && property?.price ? property.price : 0;
  const hasDeposit = isRent && property?.deposit != null && Number(property.deposit) > 0;
  const securityDeposit = hasDeposit ? property.deposit : null;
  const hasMaintenance = isRent && property?.maintenance != null;
  const maintenanceCharges = hasMaintenance ? property.maintenance : 0;
  const totalMonthlyOutlay = monthlyRent + maintenanceCharges + utilitiesEst;
  const platformFee = 999;
  const initialMoveInFunds = (hasDeposit ? property.deposit : 0) + monthlyRent + maintenanceCharges + platformFee;
  const recurringCostForTerm = totalMonthlyOutlay * leaseMonths;

  // Back to listings handler: explicit route destination regardless of browser history
  const handleBackToListings = () => {
    const targetRoute = isRent ? '/rent' : '/buy';
    navigate(targetRoute);
  };

  // Toggle saved property
  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      setGuestOverlayOpen(true);
      return;
    }
    if (role !== 'user') {
      toast.error('Only client user accounts can save properties');
      return;
    }
    try {
      const propId = property.id || property.customId;
      const saved = await propertyService.toggleSavedProperty(propId);
      setIsSaved(saved);
      toast.success(saved ? 'Saved to collection' : 'Removed from collection');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  // Add to compare and navigate to matching browse tab
  const handleCompareFromDetails = () => {
    if (!isAuthenticated) {
      setGuestOverlayOpen(true);
      return;
    }
    const result = compareService.addFromPropertyView(property);
    if (!result.success) {
      if (result.reason === 'limit_reached') {
        toast.error('Compare tray holds a maximum of 3 properties. Remove one before adding this sanctuary.');
      } else {
        toast.error(result.message || 'Could not add to compare');
      }
      return;
    }
    if (result.action === 'already_present') {
      toast.success(`${property.title} is already in comparison selection`);
    } else {
      toast.success(`Added ${property.title} to compare`);
    }
    navigate(isRent ? '/rent' : '/buy');
  };

  // Handle visit booking submit
  const handleBookVisitSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await bookingService.createBooking({
        propertyId: property.id,
        date: visitDate || '2026-11-05',
        timeSlot: visitSlot,
        notes: visitNotes,
      });
      toast.success('Visit scheduled. The agent will confirm shortly.');
      setBookingModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Contact Agent button click
  const handleContactAgent = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setContactModalOpen(true);
  };

  // Handle Checkout click carrying calculator values
  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isRent) {
      navigate(`/checkout/${property.id}`, {
        state: {
          monthlyRent,
          securityDeposit: property.deposit,
          maintenance: property.maintenance,
          utilitiesEst,
          leaseMonths,
          totalMonthlyOutlay,
          initialMoveInFunds,
        },
      });
    } else {
      navigate(`/checkout/${property.id}`, {
        state: {
          salePrice,
          downPaymentAmount,
          downPaymentPercent: boundedDownPaymentPercent,
          loanPrincipal,
          loanTermMonths: safeTenureMonths,
          estimatedEMI: calculatedMonthlyEMI,
          assumedInterestRate: DEFAULT_HOME_LOAN_INTEREST_RATE,
        },
      });
    }
  };

  // Shared action button class for all three actions:
  // Default: charcoal/black background with porcelain/light text.
  // Hover & keyboard focus: porcelain/light background with charcoal/black text.
  const actionBtnClass =
    'group w-full h-[50px] min-h-[50px] rounded-xl flex items-center justify-center gap-2.5 font-sans text-sm font-semibold tracking-wide bg-dark-gray text-porcelain border border-dark-gray hover:bg-porcelain hover:text-dark-gray focus:outline-none focus-visible:bg-porcelain focus-visible:text-dark-gray focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="pb-32">
      {/* Top Breadcrumb & Back to listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleBackToListings}
              type="button"
              className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-medium text-dark-gray hover:text-deep-purple bg-porcelain border border-dark-gray/25 hover:border-deep-purple px-4 py-2 rounded-xl transition-all shadow-2xs group focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple cursor-pointer"
              aria-label={`Return to ${isRent ? 'rental' : 'sale'} listings`}
            >
              <ChevronLeft className="w-4 h-4 text-dark-gray/60 group-hover:text-deep-purple group-hover:-translate-x-0.5 transition-all" />
              <span>Back to {isRent ? 'Rental Listings' : 'Sale Listings'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSave}
              className={cn(
                'inline-flex items-center gap-1.5 font-mono text-xs px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs',
                isSaved
                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple font-medium'
                  : 'bg-porcelain text-dark-gray/70 border-dark-gray/25 hover:border-deep-purple hover:text-deep-purple'
              )}
              aria-label={isSaved ? 'Saved to collection' : 'Save property'}
            >
              <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={handleCompareFromDetails}
              className={cn(
                'inline-flex items-center gap-1.5 font-mono text-xs px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs',
                isCompared
                  ? 'bg-electric-lemon text-dark-gray border-dark-gray/20 font-bold'
                  : 'bg-porcelain text-dark-gray/70 border-dark-gray/25 hover:border-deep-purple hover:text-deep-purple'
              )}
              aria-label={isCompared ? 'In comparison' : 'Add to comparison'}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{isCompared ? 'In Compare' : 'Compare'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-medium">
            <Link to={isRent ? '/rent' : '/buy'} className="text-heather-purple hover:underline uppercase">
              {isRent ? 'Rent' : 'Buy'}
            </Link>
            <span className="text-dark-gray/30">/</span>
            <span className="text-dark-gray/70 uppercase">{property.city}</span>
            <span className="text-dark-gray/30">/</span>
            <span className="text-dark-gray/60">{property.locality}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-deep-purple tracking-tight leading-[1.15]">
                {property.title}
              </h1>
              {isPrem && (
                <Tag variant="lemon" className="flex items-center gap-1 font-mono text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRent ? 'Premium Rental' : 'Premium Residence'}</span>
                </Tag>
              )}
            </div>
            <div className="font-mono text-xs sm:text-sm text-dark-gray/70 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{property.address}</span>
              <span className="text-dark-gray/40">•</span>
              <span>PIN {property.pin}</span>
              <span className="text-dark-gray/40">•</span>
              <span className="text-emerald-800 font-medium bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/60 font-mono text-xs">
                RERA: {property.reraId}
              </span>
              <span className="text-dark-gray/40">•</span>
              <span>{isRent ? `Available: ${property.availableFrom || 'Immediate'}` : `Possession: ${formatPossessionStatus(property.possessionStatus) || 'Ready to Move'}`}</span>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-deep-purple font-medium tracking-tight leading-none flex items-baseline md:justify-end">
              <RupeeSymbol className="mr-1 text-2xl sm:text-3xl lg:text-[34px] align-baseline" />
              <span>{formatINR(property.price, { withSymbol: false, rent: isRent })}</span>
            </div>
            {!isRent && (
              <div className="font-mono text-xs sm:text-sm text-dark-gray/65 mt-1.5 font-normal flex items-center md:justify-end">
                <span>Approx.&nbsp;</span>
                <RupeeSymbol className="mr-0.5" />
                <span>{Math.round(property.price / (property.builtUpArea || 1)).toLocaleString('en-IN')}/sq ft</span>
              </div>
            )}
            {isRent && (
              <div className="font-mono text-xs sm:text-sm text-dark-gray/65 mt-1.5 font-normal space-y-0.5">
                <div className="flex items-center md:justify-end">
                  <span>Security Deposit:&nbsp;</span>
                  {hasDeposit ? (
                    <>
                      <RupeeSymbol className="mr-0.5" />
                      <span>{formatINR(securityDeposit, { withSymbol: false })}</span>
                    </>
                  ) : (
                    <span className="text-dark-gray/50 italic">Not provided</span>
                  )}
                </div>
                {hasMaintenance ? (
                  <div className="text-dark-gray/55 text-xs flex items-center md:justify-end">
                    <span>Maintenance:&nbsp;</span>
                    <RupeeSymbol className="mr-0.5" />
                    <span>{property.maintenance.toLocaleString('en-IN')}/mo</span>
                  </div>
                ) : (
                  <div className="text-dark-gray/40 text-xs italic">Maintenance: Not provided / Included</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collage Gallery with Clean Rectangular Frames */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[440px] sm:h-[520px]">
          {/* Main Cover Image in Clean Rectangular Frame */}
          <div
            onClick={() => setLightboxIndex(0)}
            className="md:col-span-7 h-full cursor-pointer group relative overflow-hidden rounded-2xl border border-dark-gray/20 bg-porcelain-tint shadow-xs"
          >
            <SmartImage
              src={property.coverImage || galleryImages[0]}
              alt={property.title}
              aspect="auto"
              eager
              className="w-full h-full group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs gap-2">
              <Maximize2 className="w-4 h-4" />
              <span>Expand Gallery</span>
            </div>
          </div>

          {/* Sub Images Stack in Clean Rectangular Frames */}
          <div className="md:col-span-5 grid grid-cols-2 gap-4 h-full">
            {(galleryImages.slice(1, 5).length > 0
              ? galleryImages.slice(1, 5)
              : [property.coverImage, property.coverImage].filter(Boolean)
            ).map((imgUrl, i) => (
              <div
                key={i}
                onClick={() => setLightboxIndex(i + 1)}
                className="relative cursor-pointer group overflow-hidden rounded-2xl border border-dark-gray/20 bg-porcelain-tint shadow-xs"
              >
                <SmartImage
                  src={imgUrl}
                  alt={`Room ${i + 2}`}
                  aspect="auto"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-dark-gray/85 backdrop-blur-xs text-porcelain font-mono text-xs font-medium">
                  View {i + 2}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Right Column: Agent Profile & Actions Panel (Order 1 on mobile, Order 2 on desktop) */}
          <div className="order-1 lg:order-2 lg:col-span-4 space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Agent Verification Block */}
              <div className="p-6 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  {property?.agent?.avatar && !agentAvatarError ? (
                    <img
                      src={property.agent.avatar}
                      alt={property.agent.name || 'Agent'}
                      className="w-12 h-12 rounded-full object-cover border border-dark-gray/10"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        setAgentAvatarError(true);
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-deep-purple/10 flex items-center justify-center font-serif text-xl text-deep-purple font-medium">
                      {(property?.agent?.name || 'Agent')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif text-lg text-dark-gray font-medium">
                        {property?.agent?.name || 'Assigned Representative'}
                      </span>
                      {property?.agent?.isVerified !== false && (
                        <ShieldCheck
                          className="w-4 h-4 text-emerald-700"
                          title={property?.agent?.reraNumber ? `RERA Verified: ${property.agent.reraNumber}` : 'RERA Verified Agent'}
                        />
                      )}
                    </div>
                    <div className="font-mono text-xs sm:text-sm text-dark-gray/70">
                      {property?.agent?.agency || 'Porch Light Partner Agent'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-dark-gray/10 flex items-center justify-between font-mono text-xs sm:text-sm text-dark-gray/75">
                  {agentRatingSummary?.formattedAverage && (agentRatingSummary?.totalRatings || agentRatingSummary?.count) > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-dark-gray font-medium font-mono">{agentRatingSummary.formattedAverage}</span>
                      <span className="text-dark-gray/60 font-mono text-xs">
                        ({agentRatingSummary.totalRatings || agentRatingSummary.count}{' '}
                        {(agentRatingSummary.totalRatings || agentRatingSummary.count) === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-dark-gray/60 font-mono text-xs">
                      <Star className="w-4 h-4 text-dark-gray/30" />
                      <span>No ratings yet</span>
                    </div>
                  )}
                  <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/50 font-medium font-mono text-xs">
                    Verified Agent
                  </span>
                </div>

                {userRatingStatus?.canRate && (
                  <div className="pt-3 border-t border-dark-gray/10">
                    <button
                      type="button"
                      onClick={() => setRatingModalOpen(true)}
                      className="w-full py-2 px-3 rounded-lg border border-deep-purple/30 bg-deep-purple/5 hover:bg-deep-purple/10 text-deep-purple text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-deep-purple fill-deep-purple" />
                      <span>
                        {userRatingStatus?.existingRating
                          ? `Update Rating (★ ${userRatingStatus.existingRating.rating})`
                          : 'Rate Representing Agent'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Box with Approved Charcoal/Porcelain Styling */}
              <div className="p-6 rounded-2xl bg-porcelain border border-dark-gray/15 space-y-4 shadow-xs">
                {isUser ? (
                  <>
                    <div className="font-mono text-xs uppercase text-dark-gray/60 tracking-wider font-medium">
                      {isRent ? 'Apply & Reserve Lease' : 'Reserve & Acquire'}
                    </div>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setBookingModalOpen(true)}
                        className={actionBtnClass}
                      >
                        <Calendar className="w-4 h-4 transition-colors" />
                        <span>Book Private Visit</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleContactAgent}
                        className={actionBtnClass}
                      >
                        <MessageSquare className="w-4 h-4 transition-colors" />
                        <span>Contact Agent</span>
                      </button>

                      {isAcquiredByMe ? (
                        <div className="p-3.5 rounded-xl bg-sand/60 border border-deep-purple/30 text-deep-purple font-mono text-xs flex items-center justify-center gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-semibold">You have acquired this residence</span>
                        </div>
                      ) : isLeasedByMe ? (
                        <div className="p-3.5 rounded-xl bg-sand/60 border border-charcoal/20 text-charcoal font-mono text-xs flex items-center justify-center gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-semibold">Active tenant lease on file</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleProceedToCheckout}
                          className={actionBtnClass}
                        >
                          <CreditCard className="w-4 h-4 transition-colors" />
                          <span>{isRent ? 'Pay Move-in Deposit & Fees' : 'Proceed to Purchase Plan'}</span>
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-dark-gray/60 text-center pt-1">
                      {isRent
                        ? (hasDeposit
                          ? `Refundable deposit: ₹${securityDeposit.toLocaleString('en-IN')} held in simulated escrow`
                          : 'Deposit terms provided upon application')
                        : 'Simulated reservation token & transparent purchase financing'}
                    </div>
                  </>
                ) : isAgent ? (
                  <div className="p-4 rounded-xl bg-porcelain border border-dark-gray/10 font-mono text-xs sm:text-sm text-dark-gray/70">
                    Agent accounts can’t book properties.
                  </div>
                ) : isAdmin ? (
                  <div className="p-4 rounded-xl bg-porcelain border border-dark-gray/10 font-mono text-xs sm:text-sm text-dark-gray/70">
                    Admin accounts can’t buy or rent properties.
                  </div>
                ) : (
                  <button
                    type="button"
                    className={actionBtnClass}
                    onClick={() => navigate('/login')}
                  >
                    Sign in to {isRent ? 'Apply & Book Visit' : 'Book Visit'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Left Column: Detailed Specs & Features (Order 2 on mobile, Order 1 on desktop) */}
          <div className="order-2 lg:order-1 lg:col-span-8 space-y-12">
            {/* Key Facts: Large Serif Numerals */}
            <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs">
              <div className="font-mono text-xs uppercase tracking-widest text-heather-purple mb-6 font-medium">
                {isRent ? 'Rental Terms & Living Specifications' : 'Key Dimensions & Specifications'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {isRent ? (
                  <>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        Monthly Rent
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {formatINR(property.price, { withSymbol: true, short: true, rent: true })}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">
                        {property.maintenance
                          ? `+ ₹${property.maintenance}/mo maint.`
                          : 'inclusive of maint.'}
                      </div>
                    </div>

                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        Security Deposit
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {hasDeposit ? formatINR(securityDeposit, { withSymbol: true, short: true }) : <span className="text-xl sm:text-2xl text-dark-gray/50 font-normal">Not provided</span>}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">Refundable deposit</div>
                    </div>

                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        Configuration
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {applicability.hasBedrooms
                          ? (property.bedrooms ? `${property.bedrooms} BHK` : formatPropertyType(property.type))
                          : (property.builtUpArea || property.carpetArea ? `${formatArea(property.carpetArea || property.builtUpArea)}` : formatPropertyType(property.type))}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">
                        {applicability.hasBedrooms
                          ? (property.carpetArea || property.builtUpArea ? `${property.carpetArea || property.builtUpArea} sq ft carpet` : `${property.bathrooms || 1} Baths`)
                          : (property.parking ? `${property.parking} parking` : formatPropertyType(property.type))}
                      </div>
                    </div>

                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        Lease Period
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {property.minLease || '11 Months'}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">
                        {property.noticePeriod ? `${property.noticePeriod} notice` : '1 month notice'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        {applicability.isLand ? 'Total Parcel' : 'Super Built-up'}
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {property.plotArea || property.builtUpArea || property.sqft || '—'}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">
                        {applicability.isLand ? 'sq ft plot parcel' : 'sq ft area'}
                      </div>
                    </div>

                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        Configuration
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {applicability.hasBedrooms
                          ? `${property.bedrooms || '—'} BHK`
                          : applicability.isLand
                          ? `Zoning: ${property.zoning || 'Residential'}`
                          : applicability.hasCeilingHeight && property.ceilingHeight
                          ? property.ceilingHeight
                          : formatPropertyType(property.type)}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">
                        {applicability.hasBedrooms
                          ? `${property.bathrooms || 1} Bathrooms`
                          : applicability.isLand
                          ? property.roadFrontage || 'Direct road access'
                          : property.loadingDocks
                          ? `${property.loadingDocks} Loading Bays`
                          : formatPropertyType(property.type)}
                      </div>
                    </div>

                    <div>
                      {floorConfig.hasTotalFloors ? (
                        <>
                          <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                            Total Floors
                          </div>
                          <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                            {property.totalFloors ? `${property.totalFloors} Floors` : 'Standalone'}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">Entire Structure</div>
                        </>
                      ) : (
                        <>
                          <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                            Perimeter Layout
                          </div>
                          <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                            {property.boundary ? 'Walled' : 'Open'}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">Boundary layout</div>
                        </>
                      )}
                    </div>

                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 font-normal mb-1.5">
                        Facing Direction
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-normal leading-none">
                        {formatFacingDirection(property.facing)}
                      </div>
                      <div className="font-mono text-xs text-dark-gray/60 mt-1 font-normal">Vastu aligned</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple mb-3">
                Architectural Narrative
              </h2>
              <p className="font-sans text-base sm:text-lg text-dark-gray/85 leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Swiss-Style Spec Sheet */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple mb-4">
                {isRent ? 'Rental Specifications & Lease Details' : 'Technical Specifications & Compliance'}
              </h2>
              <div className="border-t border-dark-gray/15 divide-y divide-dark-gray/15 font-mono text-xs sm:text-sm">
                {property.reraId && (
                  <div className="py-3.5 flex justify-between items-center gap-4">
                    <span className="text-dark-gray/60 uppercase font-normal tracking-wide">RERA Registration ID</span>
                    <span className="text-dark-gray text-right font-normal">{property.reraId}</span>
                  </div>
                )}
                {isRent ? (
                  <>
                    {property.availableFrom && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Available From</span>
                        <span className="text-dark-gray text-right font-normal">{property.availableFrom}</span>
                      </div>
                    )}
                    {hasDeposit && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Security Deposit</span>
                        <span className="text-deep-purple text-right font-normal">{formatINR(securityDeposit, { withSymbol: true })}</span>
                      </div>
                    )}
                    {applicability.hasMaintenance && property.maintenance != null && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Monthly Maintenance</span>
                        <span className="text-dark-gray text-right font-normal">₹{property.maintenance} / month</span>
                      </div>
                    )}
                    {property.minLease && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Minimum Lease Period</span>
                        <span className="text-dark-gray text-right font-normal">{property.minLease}</span>
                      </div>
                    )}
                    {property.noticePeriod && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Notice Period</span>
                        <span className="text-dark-gray text-right font-normal">{property.noticePeriod}</span>
                      </div>
                    )}
                    {property.preferredTenants && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Preferred Tenants</span>
                        <span className="text-dark-gray text-right font-normal">{property.preferredTenants}</span>
                      </div>
                    )}
                    {applicability.hasPetsAllowed && property.petsAllowed !== undefined && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Pet Policy</span>
                        <span className="text-dark-gray text-right font-normal">{property.petsAllowed ? 'Pets Allowed' : 'Pets Not Permitted'}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {property.possessionStatus && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Possession Status</span>
                        <span className="text-dark-gray text-right font-normal">{formatPossessionStatus(property.possessionStatus)}</span>
                      </div>
                    )}
                    {applicability.hasAge && property.age && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Property Age</span>
                        <span className="text-dark-gray text-right font-normal">{property.age}</span>
                      </div>
                    )}
                    {property.ownership && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Ownership Type</span>
                        <span className="text-dark-gray text-right font-normal">{property.ownership}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Land Specific Specifications */}
                {applicability.isLand ? (
                  <>
                    {(property.plotArea || property.builtUpArea) && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Total Plot Area</span>
                        <span className="text-dark-gray text-right font-normal">{formatArea(property.plotArea || property.builtUpArea)}</span>
                      </div>
                    )}
                    {property.zoning && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Zoning Classification</span>
                        <span className="text-dark-gray text-right font-normal">{property.zoning}</span>
                      </div>
                    )}
                    {property.boundary && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Perimeter Boundary</span>
                        <span className="text-dark-gray text-right font-normal">{property.boundary}</span>
                      </div>
                    )}
                    {(property.roadFrontage || property.roadWidth) && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Road Frontage Access</span>
                        <span className="text-dark-gray text-right font-normal">{property.roadFrontage || property.roadWidth}</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Built Properties Specifications */
                  <>
                    {property.builtUpArea && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">{applicability.builtUpAreaLabel}</span>
                        <span className="text-dark-gray text-right font-normal">{formatArea(property.builtUpArea)}</span>
                      </div>
                    )}
                    {applicability.hasCarpetArea && property.carpetArea && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Carpet Area</span>
                        <span className="text-dark-gray text-right font-normal">{formatArea(property.carpetArea)}</span>
                      </div>
                    )}
                    {applicability.hasCeilingHeight && property.ceilingHeight && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Clear Ceiling Height</span>
                        <span className="text-dark-gray text-right font-normal">{property.ceilingHeight}</span>
                      </div>
                    )}
                    {applicability.hasLoadingDocks && property.loadingDocks && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Automated Loading Bays</span>
                        <span className="text-dark-gray text-right font-normal">{property.loadingDocks} automatic bays</span>
                      </div>
                    )}
                    {applicability.hasPowerLoad && property.powerLoad && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Dedicated Power Load</span>
                        <span className="text-dark-gray text-right font-normal">{property.powerLoad}</span>
                      </div>
                    )}
                    {applicability.hasFurnishing && property.furnishing && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Furnishing Condition</span>
                        <span className="text-dark-gray text-right font-normal">{property.furnishing}</span>
                      </div>
                    )}
                    {applicability.hasFacing && property.facing && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">
                          {applicability.isLand ? 'Plot Facing' : 'Entrance Facing Direction'}
                        </span>
                        <span className="text-dark-gray text-right font-normal">
                          {formatFacingDirection(property.facing)}
                        </span>
                      </div>
                    )}
                    {applicability.hasParking && property.parking && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">{applicability.parkingLabel}</span>
                        <span className="text-dark-gray text-right font-normal">{property.parking ? `${property.parking} designated bays` : 'Available on request'}</span>
                      </div>
                    )}
                    {applicability.hasWaterSupply && property.waterSupply && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Water Source</span>
                        <span className="text-dark-gray text-right font-normal">{property.waterSupply}</span>
                      </div>
                    )}
                    {applicability.hasPowerBackup && property.powerBackup !== undefined && (
                      <div className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-dark-gray/60 uppercase font-normal tracking-wide">Power Backup</span>
                        <span className="text-dark-gray text-right font-normal">{property.powerBackup ? '100% DG Backup' : 'Standard'}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Access & Connectivity Section */}
            <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs">
              <h3 className="font-serif text-xl sm:text-2xl text-deep-purple mb-4">
                Access & Urban Connectivity
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 font-mono">
                <div>
                  <div className="text-xs text-dark-gray/60 uppercase tracking-wide font-normal mb-1">Approach Road</div>
                  <div className="text-xs sm:text-sm text-dark-gray font-normal">{property.approachRoad || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-gray/60 uppercase tracking-wide font-normal mb-1">Nearest Metro / Bus</div>
                  <div className="text-xs sm:text-sm text-dark-gray font-normal">{property.nearestTransit || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-gray/60 uppercase tracking-wide font-normal mb-1">Airport Connectivity</div>
                  <div className="text-xs sm:text-sm text-dark-gray font-normal">{property.airportDistance || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-gray/60 uppercase tracking-wide font-normal mb-1">Railway Station</div>
                  <div className="text-xs sm:text-sm text-dark-gray font-normal">{property.railwayDistance || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-gray/60 uppercase tracking-wide font-normal mb-1">Healthcare & Hospitals</div>
                  <div className="text-xs sm:text-sm text-dark-gray font-normal">{property.hospitalDistance || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-gray/60 uppercase tracking-wide font-normal mb-1">Commercial Centers</div>
                  <div className="text-xs sm:text-sm text-dark-gray font-normal">{property.commercialDistance || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* 360 Tour (Strictly Gated by Verified Premium Status & Valid Asset) */}
            {isPrem && property.tour360Url ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-mono text-xs uppercase text-heather-purple font-medium">
                      Virtual Immersion
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple">
                      360° Panorama Walkthrough
                    </h2>
                  </div>
                  <Tag variant="lemon">Interactive</Tag>
                </div>
                <PanoramaViewer panoramaUrl={property.tour360Url} height="420px" />
              </div>
            ) : null}

            {/* Interactive Purchase Financing Calculator (Sale Only) */}
            {!isRent && (
              <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-heather-purple font-medium">
                      Purchase Financing
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple">
                      Home Loan EMI Calculator
                    </h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-xs text-dark-gray/60 uppercase">Estimated Monthly EMI</div>
                    <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium leading-tight flex items-baseline sm:justify-end">
                      <RupeeSymbol className="mr-1 text-2xl sm:text-3xl align-baseline" />
                      <span>{calculatedMonthlyEMI.toLocaleString('en-IN')}</span>{' '}
                      <span className="text-sm font-sans font-normal text-dark-gray/60 ml-1.5">/mo</span>
                    </div>
                  </div>
                </div>

                {/* Key Financing Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-porcelain-tint border border-dark-gray/10 mb-6 font-mono text-xs">
                  <div>
                    <div className="text-dark-gray/60 uppercase">Down Payment</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium flex items-center">
                      <RupeeSymbol className="mr-0.5" />
                      <span>{formatINR(downPaymentAmount, { withSymbol: false })}</span>
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">
                      {boundedDownPaymentPercent}% of price
                    </div>
                  </div>
                  <div>
                    <div className="text-dark-gray/60 uppercase">Loan Principal</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium flex items-center">
                      <RupeeSymbol className="mr-0.5" />
                      <span>{formatINR(loanPrincipal, { withSymbol: false })}</span>
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">
                      {100 - boundedDownPaymentPercent}% financed
                    </div>
                  </div>
                  <div>
                    <div className="text-dark-gray/60 uppercase">Loan Term</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium">
                      {safeTenureMonths} Mos
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">
                      {(safeTenureMonths / 12).toFixed(safeTenureMonths % 12 === 0 ? 0 : 1)} Years
                    </div>
                  </div>
                  <div>
                    <div className="text-dark-gray/60 uppercase">Assumed Rate</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium">
                      {DEFAULT_HOME_LOAN_INTEREST_RATE.toFixed(1)}% p.a.
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">
                      Illustrative benchmark
                    </div>
                  </div>
                </div>

                {/* Proportional Principal vs Interest Bar */}
                <div className="mb-8">
                  <div className="flex justify-between font-mono text-[11px] text-dark-gray/65 mb-1.5">
                    <span className="flex items-center">
                      Principal: {Math.round((loanPrincipal / (totalLoanPayment || 1)) * 100)}% (<RupeeSymbol className="mr-0.5" />{formatINR(loanPrincipal, { withSymbol: false })})
                    </span>
                    <span className="flex items-center">
                      Interest: {100 - Math.round((loanPrincipal / (totalLoanPayment || 1)) * 100)}% (<RupeeSymbol className="mr-0.5" />{formatINR(totalLoanInterest, { withSymbol: false })})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-dark-gray/10 rounded-full overflow-hidden flex">
                    <div
                      className="bg-deep-purple transition-all duration-300"
                      style={{ width: `${Math.round((loanPrincipal / (totalLoanPayment || 1)) * 100)}%` }}
                    />
                    <div
                      className="bg-heather-purple/40 transition-all duration-300"
                      style={{ width: `${100 - Math.round((loanPrincipal / (totalLoanPayment || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Interactive Controls: Down Payment & Loan Term Only */}
                <div className="space-y-6 font-mono text-xs sm:text-sm">
                  {/* Down Payment Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label htmlFor="down-payment-slider" className="text-dark-gray/75 font-normal">
                        Down Payment ({boundedDownPaymentPercent}%):
                      </label>
                      <span className="text-dark-gray font-medium flex items-center">
                        <RupeeSymbol className="mr-0.5" />
                        <span>{formatINR(downPaymentAmount, { withSymbol: false })}</span>
                      </span>
                    </div>
                    <input
                      id="down-payment-slider"
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={boundedDownPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      aria-label="Down payment percentage"
                      aria-valuemin="10"
                      aria-valuemax="80"
                      aria-valuenow={boundedDownPaymentPercent}
                      className="w-full accent-deep-purple cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple rounded"
                    />
                    <div className="flex justify-between text-[11px] text-dark-gray/50 mt-1">
                      <span>10% (Min)</span>
                      <span>20% (Standard)</span>
                      <span>80% (Max)</span>
                    </div>
                  </div>

                  {/* Loan Term Slider (Measured in Months) with Useful Presets */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label htmlFor="loan-term-slider" className="text-dark-gray/75 font-normal">
                        Loan Term:
                      </label>
                      <span className="text-dark-gray font-medium">
                        {safeTenureMonths} Months ({(safeTenureMonths / 12).toFixed(safeTenureMonths % 12 === 0 ? 0 : 1)} Years)
                      </span>
                    </div>
                    <input
                      id="loan-term-slider"
                      type="range"
                      min="12"
                      max="360"
                      step="12"
                      value={safeTenureMonths}
                      onChange={(e) => setLoanTermMonths(Number(e.target.value))}
                      aria-label="Loan term in months"
                      aria-valuemin="12"
                      aria-valuemax="360"
                      aria-valuenow={safeTenureMonths}
                      className="w-full accent-deep-purple cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple rounded"
                    />
                    <div className="flex gap-2 mt-2.5">
                      {[120, 180, 240, 360].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setLoanTermMonths(m)}
                          className={`flex-1 py-1.5 px-2 rounded-lg border font-mono text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple ${
                            safeTenureMonths === m
                              ? 'bg-deep-purple text-porcelain border-deep-purple font-medium'
                              : 'bg-porcelain text-dark-gray/75 border-dark-gray/20 hover:border-dark-gray/40'
                          }`}
                        >
                          {m}M ({m / 12}Y)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Informational Benchmark Disclaimer Callout */}
                  <div className="p-4 rounded-xl bg-sand/40 border border-dark-gray/15 text-dark-gray/75 font-mono text-xs leading-relaxed space-y-1">
                    <div className="font-semibold text-deep-purple flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-deep-purple" />
                      <span>Illustrative Benchmark Rate: {DEFAULT_HOME_LOAN_INTEREST_RATE}% p.a.</span>
                    </div>
                    <p className="text-[11px] text-dark-gray/70">
                      Actual lender interest rates, credit qualifications, processing charges, and loan tenures vary by financial institution and applicant profile. This calculator provides estimates for financial planning only and does not establish credit eligibility, loan approval, or a lender commitment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Rental Outlay & Affordability Estimator */}
            {isRent && (
              <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-heather-purple font-medium">
                      Lease Budget Estimator
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple">
                      Monthly Outlay & Affordability
                    </h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-xs text-dark-gray/60 uppercase">Estimated Monthly Outlay</div>
                    <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium leading-tight flex items-baseline sm:justify-end">
                      <RupeeSymbol className="mr-1 text-2xl sm:text-3xl align-baseline" />
                      <span>{totalMonthlyOutlay.toLocaleString('en-IN')}</span>{' '}
                      <span className="text-sm font-sans font-normal text-dark-gray/60 ml-1.5">/mo</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Cost Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-porcelain-tint border border-dark-gray/10 mb-6 font-mono text-xs">
                  <div>
                    <div className="text-dark-gray/60 uppercase">Base Monthly Rent</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium flex items-center">
                      <RupeeSymbol className="mr-0.5" />
                      <span>{formatINR(property.price, { withSymbol: false, rent: true })}</span>
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">Fixed property contract</div>
                  </div>
                  <div>
                    <div className="text-dark-gray/60 uppercase">Maintenance Charges</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium flex items-center">
                      {hasMaintenance ? (
                        <>
                          <RupeeSymbol className="mr-0.5" />
                          <span>{property.maintenance.toLocaleString('en-IN')}/mo</span>
                        </>
                      ) : (
                        <span className="text-dark-gray/60 italic text-sm">Included in rent / Not provided</span>
                      )}
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">Building services</div>
                  </div>
                  <div>
                    <div className="text-dark-gray/60 uppercase">Estimated Utilities</div>
                    <div className="text-dark-gray text-base mt-0.5 font-medium flex items-center">
                      <RupeeSymbol className="mr-0.5" />
                      <span>{utilitiesEst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-dark-gray/50 text-[11px] mt-0.5">Renter's own estimate</div>
                  </div>
                </div>

                <div className="space-y-6 font-mono text-xs sm:text-sm">
                  {/* Utilities Slider with Explicit Renter-Estimate Label */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label htmlFor="utilities-slider" className="text-dark-gray/75 font-normal">
                        Estimated Utilities & Services (Renter's own estimate — not property-provided fact):
                      </label>
                      <span className="text-dark-gray font-medium flex items-center">
                        <RupeeSymbol className="mr-0.5" />
                        <span>{utilitiesEst.toLocaleString('en-IN')} / month</span>
                      </span>
                    </div>
                    <input
                      id="utilities-slider"
                      type="range"
                      min="1000"
                      max="15000"
                      step="500"
                      value={utilitiesEst}
                      onChange={(e) => setUtilitiesEst(Number(e.target.value))}
                      aria-label="Estimated monthly utilities in INR"
                      className="w-full accent-deep-purple cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple rounded"
                    />
                    <div className="flex justify-between text-[11px] text-dark-gray/50 mt-1">
                      <span>₹1,000 (Minimal)</span>
                      <span>₹3,500 (Moderate)</span>
                      <span>₹15,000 (Extensive)</span>
                    </div>
                  </div>

                  {/* Lease Term Choices & Recurring Term Cost */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-dark-gray/75 font-normal">Lease Commitment Horizon:</span>
                      <span className="text-dark-gray font-medium flex items-center">
                        <span>{leaseMonths} Mos (Recurring:</span>
                        <RupeeSymbol className="ml-1 mr-0.5" />
                        <span>{formatINR(recurringCostForTerm, { withSymbol: false })})</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[11, 24, 36].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setLeaseMonths(m)}
                          className={`flex-1 py-2 px-3 rounded-lg border font-mono text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple ${
                            leaseMonths === m
                              ? 'bg-deep-purple text-porcelain border-deep-purple font-medium'
                              : 'bg-porcelain text-dark-gray/80 border-dark-gray/20 hover:border-dark-gray/50'
                          }`}
                        >
                          {m} Months
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-dark-gray/50 mt-1.5">
                      Estimated recurring outlay across {leaseMonths} months excludes the refundable security deposit.
                    </div>
                  </div>

                  {/* Move-in Funds and Clear Refundable Deposit Separation */}
                  <div className="pt-4 border-t border-dark-gray/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-porcelain-tint border border-dark-gray/10">
                      <div className="font-mono text-xs text-dark-gray/70 uppercase font-medium mb-1">
                        Move-in Capital Needed
                      </div>
                      <div className="font-serif text-2xl text-deep-purple font-medium flex items-baseline">
                        <RupeeSymbol className="mr-1 text-xl align-baseline" />
                        <span>{formatINR(initialMoveInFunds, { withSymbol: false })}</span>
                      </div>
                      <div className="font-mono text-[11px] text-dark-gray/60 mt-1.5 leading-relaxed">
                        Includes {hasDeposit ? `₹${securityDeposit.toLocaleString('en-IN')} deposit` : 'deposit (upon lease agreement)'} + 1st month rent + ₹{platformFee.toLocaleString('en-IN')} escrow platform fee.
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-porcelain-tint border border-dark-gray/10">
                      <div className="font-mono text-xs text-dark-gray/70 uppercase font-medium mb-1">
                        Refundable Security Deposit
                      </div>
                      <div className="font-serif text-2xl text-deep-purple font-medium flex items-baseline">
                        {hasDeposit ? (
                          <>
                            <RupeeSymbol className="mr-1 text-xl align-baseline" />
                            <span>{formatINR(securityDeposit, { withSymbol: false })}</span>
                          </>
                        ) : (
                          <span className="text-base text-dark-gray/60 italic font-mono">Not Provided</span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-emerald-800 mt-1.5 leading-relaxed">
                        The refundable deposit is held in escrow and returned at lease termination — it is not money spent on rent.
                      </div>
                    </div>
                  </div>

                  {/* Optional Income Affordability Assessment */}
                  <div className="p-4 rounded-xl bg-sand/30 border border-dark-gray/15 font-mono text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="user-income-input" className="text-dark-gray font-medium">
                        Check Against Your Monthly Income (Optional):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <RupeeSymbol className="text-dark-gray/70" />
                        <input
                          id="user-income-input"
                          type="number"
                          placeholder="e.g. 150000"
                          value={userIncome}
                          onChange={(e) => setUserIncome(e.target.value)}
                          className="w-32 px-2.5 py-1 text-xs font-mono bg-porcelain border border-dark-gray/25 rounded-md focus:outline-none focus:border-deep-purple"
                        />
                      </div>
                    </div>
                    {userIncome && Number(userIncome) > 0 ? (
                      <div className="text-[11px] text-dark-gray/75 pt-1 border-t border-dark-gray/10">
                        At your stated gross monthly income of ₹{Number(userIncome).toLocaleString('en-IN')}, this home’s estimated monthly outlay represents{' '}
                        <strong>{Math.round((totalMonthlyOutlay / Number(userIncome)) * 100)}%</strong> of your monthly income.
                      </div>
                    ) : (
                      <p className="text-[11px] text-dark-gray/60">
                        Porch Light does not prescribe mandatory income ratios. Enter your income above to calculate your personal rent-to-income percentage.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rental Terms & Tenant Policies (Rental Only) */}
            {isRent && (
              <div className="p-6 sm:p-8 rounded-2xl bg-porcelain border border-dark-gray/15 shadow-xs">
                <h3 className="font-serif text-xl sm:text-2xl text-deep-purple mb-4">
                  Lease Policies & Onboarding Requirements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs sm:text-sm">
                  <div className="p-4 rounded-xl bg-porcelain border border-dark-gray/10 space-y-1.5">
                    <div className="font-medium text-dark-gray flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Digital Lease Agreement</span>
                    </div>
                    <p className="text-dark-gray/70 text-xs">
                      Standard digital e-sign lease agreement generated upon deposit booking with verified tenant covenants.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-porcelain border border-dark-gray/10 space-y-1.5">
                    <div className="font-medium text-dark-gray flex items-center gap-2">
                      <Clock className="w-4 h-4 text-deep-purple" />
                      <span>Move-in Timeline</span>
                    </div>
                    <p className="text-dark-gray/70 text-xs">
                      {property.availableFrom || 'Immediate'} occupancy with key handover scheduled post agreement execution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Location Map with Pin */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple mb-4">
                Neighborhood Geography
              </h2>
              <div className="h-[440px] sm:h-[480px] rounded-2xl overflow-hidden border border-dark-gray/15 relative isolate z-10 shadow-xs">
                <PropertyMap
                  properties={[property]}
                  selectedId={mapPreviewSelected ? property.id : null}
                  onMarkerClick={() => setMapPreviewSelected(true)}
                  onClosePreview={() => setMapPreviewSelected(false)}
                  center={[property.lat || 12.9716, property.lng || 77.5946]}
                  zoom={14}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Similar Properties */}
            {similar.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-deep-purple mb-4">
                  {isRent ? `Similar Rentals in ${property.city}` : `Similar Sanctuaries in ${property.city}`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {similar.map((sim) => (
                    <div
                      key={sim.id}
                      onClick={() => navigate(`/property/${sim.id}`)}
                      className="cursor-pointer border border-dark-gray/15 rounded-xl overflow-hidden bg-porcelain p-3 group hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-[3/2] overflow-hidden rounded-lg mb-2">
                        <SmartImage
                          src={sim.coverImage || sim.images?.[0]}
                          alt={sim.title}
                          className="w-full h-full group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h4 className="font-serif text-base text-dark-gray group-hover:text-deep-purple transition-colors line-clamp-1">
                        {sim.title}
                      </h4>
                      <div className="font-mono text-xs font-medium text-deep-purple mt-1">
                        {formatINR(sim.price, { short: true, rent: sim.listingType === 'rent' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar for Mobile View */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-porcelain/95 backdrop-blur-md border-t border-dark-gray/15 p-4 lg:hidden flex items-center justify-between gap-3">
        <div>
          <div className="font-serif text-lg text-deep-purple font-medium flex items-baseline">
            <RupeeSymbol className="mr-0.5 text-base align-baseline" />
            <span>{formatINR(property.price, { short: true, rent: isRent, withSymbol: false })}</span>
          </div>
          <div className="font-mono text-[10px] text-dark-gray/60">
            {isRent
              ? hasDeposit
                ? `Deposit ₹${securityDeposit.toLocaleString('en-IN')}`
                : 'Deposit on lease'
              : property.locality}
          </div>
        </div>

        {isUser ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 px-3.5 rounded-lg border border-dark-gray bg-porcelain text-dark-gray hover:bg-dark-gray hover:text-porcelain font-sans text-xs font-semibold transition-all duration-200 cursor-pointer"
              onClick={() => setBookingModalOpen(true)}
            >
              Visit
            </button>
            <button
              type="button"
              className="h-10 px-3.5 rounded-lg border border-dark-gray/40 bg-sand/30 text-dark-gray hover:bg-dark-gray hover:text-porcelain font-sans text-xs font-semibold transition-all duration-200 cursor-pointer"
              onClick={handleContactAgent}
            >
              Agent
            </button>
            {isAcquiredByMe ? (
              <span className="h-10 px-3.5 rounded-lg bg-deep-purple/10 border border-deep-purple/20 text-deep-purple font-mono text-[11px] font-semibold flex items-center justify-center">
                Acquired
              </span>
            ) : isLeasedByMe ? (
              <span className="h-10 px-3.5 rounded-lg bg-charcoal/10 border border-charcoal/20 text-charcoal font-mono text-[11px] font-semibold flex items-center justify-center">
                Leased
              </span>
            ) : (
              <button
                type="button"
                className="h-10 px-4 rounded-lg bg-dark-gray text-porcelain border border-dark-gray hover:bg-porcelain hover:text-dark-gray font-sans text-xs font-semibold transition-all duration-200 cursor-pointer"
                onClick={handleProceedToCheckout}
              >
                {isRent ? 'Move-in' : 'Acquire'}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="h-10 px-4 rounded-lg bg-dark-gray text-porcelain border border-dark-gray hover:bg-porcelain hover:text-dark-gray font-sans text-xs font-semibold transition-all duration-200 cursor-pointer"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between px-4 pb-4 sm:px-8 sm:pb-8 transition-all"
            style={{
              paddingTop:
                headerOffset > 0
                  ? `calc(${headerOffset}px + 0.75rem)`
                  : 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
            }}
          >
            <div className="flex items-center justify-between text-white font-mono text-xs gap-4 mb-2 shrink-0">
              <span className="truncate pr-4">
                {property.title} — Photo {lightboxIndex + 1} of {galleryImages.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close gallery lightbox"
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-lemon focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center py-2 sm:py-4 min-h-0">
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (prev) => (prev - 1 + galleryImages.length) % galleryImages.length
                  )
                }
                aria-label="Previous photo"
                className="absolute left-2 z-10 p-2 sm:p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-lemon transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="max-w-4xl max-h-[70vh] sm:max-h-[75vh] w-full h-full flex items-center justify-center">
                <SmartImage
                  src={galleryImages[lightboxIndex]}
                  alt="Gallery large view"
                  aspect="auto"
                  containWithBlur
                  className="max-h-[70vh] sm:max-h-[75vh] w-auto rounded-lg shadow-2xl"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev + 1) % galleryImages.length)
                }
                aria-label="Next photo"
                className="absolute right-2 z-10 p-2 sm:p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-lemon transition-colors cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Thumbnail Row */}
            <div className="flex justify-center gap-3 overflow-x-auto py-2 shrink-0">
              {galleryImages.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`View photo ${i + 1}`}
                  className={`w-16 h-12 rounded-lg cursor-pointer overflow-hidden border-2 transition-all p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-lemon ${
                    lightboxIndex === i ? 'border-electric-lemon scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Book Visit Modal */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title="Schedule a Private Visit"
      >
        <form onSubmit={handleBookVisitSubmit} className="space-y-4">
          <Input
            label="Preferred Date"
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            required
          />

          <div>
            <label className="font-mono text-xs uppercase text-dark-gray/70 mb-1.5 block">
              Time Slot
            </label>
            <select
              value={visitSlot}
              onChange={(e) => setVisitSlot(e.target.value)}
              className="w-full bg-porcelain border border-dark-gray/20 rounded-md px-3.5 py-2.5 text-sm font-mono text-dark-gray"
            >
              <option value="10:00 AM - 11:00 AM">Morning (10:00 AM - 11:00 AM)</option>
              <option value="11:00 AM - 12:00 PM">Late Morning (11:00 AM - 12:00 PM)</option>
              <option value="03:00 PM - 04:00 PM">Afternoon (03:00 PM - 04:00 PM)</option>
              <option value="05:00 PM - 06:00 PM">Golden Hour (05:00 PM - 06:00 PM)</option>
            </select>
          </div>

          <Input
            label="Special Requests / Notes"
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            placeholder="e.g. Please arrange access to the private rooftop garden."
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="dark"
              className="w-full py-3"
              disabled={submittingAction}
            >
              {submittingAction ? 'Submitting...' : 'Confirm Appointment Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contact Agent Modal */}
      <ContactAgentModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        property={property}
        agent={property?.agent || { name: 'Assigned Agent', phone: '', agency: 'Porch Light Partner' }}
        onOpenChat={() => {
          setContactModalOpen(false);
          setChatModalOpen(true);
        }}
        onOpenLogin={() => {
          setContactModalOpen(false);
          navigate('/login');
        }}
      />

      {/* Property In-App Chat Modal */}
      <PropertyChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        property={property}
        agent={property?.agent || { name: 'Assigned Agent', phone: '', agency: 'Porch Light Partner' }}
      />

      {/* Guest Login Overlay */}
      <LoginOverlay
        isOpen={guestOverlayOpen}
        onClose={() => setGuestOverlayOpen(false)}
        propertyTitle={property.title}
      />

      {/* Agent Star Rating Modal */}
      <AgentRatingModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        transaction={userRatingStatus?.transaction}
        property={property}
        agent={property?.agent || { id: property?.agentId, name: 'Assigned Agent', company: 'Porch Light Partner' }}
        existingRating={userRatingStatus?.existingRating}
        onRatingSaved={() => {
          setStoreVersion((v) => v + 1);
        }}
      />
    </div>
  );
}
