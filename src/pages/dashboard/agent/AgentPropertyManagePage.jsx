import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getPropertyById,
  updateProperty,
  markPropertySoldOrRented,
  deleteProperty,
  restoreProperty,
  getPropertyEditEligibility,
} from '@/services/properties';
import {
  getPayments,
  getPaymentSchedules,
  confirmRentalHandover,
  respondLeaseCancellation,
  agentTerminateLease,
  createCheckoutSession,
} from '@/services/payments';
import {
  getBookings,
  updateBookingStatus,
  cancelBooking,
  respondBookingReschedule,
} from '@/services/bookings';
import {
  getPromotionConfig,
  requestPremiumStatus,
  requestFeaturedPlacement,
} from '@/services/promotions';
import { generatePaymentReceiptPDF } from '@/services/documents';
import { formatINR, formatArea, RupeeSymbol } from '@/lib/formatINR';
import { formatPaymentDate } from '@/lib/formatDate';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { SmartImage } from '@/components/media/SmartImage';
import { PanoramaViewer } from '@/components/panorama/PanoramaViewer';
import {
  validateImageFile,
  compressListingImage,
  fileToDataUrl,
  validateRemoteImageUrl,
  IMAGE_LIMITS,
} from '@/lib/validateImage';
import toast from 'react-hot-toast';
import {
  Building2,
  Sparkles,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Check,
  RotateCcw,
  Edit,
  Lock,
  Download,
  CreditCard,
  ArrowLeft,
  Calendar,
  X,
  Upload,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  Eye,
  FileText,
  ChevronRight,
  ShieldAlert,
  User,
  CalendarClock,
  Archive,
  RefreshCw,
} from 'lucide-react';

export function AgentPropertyManagePage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [propertyVisits, setPropertyVisits] = useState([]);
  const [promotionConfig, setPromotionConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab State
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Visit Filter State
  const [visitFilter, setVisitFilter] = useState('all');
  const [processingVisitId, setProcessingVisitId] = useState(null);

  // Form Edit State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    negotiable: false,
    securityDeposit: '',
    maintenance: '',
    minLease: '',
    noticePeriod: '',
    preferredTenants: '',
    images: [],
    coverImageIndex: 0,
    panoramaUrl: '',
  });
  const [savingContent, setSavingContent] = useState(false);
  const [remoteImageUrl, setRemoteImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // External Sale Modal State
  const [showExternalSaleModal, setShowExternalSaleModal] = useState(false);
  const [externalSaleData, setExternalSaleData] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    buyerName: '',
    externalReference: '',
    notes: '',
  });
  const [submittingSale, setSubmittingSale] = useState(false);

  // Delete & Archive Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Tenant Lease Cancellation Response Modal State
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [respondingCancellation, setRespondingCancellation] = useState(false);

  // Agent-Initiated Lease Termination Modal State
  const [showAgentTerminationModal, setShowAgentTerminationModal] = useState(false);
  const [agentTerminationData, setAgentTerminationData] = useState({
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [submittingAgentTermination, setSubmittingAgentTermination] = useState(false);

  // Premium Simulated Payment Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [payingPremium, setPayingPremium] = useState(false);

  // Lock background scroll when any modal in this page is open
  const isAnyModalOpen = Boolean(
    showExternalSaleModal ||
    showDeclineModal ||
    showAgentTerminationModal ||
    showDeleteModal ||
    showPremiumModal
  );
  useBodyScrollLock(isAnyModalOpen);

  // Load all property data, payments, schedules, visits, and promotions
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [propData, payRes, schedRes, visitsRes, promoConf] = await Promise.all([
        getPropertyById(id),
        getPayments(),
        getPaymentSchedules(),
        getBookings({ propertyId: id }).catch(() => ({ data: [] })),
        getPromotionConfig().catch(() => null),
      ]);

      if (!propData) {
        throw new Error('Residence not found.');
      }

      // Check agent authorization
      const isOwner =
        propData.agentId === user?.id ||
        propData.agentId === user?.customId ||
        propData.agentId === user?._id ||
        user?.role === 'admin';

      if (!isOwner) {
        setError('You are not authorized to manage this listing. It belongs to another registered agent.');
        setLoading(false);
        return;
      }

      setProperty(propData);
      setPromotionConfig(promoConf);

      // Filter payments and schedules strictly to this property
      const propPayments = (payRes.data || payRes || []).filter(
        (p) => p.propertyId === propData.id || p.propertyId === id
      );
      setPayments(propPayments);

      const propSchedules = (schedRes.data || schedRes || []).filter(
        (s) => s.propertyId === propData.id || s.propertyId === id
      );
      setSchedules(propSchedules);

      // Filter visits strictly to this property
      const propVisits = (visitsRes.data || visitsRes || []).filter(
        (v) => v.propertyId === propData.id || v.propertyId === id
      );
      setPropertyVisits(propVisits);

      // Initialize form data
      setFormData({
        title: propData.title || '',
        description: propData.description || '',
        price: propData.price || '',
        negotiable: Boolean(propData.negotiable),
        securityDeposit:
          propData.deposit != null
            ? String(propData.deposit)
            : propData.securityDeposit != null
            ? String(propData.securityDeposit)
            : '',
        maintenance: propData.maintenance || '',
        minLease: propData.minLease || '11 Months',
        noticePeriod: propData.noticePeriod || '1 Month',
        preferredTenants: propData.preferredTenants || 'All Welcome',
        images: Array.isArray(propData.images) ? [...propData.images] : [],
        coverImageIndex: propData.coverImageIndex || 0,
        panoramaUrl: propData.panoramaUrl || '',
      });
    } catch (err) {
      console.error('Failed to load property details:', err);
      setError(err.message || 'Unable to load property details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, user?.id]);

  // Sync tab with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Evaluate edit eligibility - allows editing narrative, pricing, and photography
  // while explaining the status-dependent visibility behavior
  const editEligibility = useMemo(() => {
    return getPropertyEditEligibility(property, payments);
  }, [property, payments]);

  // Active EMI check: An active EMI purchase counts as sold
  const hasActiveEmiPlan = useMemo(() => {
    return schedules.some((s) => s.type === 'emi' && (s.status === 'active' || s.status === 'completed'));
  }, [schedules]);

  const isSold = Boolean(
    property?.isSold ||
    property?.status === 'sold' ||
    property?.availabilityStatus === 'sold' ||
    hasActiveEmiPlan
  );

  const isLeased = Boolean(
    property?.isLeased ||
    property?.rentalStatus === 'leased' ||
    property?.status === 'rented'
  );

  const isPendingHandover = Boolean(property?.rentalStatus === 'pending_handover');
  const isArchived = Boolean(property?.isArchived || property?.status === 'archived');

  // Check deletion / archival encumbrances
  const deletionEligibility = useMemo(() => {
    if (!property) return { hasEncumbrance: false, canHardDelete: false, reasons: ['Listing not loaded'] };
    const reasons = [];
    if (payments.length > 0) {
      reasons.push(`${payments.length} historical financial transaction record(s)`);
    }
    if (schedules.length > 0) {
      reasons.push(`${schedules.length} active or historical payment schedule(s)`);
    }
    if (isSold) {
      reasons.push('Recorded purchase / sold status (including active EMI financing)');
    }
    if (isLeased || isPendingHandover) {
      reasons.push('Active tenant lease or pending handover');
    }
    if (propertyVisits.some((v) => v.status === 'pending' || v.status === 'confirmed')) {
      reasons.push('Scheduled walkthrough appointment(s)');
    }

    const hasEncumbrance = reasons.length > 0;
    return {
      hasEncumbrance,
      canHardDelete: !hasEncumbrance,
      reasons,
    };
  }, [property, payments, schedules, isSold, isLeased, isPendingHandover, propertyVisits]);

  // Active Lease Payment Record
  const activeLeasePayment = useMemo(() => {
    return payments.find(
      (p) =>
        (p.type === 'rent_deposit' || p.type === 'rent_installment') &&
        p.leaseDetails?.cancellationRequest?.status === 'pending'
    );
  }, [payments]);

  // Primary lease payment
  const primaryLeasePayment = useMemo(() => {
    return (
      payments.find((p) => p.type === 'rent_deposit') ||
      payments.find((p) => p.type === 'rent_installment')
    );
  }, [payments]);

  // Agent-Initiated Rental Termination Eligibility Rule:
  // Requires at least one complete rental month to have elapsed and been paid
  const rentalTerminationRule = useMemo(() => {
    if (!isLeased || property?.listingType !== 'rent') {
      return { isEligible: false, reason: 'Property does not have an active residential lease.' };
    }

    const startDate =
      property?.leaseStartDate ||
      primaryLeasePayment?.leaseDetails?.startDate ||
      primaryLeasePayment?.paidAt ||
      primaryLeasePayment?.createdAt;

    if (!startDate) {
      return { isEligible: false, reason: 'No recorded lease commencement date found.' };
    }

    const startDateObj = new Date(startDate);
    const oneMonthLater = new Date(startDateObj.getTime() + 28 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const monthElapsed = now >= oneMonthLater;

    // Check backend-confirmed rent payment coverage
    const hasPaidRent = payments.some(
      (p) =>
        (p.type === 'rent_deposit' || p.type === 'rent_installment') &&
        (p.status === 'completed' || p.status === 'paid')
    );

    const formattedEligibleDate = oneMonthLater.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (!hasPaidRent) {
      return {
        isEligible: false,
        eligibleDate: formattedEligibleDate,
        reason: 'Payment for the first complete rental month has not been confirmed in the ledger.',
      };
    }

    if (!monthElapsed) {
      return {
        isEligible: false,
        eligibleDate: formattedEligibleDate,
        reason: `Agent-initiated rental termination is restricted until the rent for at least one complete rental month has been successfully paid and recorded. Eligible on ${formattedEligibleDate}.`,
      };
    }

    return {
      isEligible: true,
      eligibleDate: formattedEligibleDate,
      reason: null,
    };
  }, [isLeased, property, primaryLeasePayment, payments]);

  // Save editable content
  const handleSaveContent = async (e) => {
    e.preventDefault();
    if (formData.images.length === 0) {
      toast.error('The property must contain at least one photograph.');
      return;
    }

    if (isSold) {
      const confirmSave = window.confirm(
        'This residence is marked as Sold. Changes to narrative, photography, or terms will update the listing record and buyer documents, but will not return the residence to public search. Proceed with saving?'
      );
      if (!confirmSave) return;
    } else if (isLeased) {
      const confirmSave = window.confirm(
        'This residence is currently under an Active Lease. Changes will update property records and tenant documents, but will not make the residence available for public rental discovery. Proceed with saving?'
      );
      if (!confirmSave) return;
    }

    setSavingContent(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        negotiable: Boolean(formData.negotiable),
        deposit: formData.securityDeposit ? Number(formData.securityDeposit) : undefined,
        securityDeposit: formData.securityDeposit ? Number(formData.securityDeposit) : undefined,
        maintenance: formData.maintenance ? Number(formData.maintenance) : undefined,
        minLease: formData.minLease.trim(),
        noticePeriod: formData.noticePeriod.trim(),
        preferredTenants: formData.preferredTenants.trim(),
        images: formData.images,
        coverImageIndex: formData.coverImageIndex,
        coverImage: formData.images[formData.coverImageIndex] || formData.images[0],
        panoramaUrl: formData.panoramaUrl ? formData.panoramaUrl.trim() : '',
      };

      const updated = await updateProperty(property.id, payload);
      setProperty(updated);
      toast.success('Listing content updated successfully.');
      loadData();
    } catch (err) {
      console.error('Failed to update property:', err);
      toast.error(err.message || 'Failed to update listing content.');
    } finally {
      setSavingContent(false);
    }
  };

  // Image upload handlers
  const handleLocalImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = IMAGE_LIMITS.MAX_PHOTOS - formData.images.length;
    if (remainingSlots <= 0) {
      toast.error(`The gallery is limited to ${IMAGE_LIMITS.MAX_PHOTOS} photos.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setUploadingImage(true);

    try {
      const newImages = [];
      for (const file of filesToProcess) {
        validateImageFile(file);
        let compressed;
        try {
          compressed = await compressListingImage(file);
        } catch {
          compressed = file;
        }
        const dataUrl = await fileToDataUrl(compressed);
        newImages.push(dataUrl);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
      toast.success(`Added ${newImages.length} photo(s) to gallery.`);
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddRemoteImage = async () => {
    if (!remoteImageUrl.trim()) return;
    if (formData.images.length >= IMAGE_LIMITS.MAX_PHOTOS) {
      toast.error(`The gallery is limited to ${IMAGE_LIMITS.MAX_PHOTOS} photos.`);
      return;
    }

    setUploadingImage(true);
    try {
      await validateRemoteImageUrl(remoteImageUrl.trim());
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, remoteImageUrl.trim()],
      }));
      setRemoteImageUrl('');
      toast.success('Remote image added to gallery.');
    } catch (err) {
      toast.error(err.message || 'Invalid image URL or failed to load image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    if (formData.images.length <= 1) {
      toast.error('The listing must have at least one photograph.');
      return;
    }
    setFormData((prev) => {
      const nextImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      let nextCover = prev.coverImageIndex;
      if (indexToRemove === prev.coverImageIndex) {
        nextCover = 0;
      } else if (indexToRemove < prev.coverImageIndex) {
        nextCover = prev.coverImageIndex - 1;
      }
      return {
        ...prev,
        images: nextImages,
        coverImageIndex: nextCover,
      };
    });
  };

  const handleMoveImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= formData.images.length) return;

    setFormData((prev) => {
      const reordered = [...prev.images];
      const temp = reordered[index];
      reordered[index] = reordered[targetIndex];
      reordered[targetIndex] = temp;

      let nextCover = prev.coverImageIndex;
      if (prev.coverImageIndex === index) {
        nextCover = targetIndex;
      } else if (prev.coverImageIndex === targetIndex) {
        nextCover = index;
      }

      return {
        ...prev,
        images: reordered,
        coverImageIndex: nextCover,
      };
    });
  };

  // External Sale Handler
  const handleRecordExternalSale = async (e) => {
    e.preventDefault();
    if (!externalSaleData.saleDate || !externalSaleData.buyerName.trim()) {
      toast.error('Please specify both the sale date and buyer name.');
      return;
    }

    setSubmittingSale(true);
    try {
      const updated = await markPropertySoldOrRented(property.id, 'sold', {
        saleDate: externalSaleData.saleDate,
        buyerName: externalSaleData.buyerName.trim(),
        externalReference: externalSaleData.externalReference.trim(),
        notes: externalSaleData.notes.trim(),
      });
      setProperty(updated);
      setShowExternalSaleModal(false);
      toast.success('External sale recorded successfully. The residence has been marked as Sold.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to record external sale.');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Delete & Archive Listing Handler
  const handleDeleteOrArchiveListing = async () => {
    if (deleteConfirmTitle.trim().toLowerCase() !== property.title.trim().toLowerCase()) {
      toast.error('Property title does not match. Action cancelled.');
      return;
    }

    setDeleting(true);
    try {
      const res = await deleteProperty(property.id);
      if (res.isArchived) {
        toast.success('Listing safely archived. Historical transaction, payment, and audit records have been preserved.');
        setShowDeleteModal(false);
        loadData();
      } else {
        toast.success('Unencumbered listing permanently deleted.');
        navigate('/agent/listings');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete listing.');
      setDeleting(false);
    }
  };

  // Restore Archived Listing Handler
  const handleRestoreListing = async () => {
    if (!window.confirm('Restore this listing from the archive? It will return to your active management roster.')) {
      return;
    }
    setRestoring(true);
    try {
      await restoreProperty(property.id);
      toast.success('Listing successfully restored from archive.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to restore listing.');
    } finally {
      setRestoring(false);
    }
  };

  // Confirm Handover Handler
  const handleConfirmHandover = async () => {
    if (
      !window.confirm(
        'Confirm handover inspection complete? This will return the residence to public Rent browse and make it available for prospective tenants.'
      )
    ) {
      return;
    }

    try {
      const updated = await confirmRentalHandover(property.id);
      setProperty(updated);
      toast.success('Handover confirmed. Residence is now available on public Rent browse.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to confirm handover.');
    }
  };

  // Tenant Early Lease Cancellation Responses
  const handleApproveCancellation = async () => {
    const payment = activeLeasePayment || primaryLeasePayment;
    if (!payment) {
      toast.error('No associated lease transaction found.');
      return;
    }

    if (
      !window.confirm(
        'Approve mutual early lease termination? The agreed effective date will be recorded, remaining rent schedule installments will be cancelled, and the residence will transition to pending handover inspection.'
      )
    ) {
      return;
    }

    setRespondingCancellation(true);
    try {
      await respondLeaseCancellation({
        paymentId: payment.id,
        propertyId: property.id,
        agree: true,
      });
      toast.success('Early lease cancellation approved. Residence is now pending handover.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to respond to cancellation request.');
    } finally {
      setRespondingCancellation(false);
    }
  };

  const handleDeclineCancellation = async (e) => {
    e.preventDefault();
    const payment = activeLeasePayment || primaryLeasePayment;
    if (!payment) {
      toast.error('No associated lease transaction found.');
      return;
    }

    setRespondingCancellation(true);
    try {
      await respondLeaseCancellation({
        paymentId: payment.id,
        propertyId: property.id,
        agree: false,
        decisionReason: declineReason.trim(),
      });
      toast.success('Early exit request declined. Standard lease terms remain active.');
      setShowDeclineModal(false);
      setDeclineReason('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to decline cancellation request.');
    } finally {
      setRespondingCancellation(false);
    }
  };

  // Agent-Initiated Rental Lease Termination
  const handleAgentInitiateTermination = async (e) => {
    e.preventDefault();
    const payment = primaryLeasePayment;
    if (!payment) {
      toast.error('No associated lease transaction found.');
      return;
    }

    if (!agentTerminationData.reason.trim()) {
      toast.error('Please provide a termination reason.');
      return;
    }

    setSubmittingAgentTermination(true);
    try {
      await agentTerminateLease({
        paymentId: payment.id,
        propertyId: property.id,
        effectiveDate: agentTerminationData.effectiveDate,
        reason: agentTerminationData.reason.trim(),
      });
      toast.success('Rental lease terminated. Future rent installments cancelled and property is pending handover.');
      setShowAgentTerminationModal(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to terminate lease.');
    } finally {
      setSubmittingAgentTermination(false);
    }
  };

  // Visit Requests Handlers
  const handleVisitStatusAction = async (bookingId, status) => {
    setProcessingVisitId(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      toast.success(`Visit request updated to ${status}.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update visit status.');
    } finally {
      setProcessingVisitId(null);
    }
  };

  const handleRescheduleAction = async (bookingId, accept) => {
    setProcessingVisitId(bookingId);
    try {
      await respondBookingReschedule({ bookingId, accept });
      toast.success(accept ? 'Reschedule request accepted.' : 'Reschedule request declined.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to respond to reschedule request.');
    } finally {
      setProcessingVisitId(null);
    }
  };

  const handleCancelVisitAction = async (bookingId) => {
    if (!window.confirm('Cancel this walkthrough appointment? The client will be notified.')) return;
    setProcessingVisitId(bookingId);
    try {
      await cancelBooking(bookingId);
      toast.success('Visit appointment cancelled.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel appointment.');
    } finally {
      setProcessingVisitId(null);
    }
  };

  const parseVisitDateTime = (dateStr, timeSlotStr) => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let year, month, day;
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
    let hour = 0;
    let minute = 0;
    if (timeSlotStr) {
      const tMatch = timeSlotStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (tMatch) {
        hour = parseInt(tMatch[1], 10);
        minute = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
        const meridiem = tMatch[3] ? tMatch[3].toUpperCase() : null;
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
      }
    }
    return new Date(year, month, day, hour, minute, 0);
  };

  const isVisitEligibleForCompletion = (b) => {
    if (b.status !== 'confirmed') return false;
    const dt = parseVisitDateTime(b.date, b.timeSlot);
    if (!dt) return false;
    return new Date() >= dt;
  };

  // Promotions Handlers
  const handleRequestFeatured = async () => {
    try {
      const res = await requestFeaturedPlacement({ propertyId: property.id });
      toast.success(
        res.status === 'waitlist'
          ? 'Featured request submitted. Current slots are full; listing is waitlisted.'
          : 'Featured placement request submitted for Admin review.'
      );
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to request Featured placement.');
    }
  };

  const handleSimulatePremiumPayment = async () => {
    setPayingPremium(true);
    try {
      const res = await createCheckoutSession({
        propertyId: property.id,
        type: 'promotion_fee',
      });
      const checkoutUrl = res?.sessionUrl || res?.data?.sessionUrl;
      if (checkoutUrl) {
        toast.loading('Redirecting to Stripe Test Checkout...');
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to obtain Stripe checkout URL from server.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate Premium checkout.');
      setPayingPremium(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="agent">
        <DashboardSkeleton type="details" />
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout role="agent">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate('/agent/listings')}
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-medium text-charcoal/85 hover:text-deep-purple bg-sand/40 hover:bg-sand/70 border border-charcoal/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4 text-deep-purple" />
            <span>Back to My Listings</span>
          </button>
          <DashboardEmptyState
            title="Unable to manage listing."
            description={error || 'The requested property could not be loaded.'}
            actionLabel="Return to My Listings"
            actionLink="/agent/listings"
            icon={Building2}
          />
        </div>
      </DashboardLayout>
    );
  }

  const statusBadge = isArchived
    ? 'bg-sand/80 text-charcoal/90 border-charcoal/25 font-medium'
    : isSold
    ? 'bg-charcoal/10 text-charcoal border-charcoal/25 font-medium'
    : isLeased
    ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
    : isPendingHandover
    ? 'bg-amber-500/10 text-amber-900 border-amber-500/25 font-medium'
    : property.status === 'approved'
    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 font-medium'
    : property.status === 'pending'
    ? 'bg-sand/60 text-charcoal/80 border-charcoal/20 font-medium'
    : 'bg-rose-50 text-rose-800 border-rose-200 font-medium';

  const filteredVisits = propertyVisits.filter((b) => {
    if (visitFilter === 'pending') return b.status === 'pending';
    if (visitFilter === 'confirmed') return b.status === 'confirmed';
    if (visitFilter === 'completed') return b.status === 'completed' || b.status === 'visited';
    if (visitFilter === 'declined') return b.status === 'declined';
    return true;
  });

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/agent/listings')}
              className="inline-flex items-center gap-2 font-mono text-xs font-medium text-charcoal/85 hover:text-deep-purple bg-sand/40 hover:bg-sand/70 border border-charcoal/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[36px]"
              aria-label="Back to My Listings"
            >
              <ArrowLeft className="w-4 h-4 text-deep-purple" />
              <span>Back to My Listings</span>
            </button>
            <div className="h-5 w-px bg-charcoal/20 hidden sm:block" />
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-charcoal/70 mb-0.5 font-medium">
                Property Management • ID: {property.id}
              </div>
              <h1 className="font-serif text-xl sm:text-2xl text-deep-purple font-medium truncate max-w-xl">
                {property.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to={`/property/${property.id}`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium transition-colors shadow-2xs min-h-[36px]"
            >
              <Eye className="w-4 h-4 text-deep-purple" />
              <span>Public Preview</span>
            </Link>
          </div>
        </div>

        {/* Identity & Status Strip */}
        <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-sand border border-charcoal/20 shrink-0 shadow-2xs">
              <SmartImage
                src={property.coverImage || property.images?.[0]}
                alt={property.title}
                aspect="square"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge}`}>
                  {isArchived
                    ? 'Archived'
                    : isSold
                    ? 'Sold'
                    : isLeased
                    ? 'Actively Leased'
                    : isPendingHandover
                    ? 'Handover Pending'
                    : property.status}
                </span>
                <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-sand/60 text-charcoal border border-charcoal/20 font-medium">
                  {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                </span>
                {property.isPremium && (
                  <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/30 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    Premium
                  </span>
                )}
                {property.featured && (
                  <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-deep-purple text-white shadow-xs font-medium">
                    Featured
                  </span>
                )}
              </div>
              <div className="font-sans text-sm text-charcoal/80 flex flex-wrap items-center gap-x-2.5">
                <span className="flex items-center gap-1 font-medium text-charcoal">
                  <MapPin className="w-3.5 h-3.5 text-deep-purple" />
                  {property.locality}, {property.city}
                </span>
                <span className="text-charcoal/40">•</span>
                <span className="font-serif text-base font-medium text-charcoal">
                  <RupeeSymbol />{formatINR(property.price)}
                  {property.listingType === 'rent' ? ' / month' : ''}
                </span>
                {property.bedrooms && (
                  <>
                    <span className="text-charcoal/40">•</span>
                    <span className="font-medium text-charcoal">{property.bedrooms} BHK</span>
                  </>
                )}
                {property.reraRegistrationNumber && (
                  <>
                    <span className="text-charcoal/40">•</span>
                    <span className="font-mono text-xs text-charcoal/70">RERA: {property.reraRegistrationNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Telemetry Indicators */}
          <div className="flex items-center gap-3 sm:gap-4 font-mono pt-3 md:pt-0 border-t md:border-t-0 border-charcoal/10">
            <div className="text-center px-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 min-w-[65px]">
              <div className="text-lg sm:text-xl font-serif text-charcoal font-medium">{property.views || 0}</div>
              <div className="text-[11px] uppercase tracking-wider text-charcoal/60 font-medium">Views</div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 min-w-[65px]">
              <div className="text-lg sm:text-xl font-serif text-charcoal font-medium">{propertyVisits.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-charcoal/60 font-medium">Visits</div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 min-w-[65px]">
              <div className="text-lg sm:text-xl font-serif text-charcoal font-medium">{payments.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-charcoal/60 font-medium">Ledger</div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 min-w-[65px]">
              <div className="text-lg sm:text-xl font-serif text-charcoal font-medium">{schedules.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-charcoal/60 font-medium">Plans</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-charcoal/10 gap-4 sm:gap-6 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview & Specs' },
            { id: 'edit', label: 'Editable Content' },
            { id: 'visits', label: `Visit Requests (${propertyVisits.length})` },
            { id: 'payments', label: `Payments & Receipts (${payments.length})` },
            { id: 'obligations', label: `Obligations (${schedules.length})` },
            { id: 'promotions', label: 'Promote Property' },
            ...(property.listingType === 'rent' ? [{ id: 'lease', label: 'Lease Lifecycle' }] : []),
            { id: 'lifecycle', label: 'Sale & Deletion' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer border-b-2 whitespace-nowrap font-medium ${
                activeTab === tab.id
                  ? 'border-deep-purple text-deep-purple font-medium'
                  : 'border-transparent text-charcoal/70 hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & SPECS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Urgent Status Banners */}
            {isArchived && (
              <div className="p-4 sm:p-5 rounded-2xl bg-sand/60 border border-charcoal/20 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Archive className="w-5 h-5 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif text-base text-charcoal font-medium">Archived Listing</p>
                    <p className="font-sans text-sm text-charcoal/80 leading-relaxed mt-0.5">
                      This listing is safely archived. Financial, payment, receipt, and audit compliance records are permanently preserved.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={handleRestoreListing}
                  className="px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shrink-0 cursor-pointer font-medium shadow-xs"
                >
                  {restoring ? 'Restoring...' : 'Restore Listing'}
                </button>
              </div>
            )}

            {property.leaseCancellationPending && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif text-base text-amber-900 font-medium">Tenant Early Lease Exit Requested</p>
                    <p className="font-sans text-sm text-charcoal/85 leading-relaxed mt-0.5">
                      The tenant submitted an early cancellation request. Please inspect and approve or decline in the Lease Lifecycle tab.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('lease')}
                  className="px-4 py-2 rounded-xl bg-deep-purple text-white font-mono text-xs uppercase tracking-wider shrink-0 cursor-pointer font-medium shadow-xs"
                >
                  Review Request
                </button>
              </div>
            )}

            {isPendingHandover && (
              <div className="p-4 sm:p-5 rounded-2xl bg-sand/70 border border-charcoal/20 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif text-base text-charcoal font-medium">Pending Handover Inspection</p>
                    <p className="font-sans text-sm text-charcoal/85 leading-relaxed mt-0.5">
                      The lease has concluded. Once you inspect the premises and confirm the keys are returned, confirm handover below to make the residence available on public Rent search.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmHandover}
                  className="px-4 py-2 rounded-xl bg-deep-purple text-white font-mono text-xs uppercase tracking-wider shrink-0 cursor-pointer font-medium shadow-xs"
                >
                  Confirm Handover
                </button>
              </div>
            )}

            {/* Architectural & Regulatory Spec Sheet */}
            <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                  Immutable Property Specifications
                </h3>
                <span className="font-mono text-xs text-charcoal/70 flex items-center gap-1 font-medium">
                  <Lock className="w-3.5 h-3.5 text-charcoal/50" />
                  RERA Compliance Facts
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-sm font-sans">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Property Type
                  </span>
                  <span className="capitalize font-medium text-charcoal text-sm">{property.type || 'Residence'}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Listing Transaction
                  </span>
                  <span className="capitalize font-medium text-charcoal text-sm">{property.listingType === 'sale' ? 'Sale' : 'Rent'}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    State RERA ID
                  </span>
                  <span className="font-mono font-medium text-charcoal text-sm">{property.reraRegistrationNumber || 'RERA-EXEMPT'}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Ownership Title
                  </span>
                  <span className="capitalize font-medium text-charcoal text-sm">{property.ownership || 'Freehold'}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Super Built-up Area
                  </span>
                  <span className="font-mono font-medium text-charcoal text-sm">{formatArea(property.builtUpArea)}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Carpet Area
                  </span>
                  <span className="font-mono font-medium text-charcoal text-sm">{formatArea(property.carpetArea)}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Bedrooms / Baths
                  </span>
                  <span className="font-medium text-charcoal text-sm">
                    {property.bedrooms ? `${property.bedrooms} BHK` : 'Studio'} • {property.bathrooms || 1} Bath(s)
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Floor Level
                  </span>
                  <span className="font-medium text-charcoal text-sm">
                    {property.floorLevel !== undefined ? `Floor ${property.floorLevel} of ${property.totalFloors || '—'}` : 'Standalone'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Physical Address
                  </span>
                  <span className="font-medium text-charcoal text-sm leading-relaxed">
                    {property.address || property.locality}, {property.city}, {property.state || 'India'} {property.pincode ? `• PIN ${property.pincode}` : ''}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Map Coordinates
                  </span>
                  <span className="font-mono text-charcoal text-sm">
                    {property.coordinates?.lat ? `${property.coordinates.lat.toFixed(4)}, ${property.coordinates.lng.toFixed(4)}` : 'Location verified on master ledger'}
                  </span>
                </div>
              </div>
            </div>

            {/* Narrative Description Preview */}
            <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-2">
              <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">Architectural Narrative</h3>
              <p className="font-sans text-sm text-charcoal/85 leading-relaxed whitespace-pre-line">
                {property.description || 'No description provided.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: EDITABLE CONTENT */}
        {activeTab === 'edit' && (
          <div className="space-y-6">
            {/* Status-dependent explanations */}
            {isSold && (
              <div className="p-4 sm:p-5 rounded-2xl bg-sand/60 border border-charcoal/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
                <div className="text-sm font-sans text-charcoal/85 leading-relaxed">
                  <p className="font-serif text-base text-charcoal font-medium">Managing Sold Property Content</p>
                  <p className="mt-0.5">
                    This residence is recorded as Sold. You may update narrative descriptions, architectural gallery photos, and terms for archival and buyer record accuracy. Changes will not return the listing to public discovery or allow another buyer to purchase it.
                  </p>
                </div>
              </div>
            )}

            {isLeased && (
              <div className="p-4 sm:p-5 rounded-2xl bg-sand/60 border border-charcoal/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
                <div className="text-sm font-sans text-charcoal/85 leading-relaxed">
                  <p className="font-serif text-base text-charcoal font-medium">Managing Actively Leased Residence Content</p>
                  <p className="mt-0.5">
                    This residence is currently under an active lease. Content and photography updates will reflect in active tenant records, but will not make the residence publicly discoverable for rent until the lease concludes and handover is confirmed.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveContent} className="space-y-6">
              {/* Core Description & Valuation */}
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
                <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium border-b border-charcoal/10 pb-3">
                  Narrative & Valuation Terms
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                      Listing Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                      Architectural Narrative Description
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal leading-relaxed focus:outline-hidden focus:border-deep-purple"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                        {property.listingType === 'sale' ? 'Asking Price (₹ INR)' : 'Monthly Rent (₹ INR)'}
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-porcelain border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-6 sm:pt-7">
                      <input
                        type="checkbox"
                        id="negotiable-toggle"
                        checked={formData.negotiable}
                        onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })}
                        className="w-4 h-4 rounded border-charcoal/30 text-deep-purple focus:ring-deep-purple cursor-pointer"
                      />
                      <label htmlFor="negotiable-toggle" className="font-sans text-sm text-charcoal cursor-pointer">
                        Price is open to private negotiation (Displays "Price on request" publicly)
                      </label>
                    </div>
                  </div>

                  {/* Rent Specific Terms */}
                  {property.listingType === 'rent' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-charcoal/10">
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                          Security Deposit (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.securityDeposit}
                          onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                          Maintenance Fee (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.maintenance}
                          onChange={(e) => setFormData({ ...formData, maintenance: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                          Min Lease Period
                        </label>
                        <input
                          type="text"
                          value={formData.minLease}
                          onChange={(e) => setFormData({ ...formData, minLease: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                          Notice Period
                        </label>
                        <input
                          type="text"
                          value={formData.noticePeriod}
                          onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Five-Photo Architectural Gallery */}
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-charcoal/10 pb-3">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                      Five-Photo Architectural Gallery
                    </h3>
                    <p className="font-sans text-sm text-charcoal/70 mt-0.5">
                      Maximum {IMAGE_LIMITS.MAX_PHOTOS} photos total. Select a cover photograph and reorder for display.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-charcoal/70 font-medium">
                    {formData.images.length} / {IMAGE_LIMITS.MAX_PHOTOS} Photos
                  </span>
                </div>

                {/* Upload Controls */}
                {formData.images.length < IMAGE_LIMITS.MAX_PHOTOS && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-sand/40 border border-charcoal/15">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                        Upload Local Photos
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleLocalImageUpload}
                        disabled={uploadingImage}
                        className="text-xs file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:bg-deep-purple file:text-white file:font-mono file:text-xs file:uppercase file:cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                        Or Add Image by URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={remoteImageUrl}
                          onChange={(e) => setRemoteImageUrl(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                        />
                        <button
                          type="button"
                          onClick={handleAddRemoteImage}
                          disabled={uploadingImage || !remoteImageUrl.trim()}
                          className="px-4 py-2 rounded-xl bg-sand/80 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gallery Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {formData.images.map((imgUrl, idx) => {
                    const isCover = formData.coverImageIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all space-y-2 relative ${
                          isCover ? 'bg-deep-purple/5 border-deep-purple/40 shadow-xs' : 'bg-porcelain border-charcoal/15'
                        }`}
                      >
                        <div className="w-full aspect-4/3 rounded-lg overflow-hidden bg-sand border border-charcoal/10 relative">
                          <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          {isCover && (
                            <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-deep-purple text-white font-mono text-xs uppercase tracking-wider shadow-xs font-medium">
                              Cover Photo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            type="button"
                            disabled={isCover}
                            onClick={() => setFormData({ ...formData, coverImageIndex: idx })}
                            className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                              isCover ? 'text-deep-purple font-medium' : 'text-charcoal/80 hover:text-charcoal bg-sand/60'
                            }`}
                          >
                            {isCover ? 'Current Cover' : 'Set as Cover'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveImage(idx, -1)}
                              className="px-2 py-1 rounded bg-sand/60 hover:bg-sand font-mono text-xs text-charcoal disabled:opacity-30 cursor-pointer"
                              title="Move left"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              disabled={idx === formData.images.length - 1}
                              onClick={() => handleMoveImage(idx, 1)}
                              className="px-2 py-1 rounded bg-sand/60 hover:bg-sand font-mono text-xs text-charcoal disabled:opacity-30 cursor-pointer"
                              title="Move right"
                            >
                              →
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 rounded hover:bg-rose-50 text-charcoal/60 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove photo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 360° Virtual Tour Panorama Section */}
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                      360° Virtual Panorama Tour
                    </h3>
                    <p className="font-sans text-sm text-charcoal/70 mt-0.5">
                      Equirectangular 2:1 ratio panorama asset for verified Premium residences.
                    </p>
                  </div>
                  {property.isPremium || property.isPremiumAdminFlag ? (
                    <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 font-medium">
                      Unlocked (Premium)
                    </span>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/60 text-charcoal/70 border border-charcoal/20 font-medium">
                      Requires Premium
                    </span>
                  )}
                </div>

                {property.isPremium || property.isPremiumAdminFlag ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                        Equirectangular Panorama Image URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.panoramaUrl}
                        onChange={(e) => setFormData({ ...formData, panoramaUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                      />
                    </div>
                    {formData.panoramaUrl && (
                      <div className="w-full h-64 rounded-xl overflow-hidden border border-charcoal/15 bg-charcoal">
                        <PanoramaViewer panoramaUrl={formData.panoramaUrl} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-xl bg-sand/40 border border-charcoal/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-sans">
                    <p className="text-charcoal/85 leading-relaxed">
                      360° Virtual Panorama Tours require a verified one-time Premium tier upgrade. Upgrade this listing under the Promote tab to unlock interactive immersion.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTabChange('promotions')}
                      className="px-4 py-2 rounded-xl bg-deep-purple text-white font-mono text-xs uppercase tracking-wider shrink-0 cursor-pointer font-medium shadow-xs"
                    >
                      Promote Listing
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingContent}
                  className="px-6 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs font-medium cursor-pointer disabled:opacity-50 min-h-[40px]"
                >
                  {savingContent ? 'Saving Changes...' : 'Save Listing Content'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: VISIT REQUESTS */}
        {activeTab === 'visits' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-charcoal/10">
              <div>
                <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                  Walkthrough Appointments & Inbound Visits
                </h3>
                <p className="font-sans text-sm text-charcoal/70 mt-0.5">
                  Direct client visit requests strictly scoped to this residence.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/15 self-start sm:self-auto">
                {['all', 'pending', 'confirmed', 'completed', 'declined'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setVisitFilter(f)}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all capitalize cursor-pointer ${
                      visitFilter === f
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredVisits.length === 0 ? (
              <DashboardEmptyState
                title="No visit requests matching filter."
                description={
                  visitFilter === 'all'
                    ? "There are currently no walkthrough requests from prospective clients for this property."
                    : `No visit requests matching the "${visitFilter}" filter.`
                }
                icon={Calendar}
              />
            ) : (
              <div className="space-y-4">
                {filteredVisits.map((b) => {
                  const isPending = b.status === 'pending';
                  const isConfirmed = b.status === 'confirmed';
                  const isCompleted = b.status === 'completed' || b.status === 'visited';
                  const isDeclined = b.status === 'declined';
                  const isCancelled = b.status === 'cancelled';
                  const hasPendingReschedule =
                    isConfirmed &&
                    b.rescheduleRequest &&
                    b.rescheduleRequest.status === 'pending';

                  const badgeClass = isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : isConfirmed
                    ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25'
                    : isPending
                    ? 'bg-sand/80 text-charcoal/90 border-charcoal/25'
                    : isDeclined
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-sand/60 text-charcoal/70 border-charcoal/20';

                  const canComplete = isVisitEligibleForCompletion(b);

                  return (
                    <div
                      key={b.id || b.customId}
                      className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full border font-medium ${badgeClass}`}>
                              {isCompleted
                                ? 'Completed Walkthrough'
                                : isConfirmed
                                ? 'Confirmed Appointment'
                                : isPending
                                ? 'Awaiting Confirmation'
                                : isDeclined
                                ? 'Declined'
                                : isCancelled
                                ? 'Cancelled'
                                : b.status}
                            </span>
                            <span className="font-mono text-xs text-charcoal/60">ID: {b.id || b.customId}</span>
                          </div>

                          <h4 className="font-serif text-base sm:text-lg text-charcoal font-medium pt-1">
                            Client: {b.userName || b.clientName || 'Prospective Client'}
                          </h4>

                          <div className="font-sans text-sm text-charcoal/80 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1.5 font-medium text-charcoal">
                              <Calendar className="w-4 h-4 text-deep-purple" />
                              {b.date ? new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-deep-purple" />
                              {b.timeSlot || 'Preferred Time'}
                            </span>
                            {b.userPhone && (
                              <span>• Tel: <strong className="font-mono text-charcoal">{b.userPhone}</strong></span>
                            )}
                            {b.userEmail && (
                              <span>• {b.userEmail}</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-auto pt-2 sm:pt-0">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={processingVisitId === (b.id || b.customId)}
                                onClick={() => handleVisitStatusAction(b.id || b.customId, 'confirmed')}
                                className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer disabled:opacity-50 min-h-[38px]"
                              >
                                Confirm Visit
                              </button>
                              <button
                                type="button"
                                disabled={processingVisitId === (b.id || b.customId)}
                                onClick={() => handleVisitStatusAction(b.id || b.customId, 'declined')}
                                className="px-4 py-2 rounded-xl bg-sand/80 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer disabled:opacity-50 min-h-[38px]"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {isConfirmed && canComplete && (
                            <button
                              type="button"
                              disabled={processingVisitId === (b.id || b.customId)}
                              onClick={() => handleVisitStatusAction(b.id || b.customId, 'completed')}
                              className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer disabled:opacity-50 min-h-[38px]"
                            >
                              Mark Completed
                            </button>
                          )}

                          {isConfirmed && !canComplete && (
                            <button
                              type="button"
                              disabled={processingVisitId === (b.id || b.customId)}
                              onClick={() => handleCancelVisitAction(b.id || b.customId)}
                              className="px-3.5 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                            >
                              Cancel Appointment
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Client Note */}
                      {b.notes && (
                        <div className="p-3.5 rounded-xl bg-porcelain border border-charcoal/10 text-sm font-sans text-charcoal/85">
                          <span className="font-mono text-xs uppercase tracking-wider text-charcoal/70 block mb-0.5 font-medium">
                            Client Walkthrough Note
                          </span>
                          <p>{b.notes}</p>
                        </div>
                      )}

                      {/* User Reschedule Request Banner */}
                      {hasPendingReschedule && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-sans">
                          <div className="space-y-1">
                            <p className="font-medium text-amber-950 flex items-center gap-1.5">
                              <CalendarClock className="w-4 h-4 text-amber-800" />
                              Client Requested Reschedule
                            </p>
                            <p className="text-charcoal/85">
                              Proposed New Time: <strong>{b.rescheduleRequest.proposedDate}</strong> at <strong>{b.rescheduleRequest.proposedTimeSlot}</strong>
                            </p>
                            {b.rescheduleRequest.reason && (
                              <p className="text-xs text-charcoal/75 italic">
                                Reason: "{b.rescheduleRequest.reason}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-2 sm:pt-0">
                            <button
                              type="button"
                              disabled={processingVisitId === (b.id || b.customId)}
                              onClick={() => handleRescheduleAction(b.id || b.customId, true)}
                              className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider font-medium shadow-xs cursor-pointer min-h-[38px]"
                            >
                              Accept New Time
                            </button>
                            <button
                              type="button"
                              disabled={processingVisitId === (b.id || b.customId)}
                              onClick={() => handleRescheduleAction(b.id || b.customId, false)}
                              className="px-4 py-2 rounded-xl bg-sand/80 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYMENTS & RECEIPTS */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-sand/30 border border-charcoal/10 text-sm font-sans text-charcoal/85 leading-relaxed flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-base text-charcoal font-medium">Audited Client Escrow Ledger</p>
                <p className="mt-0.5">
                  Official records of client reservations, down payments, move-in deposits, and rent payments processed for this residence. Commission payouts are handled externally through brokerage agreements. Sensitive buyer payment instrument credentials are never exposed.
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <DashboardEmptyState
                title="No payments recorded."
                description="When prospective buyers or tenants complete simulated bookings or down payments for this residence, the transaction logs will appear here."
                icon={CreditCard}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-charcoal/15 bg-sand/35 shadow-xs">
                <table className="w-full text-left font-sans text-sm min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-charcoal/80 font-medium">
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Client / Payer</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5 text-charcoal">
                    {payments.map((p) => {
                      const isFull = p.type === 'full_purchase' || p.type === 'full_payment';
                      const isPromo = p.type === 'promotion_fee';

                      return (
                        <tr key={p.id} className="hover:bg-sand/15 transition-colors">
                          <td className="p-4">
                            <div className="font-mono text-xs text-deep-purple font-medium">{p.id}</div>
                            {p.receiptNumber && (
                              <div className="font-mono text-xs text-charcoal/60">{p.receiptNumber}</div>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-sand/60 text-charcoal border border-charcoal/20 font-medium">
                              {isPromo
                                ? 'Marketing Fee'
                                : isFull
                                ? 'Full Purchase'
                                : p.type === 'emi_down_payment'
                                ? 'EMI Down Payment'
                                : p.type === 'emi_installment'
                                ? 'EMI Installment'
                                : p.type === 'rent_deposit'
                                ? 'Rental Deposit'
                                : p.type === 'rent_installment'
                                ? 'Rent Payment'
                                : p.type}
                            </span>
                          </td>

                          <td className="p-4 font-sans text-sm text-charcoal font-medium">
                            {isPromo ? 'Agent Marketing Expense' : p.userName || 'Verified Client'}
                          </td>

                          <td className="p-4">
                            <div className="font-serif text-base font-medium text-charcoal">
                              <RupeeSymbol />{formatINR(p.amount)}
                            </div>
                            <div className="font-mono text-xs text-charcoal/60">
                              {isPromo ? 'Expense' : 'Client Escrow'}
                            </div>
                          </td>

                          <td className="p-4 font-mono text-xs text-charcoal/80">
                            {formatPaymentDate(p)}
                          </td>

                          <td className="p-4">
                            <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 font-medium">
                              {p.status}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            {p.receiptNumber && (
                              <button
                                type="button"
                                onClick={() => generatePaymentReceiptPDF(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal font-medium transition-colors cursor-pointer min-h-[36px]"
                              >
                                <Download className="w-3.5 h-3.5 text-deep-purple" />
                                <span>PDF</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: EMI & RENT OBLIGATIONS */}
        {activeTab === 'obligations' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-sand/30 border border-charcoal/10 text-sm font-sans text-charcoal/85 leading-relaxed flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-base text-charcoal font-medium">Authoritative Recurring Obligation Summary</p>
                <p className="mt-0.5">
                  Active EMI financing commitments and recurring monthly rent obligations for this residence. Repeated future installments are summarized into one clear property plan entry.
                </p>
              </div>
            </div>

            {schedules.length === 0 ? (
              <DashboardEmptyState
                title="No active payment obligations."
                description="When a buyer finances this home via EMI or a tenant signs an active residential lease, their recurring schedule will be summarized here."
                icon={Building2}
              />
            ) : (
              <div className="space-y-4">
                {schedules.map((s) => {
                  const isEmi = s.type === 'emi';
                  const nextInst = (s.installments || []).find((i) => i.status !== 'paid') || s.installments?.[0];
                  const remainingMonths = s.totalInstallments - (s.paidInstallments || 0);

                  return (
                    <div
                      key={s.id || s._id}
                      className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full border font-medium ${
                                isEmi
                                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
                                  : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                              }`}
                            >
                              {isEmi ? 'Monthly EMI Financing Plan' : 'Active Residential Lease'}
                            </span>
                            <span className="font-mono text-xs text-charcoal/60">Schedule ID: {s.id}</span>
                          </div>
                          <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium mt-1">
                            {s.userName ? `Client: ${s.userName}` : 'Active Agreement'}
                          </h3>
                        </div>

                        <span className="font-mono text-xs text-charcoal/80 bg-sand/60 px-3.5 py-1.5 rounded-full border border-charcoal/15 self-start sm:self-auto font-medium">
                          Status: <strong className="capitalize text-charcoal">{s.status}</strong>
                        </span>
                      </div>

                      {/* Financial Metrics Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-porcelain border border-charcoal/15">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                            {isEmi ? 'Monthly Installment' : 'Monthly Rent'}
                          </span>
                          <span className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                            <RupeeSymbol />{formatINR(s.installmentAmount || s.recurringAmount)}
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-porcelain border border-charcoal/15">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                            Next Due Date
                          </span>
                          <span className="font-mono text-sm text-charcoal font-medium">
                            {nextInst?.dueDate ? new Date(nextInst.dueDate).toLocaleDateString() : '—'}
                          </span>
                          {nextInst && (
                            <span className="font-mono text-xs text-charcoal/60 block mt-0.5">
                              Installment #{nextInst.installmentNumber}
                            </span>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-porcelain border border-charcoal/15">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                            {isEmi ? 'Remaining Balance' : 'Security Deposit'}
                          </span>
                          <span className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                            <RupeeSymbol />{formatINR(isEmi ? s.remainingBalance : s.downPayment || 0)}
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-porcelain border border-charcoal/15">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                            {isEmi ? 'Tenure Remaining' : 'Lease Duration'}
                          </span>
                          <span className="font-mono text-sm text-charcoal font-medium">
                            {isEmi ? `${remainingMonths} of ${s.totalInstallments} mo` : `${s.totalInstallments || 12} mo lease`}
                          </span>
                        </div>
                      </div>

                      {/* Agreement Term Details */}
                      <div className="text-sm font-sans text-charcoal/80 pt-2 border-t border-charcoal/10 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Plan Start: {new Date(s.startDate).toLocaleDateString()} • Term End: {new Date(s.endDate).toLocaleDateString()}
                        </span>
                        {isEmi && (
                          <span>
                            Financed Principal: <RupeeSymbol />{formatINR(s.financedPrincipal)} • Benchmark Interest: {s.interestRate || 8.5}% p.a.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PROMOTE PROPERTY */}
        {activeTab === 'promotions' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-sand/30 border border-charcoal/10 text-sm font-sans text-charcoal/85 leading-relaxed flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-base text-amber-900 font-medium">Porch Light Promotion Standards</p>
                <p className="mt-0.5">
                  <strong>Premium Listing Status</strong> is a paid, permanent property designation unlocking the 360° virtual tour asset and the verified Premium badge. <strong>Featured Showcase</strong> is a timed, unpaid editorial placement strictly limited to 4 top carousel slots on the Home page. Sold and actively leased residences preserve their status and will never appear as available for sale or rent on the public showcase.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Premium Listing Status Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4 flex flex-col justify-between shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-medium">
                      Tier 1 Upgrade
                    </span>
                    {property.isPremium || property.isPremiumAdminFlag ? (
                      <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Active & Verified
                      </span>
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/60 text-charcoal/70 border border-charcoal/20 font-medium">
                        Standard Tier
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                    Premium Architectural Badge
                  </h3>

                  <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                    Permanent designation displayed across all public listing views, search filters, and Property Details. Unlocks interactive 360° virtual tour panorama integration.
                  </p>

                  <div className="pt-2 text-sm font-mono text-charcoal/80">
                    Cost: <strong className="text-charcoal"><RupeeSymbol />{formatINR(promotionConfig?.premiumFee || 15000)}</strong> • One-time fee (No recurring subscription)
                  </div>
                </div>

                <div className="pt-4 border-t border-charcoal/10">
                  {property.isPremium || property.isPremiumAdminFlag ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-sans text-emerald-950 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>This listing already has verified permanent Premium status.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPremiumModal(true)}
                      className="w-full py-2.5 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs font-medium cursor-pointer min-h-[40px]"
                    >
                      Upgrade to Premium (<RupeeSymbol />{formatINR(promotionConfig?.premiumFee || 15000)})
                    </button>
                  )}
                </div>
              </div>

              {/* Home Featured Placement Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4 flex flex-col justify-between shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-medium">
                      Editorial Showcase
                    </span>
                    {property.featured ? (
                      <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-deep-purple text-white shadow-xs font-medium">
                        Featured Active
                      </span>
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/60 text-charcoal/70 border border-charcoal/20 font-medium">
                        Standard
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                    Home Page Top 4 Carousel
                  </h3>

                  <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                    Exclusive curated placement on the front-page carousel. Limited to 4 residences platform-wide. Free of charge; requires administrative review. If all 4 slots are occupied, requests join the waitlist queue.
                  </p>

                  <div className="pt-2 text-sm font-mono text-charcoal/80">
                    Window: <strong>14 Days</strong> • Capacity: <strong>4 Slots Max</strong>
                  </div>
                </div>

                <div className="pt-4 border-t border-charcoal/10">
                  {property.featured ? (
                    <div className="p-3.5 rounded-xl bg-deep-purple/10 border border-deep-purple/20 text-sm font-sans text-deep-purple">
                      Featured placement active {property.featuredUntil ? `until ${new Date(property.featuredUntil).toLocaleDateString()}` : 'on Home Carousel'}.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestFeatured}
                      className="w-full py-2.5 rounded-xl bg-sand/80 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium transition-colors cursor-pointer min-h-[40px]"
                    >
                      Request Featured Showcase
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: LEASE LIFECYCLE (RENT ONLY) */}
        {activeTab === 'lease' && property.listingType === 'rent' && (
          <div className="space-y-6">
            {/* Active Agreement Summary */}
            <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                  Residential Lease Agreement
                </h3>
                <span className="font-mono text-xs text-charcoal/80 font-medium">
                  Status: <strong className="capitalize text-charcoal">{property.rentalStatus || 'Available'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-sm font-sans">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Tenant
                  </span>
                  <span className="font-medium text-charcoal text-sm">
                    {primaryLeasePayment?.userName || (property.tenantId ? 'Verified Tenant' : 'None (Available)')}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Monthly Rent
                  </span>
                  <span className="font-mono font-medium text-charcoal text-sm">
                    <RupeeSymbol />{formatINR(property.price)} / mo
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Security Deposit Held
                  </span>
                  <span className="font-mono font-medium text-charcoal text-sm">
                    <RupeeSymbol />{formatINR(property.securityDeposit || 0)}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 block mb-1 font-medium">
                    Lease Duration
                  </span>
                  <span className="font-medium text-charcoal text-sm">
                    {property.leaseStartDate && property.leaseEndDate
                      ? `${new Date(property.leaseStartDate).toLocaleDateString()} to ${new Date(property.leaseEndDate).toLocaleDateString()}`
                      : property.minLease || '11 Months'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tenant Early Cancellation Review */}
            {property.leaseCancellationPending && (
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/40 border border-amber-500/30 space-y-4">
                <div className="flex items-center gap-2 text-amber-900">
                  <Clock className="w-5 h-5 text-amber-700" />
                  <h3 className="font-serif text-xl font-medium">
                    Tenant Early Lease Cancellation Request
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 text-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-charcoal/70 font-mono text-xs">
                    <span>Requested by Tenant: {primaryLeasePayment?.userName || 'Active Tenant'}</span>
                    <span>
                      Requested Move-Out Date:{' '}
                      <strong className="text-charcoal font-medium">
                        {primaryLeasePayment?.leaseDetails?.cancellationRequest?.requestedDate
                          ? new Date(primaryLeasePayment.leaseDetails.cancellationRequest.requestedDate).toLocaleDateString()
                          : 'Immediate'}
                      </strong>
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-charcoal/70 block mb-0.5 font-medium">
                      Tenant's Reason
                    </span>
                    <p className="text-charcoal font-sans leading-relaxed">
                      {primaryLeasePayment?.leaseDetails?.cancellationRequest?.reason || 'No specific notes provided.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-sand/60 text-sm font-sans text-charcoal/80 leading-relaxed">
                  <strong>Agreement Terms:</strong> If you approve, the agreed effective end date will be recorded, upcoming rent schedule installments after that date will be cancelled, and the residence will transition to pending handover inspection. If you decline, standard lease terms remain active.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={respondingCancellation}
                    onClick={handleApproveCancellation}
                    className="px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer font-medium disabled:opacity-50 min-h-[38px]"
                  >
                    {respondingCancellation ? 'Processing...' : 'Approve & End Lease'}
                  </button>
                  <button
                    type="button"
                    disabled={respondingCancellation}
                    onClick={() => setShowDeclineModal(true)}
                    className="px-4 py-2 rounded-xl bg-sand/80 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer disabled:opacity-50 min-h-[38px]"
                  >
                    Decline Request
                  </button>
                </div>
              </div>
            )}

            {/* Agent-Initiated Rental Termination Controls */}
            {isLeased && !property.leaseCancellationPending && (
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                      Agent-Initiated Rental Termination
                    </h3>
                    <p className="font-sans text-sm text-charcoal/70 mt-0.5">
                      Early lease termination initiated by the managing agent.
                    </p>
                  </div>
                  {rentalTerminationRule.isEligible ? (
                    <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 font-medium">
                      Eligible for Termination
                    </span>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/70 text-charcoal/80 border border-charcoal/20 font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-charcoal/50" />
                      1 Month Minimum Rule
                    </span>
                  )}
                </div>

                {rentalTerminationRule.isEligible ? (
                  <div className="space-y-3">
                    <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                      At least one complete rental month has elapsed and been successfully paid in the ledger. You may initiate early termination by specifying an effective date and legal/brokerage reason.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAgentTerminationModal(true)}
                      className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer min-h-[38px]"
                    >
                      Terminate Lease (Agent-Initiated)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-sand/50 border border-charcoal/15 text-sm font-sans text-charcoal/85 space-y-1">
                    <p className="font-medium text-charcoal flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Early Termination Guard</span>
                    </p>
                    <p className="leading-relaxed">
                      {rentalTerminationRule.reason}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Handover Inspection Confirmation */}
            {isPendingHandover && (
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-3">
                <div className="flex items-center gap-2 text-deep-purple">
                  <RotateCcw className="w-5 h-5 text-deep-purple" />
                  <h3 className="font-serif text-lg sm:text-xl font-medium text-charcoal">
                    Pending Handover Inspection
                  </h3>
                </div>
                <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                  The lease was ended. Once you complete the walkthrough inspection with the tenant and recover the keys, confirm handover below to safely return the residence to public Rent search.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmHandover}
                  className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer min-h-[38px]"
                >
                  Confirm Handover Inspection Complete
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SALE & DELETION CONTROLS */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-6">
            {/* Sale Controls */}
            {property.listingType === 'sale' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">Sale Lifecycle Controls</h3>
                    <p className="font-sans text-sm text-charcoal/70 mt-0.5">
                      Manage sale confirmation and public listing availability.
                    </p>
                  </div>
                  {isSold ? (
                    <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 font-medium">
                      Sold & Excluded from Public Browse
                    </span>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/60 text-charcoal border border-charcoal/15 font-medium">
                      Available for Purchase
                    </span>
                  )}
                </div>

                {isSold ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-porcelain border border-charcoal/10 text-sm space-y-2">
                    <p className="font-serif text-base text-charcoal font-medium">This residence is recorded as Sold.</p>
                    <p className="text-charcoal/80 font-sans leading-relaxed">
                      Sold listings are permanently preserved in platform and client ledgers and are automatically excluded from public search and discovery. Active EMI financing commitments count as sold.
                    </p>
                    {property.externalSaleDetails?.isExternal && (
                      <div className="pt-2 text-charcoal/70 font-mono text-xs">
                        External Sale • Recorded: {new Date(property.externalSaleDetails.recordedAt || property.soldAt).toLocaleDateString()} • Buyer: {property.externalSaleDetails.buyerName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                      For in-platform purchases, sold status is authoritatively confirmed when the buyer completes checkout (full payment or EMI financing with down payment). If you completed a legal sale outside Porch Light, record it below to update availability safely without fabricating payment records.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowExternalSaleModal(true)}
                        className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer min-h-[38px]"
                      >
                        Record External Sale
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Listing Deletion & Reversible Archival */}
            <div className="p-5 sm:p-6 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-4">
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                    Listing Deletion & Safe Archival
                  </h3>
                  <p className="font-sans text-sm text-charcoal/70 mt-0.5">
                    Permanent removal of unencumbered drafts, or safe regulatory archival for listings with ledger records.
                  </p>
                </div>
                {isArchived ? (
                  <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/80 text-charcoal border border-charcoal/25 font-medium">
                    Currently Archived
                  </span>
                ) : deletionEligibility.canHardDelete ? (
                  <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 font-medium">
                    Clean Listing (Eligible for Delete)
                  </span>
                ) : (
                  <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-sand/70 text-charcoal border border-charcoal/25 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-deep-purple" />
                    Audit Preserved (Safe Archival)
                  </span>
                )}
              </div>

              {isArchived ? (
                <div className="p-4 sm:p-5 rounded-xl bg-sand/50 border border-charcoal/15 text-sm space-y-3">
                  <p className="font-medium text-charcoal">This listing is currently in your archive.</p>
                  <p className="text-charcoal/80 font-sans leading-relaxed">
                    All financial, receipt, and audit compliance records remain completely intact. You may restore this property to your active management roster at any time.
                  </p>
                  <button
                    type="button"
                    disabled={restoring}
                    onClick={handleRestoreListing}
                    className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer min-h-[38px]"
                  >
                    {restoring ? 'Restoring...' : 'Restore Listing from Archive'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {deletionEligibility.hasEncumbrance ? (
                    <div className="p-4 sm:p-5 rounded-xl bg-sand/50 border border-charcoal/15 text-sm text-charcoal/85 space-y-2">
                      <p className="font-medium text-charcoal flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Regulatory Records Protection</span>
                      </p>
                      <p className="leading-relaxed">
                        Under Indian real estate transparency rules and Porch Light accounting policy, listings tied to transactions, payment schedules, or leases cannot have their document records erased.
                      </p>
                      <p className="leading-relaxed">
                        Deleting this property will execute a <strong>safe, reversible archive</strong>: the listing will be removed from your active roster and public discovery, while permanently preserving all financial, receipt, rating, and regulatory audit trails.
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 font-mono text-xs text-charcoal/70 pl-2">
                        {deletionEligibility.reasons.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                      This listing has zero historical transactions, zero payment schedules, zero active leases, and zero scheduled walkthrough appointments. It is safe to permanently remove.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer min-h-[38px]"
                  >
                    {deletionEligibility.hasEncumbrance ? 'Safely Archive Listing' : 'Permanently Delete Listing'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Record External Sale */}
        {showExternalSaleModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-xs overflow-hidden animate-fade-in"
            onClick={() => setShowExternalSaleModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-2xl space-y-4 max-h-[calc(100dvh-2.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-lg sm:text-xl text-deep-purple font-medium">Record External Sale</h3>
                <button
                  type="button"
                  onClick={() => setShowExternalSaleModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-sand/50 border border-charcoal/10 text-sm font-sans text-charcoal/85 space-y-1">
                <p className="font-medium text-charcoal">External Legal Transaction Confirmation</p>
                <p>
                  This updates the listing availability to Sold and removes it from public discovery. It does not fabricate a platform receipt, fake payment, or simulated escrow transaction.
                </p>
              </div>

              <form onSubmit={handleRecordExternalSale} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Sale Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={externalSaleData.saleDate}
                    onChange={(e) => setExternalSaleData({ ...externalSaleData, saleDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Buyer Name / Legal Entity
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rajesh Sharma"
                    value={externalSaleData.buyerName}
                    onChange={(e) => setExternalSaleData({ ...externalSaleData, buyerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Deed / Registration Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., REG-2026-KA-4921"
                    value={externalSaleData.externalReference}
                    onChange={(e) => setExternalSaleData({ ...externalSaleData, externalReference: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Audit Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional context for brokerage compliance..."
                    value={externalSaleData.notes}
                    onChange={(e) => setExternalSaleData({ ...externalSaleData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setShowExternalSaleModal(false)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSale}
                    className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider font-medium shadow-xs cursor-pointer disabled:opacity-50 min-h-[38px]"
                  >
                    {submittingSale ? 'Confirming...' : 'Confirm External Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Decline Tenant Early Exit */}
        {showDeclineModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-xs overflow-hidden animate-fade-in"
            onClick={() => setShowDeclineModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-2xl space-y-4 max-h-[calc(100dvh-2.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                  Decline Early Lease Exit
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                Provide a reason explaining why the early termination cannot be accommodated at this time. Standard lease obligations will remain in effect.
              </p>

              <form onSubmit={handleDeclineCancellation} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Decision Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., Minimum lease tenure has not concluded, property replacement tenant needed..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setShowDeclineModal(false)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={respondingCancellation}
                    className="px-5 py-2 rounded-xl bg-charcoal text-white hover:bg-charcoal/90 font-mono text-xs uppercase tracking-wider font-medium cursor-pointer disabled:opacity-50 min-h-[38px]"
                  >
                    {respondingCancellation ? 'Sending...' : 'Confirm Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Agent-Initiated Lease Termination */}
        {showAgentTerminationModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-xs overflow-hidden animate-fade-in"
            onClick={() => setShowAgentTerminationModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-2xl space-y-4 max-h-[calc(100dvh-2.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-lg sm:text-xl text-deep-purple font-medium">
                  Terminate Rental Lease
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAgentTerminationModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-sand/50 border border-charcoal/10 text-sm font-sans text-charcoal/85 space-y-1">
                <p className="font-medium text-charcoal">Agent-Initiated Lease Termination</p>
                <p>
                  This action stops future recurring rent schedule installments after the effective date and moves the residence into pending handover inspection. The tenant will receive an immediate in-app notification.
                </p>
              </div>

              <form onSubmit={handleAgentInitiateTermination} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Agreed Effective End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={agentTerminationData.effectiveDate}
                    onChange={(e) => setAgentTerminationData({ ...agentTerminationData, effectiveDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium mb-1.5">
                    Termination Reason / Legal Justification
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., Mutual agreement with tenant following relocation, owner move-in notice served..."
                    value={agentTerminationData.reason}
                    onChange={(e) => setAgentTerminationData({ ...agentTerminationData, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setShowAgentTerminationModal(false)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAgentTermination}
                    className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider font-medium shadow-xs cursor-pointer disabled:opacity-50 min-h-[38px]"
                  >
                    {submittingAgentTermination ? 'Terminating...' : 'Confirm Termination'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Permanent Deletion or Safe Archival Confirmation */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-xs overflow-hidden animate-fade-in"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-2xl space-y-4 max-h-[calc(100dvh-2.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium">
                  {deletionEligibility.hasEncumbrance ? 'Confirm Safe Archival' : 'Confirm Permanent Deletion'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                {deletionEligibility.hasEncumbrance
                  ? 'This listing has active or historical financial records. It will be safely archived, removing it from your active management roster while preserving all transactions, payments, receipts, and audit compliance trails.'
                  : 'This action is irreversible. The residence will be permanently deleted from the database.'}
                {' '}To confirm, please type the property title below:
              </p>

              <div className="p-3 rounded-xl bg-sand/60 border border-charcoal/15 font-mono text-xs text-charcoal select-all">
                {property.title}
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Type property title exactly..."
                  value={deleteConfirmTitle}
                  onChange={(e) => setDeleteConfirmTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sand/40 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting || deleteConfirmTitle.trim().toLowerCase() !== property.title.trim().toLowerCase()}
                  onClick={handleDeleteOrArchiveListing}
                  className="px-5 py-2 rounded-xl bg-charcoal text-white hover:bg-charcoal/90 font-mono text-xs uppercase tracking-wider font-medium shadow-xs cursor-pointer disabled:opacity-40 min-h-[38px]"
                >
                  {deleting ? 'Processing...' : deletionEligibility.hasEncumbrance ? 'Safely Archive' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Premium Tier Upgrade Simulated Checkout */}
        {showPremiumModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-xs overflow-hidden animate-fade-in"
            onClick={() => setShowPremiumModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-2xl space-y-4 max-h-[calc(100dvh-2.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h3 className="font-serif text-lg sm:text-xl text-deep-purple font-medium">Premium Tier Upgrade</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm font-sans text-charcoal/85">
                <p className="leading-relaxed">
                  Upgrade <strong>{property.title}</strong> to permanent Premium Tier. The one-time fee of <strong className="text-charcoal"><RupeeSymbol />{formatINR(promotionConfig?.premiumFee || 15000)}</strong> will be processed via Stripe Checkout and unlock 360° virtual tour panorama immersion for this listing.
                </p>

                <div className="p-4 rounded-xl bg-sand/50 border border-charcoal/15 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span>Listing:</span>
                    <strong className="text-charcoal truncate max-w-[200px]">{property.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Upgrade Fee:</span>
                    <strong className="text-charcoal"><RupeeSymbol />{formatINR(promotionConfig?.premiumFee || 15000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Gateway:</span>
                    <strong className="text-emerald-800">Stripe Test Mode</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <strong className="text-charcoal">Permanent (One-time)</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(false)}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal font-medium cursor-pointer min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={payingPremium}
                  onClick={handleSimulatePremiumPayment}
                  className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider font-medium shadow-xs cursor-pointer disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                >
                  {payingPremium ? 'Connecting...' : `Pay via Stripe (₹${formatINR(promotionConfig?.premiumFee || 15000)})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AgentPropertyManagePage;
