import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import {
  createProperty,
  updateProperty,
  getPropertyById,
  getPropertyEditEligibility,
} from '@/services/properties';
import { getPromotionConfig, requestPremiumStatus } from '@/services/promotions';
import api from '@/services/apiClient';
import { isPremium } from '@/lib/isPremium';
import { PANORAMA_SAMPLE, getImagesForType } from '@/mocks/images';
import {
  PROPERTY_TYPES,
  formatPropertyType,
  getFloorFieldConfig,
  getPropertyFieldApplicability,
  IDENTITY_PROPERTY_FIELDS,
  EDITABLE_PROPERTY_FIELDS,
  ENTRANCE_FACING_DIRECTIONS,
  formatFacingDirection,
} from '@/constants/propertyTypes';
import { PropertyTypeDropdown } from '@/components/property/PropertyTypeDropdown';
import { parseGoogleMapsUrl } from '@/lib/parseGoogleMapsUrl';
import {
  validateImageFile,
  compressListingImage,
  fileToDataUrl,
  validateRemoteImageUrl,
  validatePanoramaAsset,
  IMAGE_LIMITS,
} from '@/lib/validateImage';
import { PanoramaViewer } from '@/components/panorama/PanoramaViewer';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Camera,
  Compass,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  Info,
  Lock,
  ArrowRight,
  CreditCard,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CITY_COORDINATES as CITY_COORDS } from '@/constants/cities';

const INDIA_MAX_BOUNDS = [
  [4.0, 64.0],
  [38.5, 102.0],
];

const customPinIcon = L.divIcon({
  className: 'porchlight-custom-pin',
  html: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #5E4F7A; border: 2.5px solid #F1ECE3; box-shadow: 0 3px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #E6FF3D; font-size: 15px; cursor: grab;">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    // Multi-stage invalidation to prevent blank/gray tiles across layout shifts
    const timers = [
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 100),
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 300),
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 700),
    ];

    const container = map.getContainer();
    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        try { map.invalidateSize(); } catch (e) {}
      });
      observer.observe(container);
    }

    return () => {
      timers.forEach(clearTimeout);
      if (observer) observer.disconnect();
    };
  }, [map]);

  return null;
}

function MapLocationPicker({ onLocationChange }) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onLocationChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      }
    },
  });
  return null;
}

function MapCenterSynchronizer({ center }) {
  const map = useMap();
  const prevCenterRef = useRef(center);

  useEffect(() => {
    // Invalidate map size to prevent gray tiles and ensure proper sizing in flex layout
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (
      center &&
      (Math.abs(center[0] - prevCenterRef.current[0]) > 0.000001 ||
        Math.abs(center[1] - prevCenterRef.current[1]) > 0.000001)
    ) {
      prevCenterRef.current = center;
      map.panTo(center, { animate: true, duration: 0.5 });
    }
  }, [center, map]);
  return null;
}

export function AgentNewListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.isVerified === false) {
      toast('Your agent account is pending verification. Please review your account status before creating or editing listings.', {
        icon: 'ℹ️',
      });
      navigate('/agent/overview', { replace: true });
    }
  }, [user, navigate]);

  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId') || searchParams.get('id') || paramId;

  // Seamless redirect: The central property management page is the sole authoritative edit/management destination
  useEffect(() => {
    if (editId) {
      navigate(`/agent/properties/${editId}`, { replace: true });
    }
  }, [editId, navigate]);

  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId));
  const [initialStatus, setInitialStatus] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editBlocked, setEditBlocked] = useState(false);
  const [editBlockedReason, setEditBlockedReason] = useState('');
  const [loadedProp, setLoadedProp] = useState(null);

  // Core Section
  const [listingType, setListingType] = useState('sale'); // 'sale' | 'rent'
  const [type, setType] = useState('apartment');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  // Location & Map Section - Blank defaults for new listings
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [state, setState] = useState(CITY_COORDS[user?.city]?.state || 'Karnataka');
  const [pin, setPin] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [mapLinkError, setMapLinkError] = useState('');
  const [mapLinkSuccess, setMapLinkSuccess] = useState('');
  const [mapTileError, setMapTileError] = useState(false);
  const [tileErrorCount, setTileErrorCount] = useState(0);

  // Specifications & Layout - Blank defaults for new listings
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [balconies, setBalconies] = useState('');
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [carpetArea, setCarpetArea] = useState('');
  const [plotArea, setPlotArea] = useState('');
  const [floor, setFloor] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [facing, setFacing] = useState('East');
  const [furnishing, setFurnishing] = useState('Unfurnished');

  // Land & Commercial specific attributes
  const [zoning, setZoning] = useState('');
  const [boundary, setBoundary] = useState('');
  const [roadFrontage, setRoadFrontage] = useState('');
  const [ceilingHeight, setCeilingHeight] = useState('');
  const [loadingDocks, setLoadingDocks] = useState('');
  const [powerLoad, setPowerLoad] = useState('');

  // Compliance & Technical Specs - Only verified agent's RERA is prefilled
  const [reraId, setReraId] = useState(user?.reraNumber || '');
  const [possessionStatus, setPossessionStatus] = useState('Ready to Move');
  const [age, setAge] = useState('New Construction');
  const [ownership, setOwnership] = useState('Freehold');

  // Rent specific
  const [availableFrom, setAvailableFrom] = useState('Immediate');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [minLease, setMinLease] = useState('11 Months');
  const [noticePeriod, setNoticePeriod] = useState('1 Month');
  const [preferredTenants, setPreferredTenants] = useState('Open to All');
  const [petsAllowed, setPetsAllowed] = useState(false);

  // Utilities & Amenities
  const [parking, setParking] = useState('');
  const [waterSupply, setWaterSupply] = useState('Corporation Supply');
  const [powerBackup, setPowerBackup] = useState(false);
  const [security, setSecurity] = useState(false);
  const [gated, setGated] = useState(false);
  const [lift, setLift] = useState(false);
  const [gym, setGym] = useState(false);
  const [pool, setPool] = useState('none');
  const [garden, setGarden] = useState(false);

  // Urban Connectivity & Access
  const [approachRoad, setApproachRoad] = useState('');
  const [nearestTransit, setNearestTransit] = useState('');
  const [airportDistance, setAirportDistance] = useState('');
  const [railwayDistance, setRailwayDistance] = useState('');
  const [hospitalDistance, setHospitalDistance] = useState('');
  const [commercialDistance, setCommercialDistance] = useState('');

  // Section 7: 5-Photo Gallery - Starts completely empty
  const [images, setImages] = useState([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [inspectImageIndex, setInspectImageIndex] = useState(null);
  const [failedImages, setFailedImages] = useState({});
  const [newImageUrl, setNewImageUrl] = useState('');
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const fileInputRef = useRef(null);

  // Section 7: Premium & 360° Virtual Tour
  const [requestPremium, setRequestPremium] = useState(false);
  const [isAlreadyPremium, setIsAlreadyPremium] = useState(false);
  const [tour360Url, setTour360Url] = useState('');
  const [validatingPanorama, setValidatingPanorama] = useState(false);
  const [panoramaError, setPanoramaError] = useState('');
  const [panoramaValid, setPanoramaValid] = useState(false);
  const [promoConfig, setPromoConfig] = useState(null);

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pendingSavedProp, setPendingSavedProp] = useState(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('card');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load Promotion Config
  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await getPromotionConfig();
        setPromoConfig(cfg);
      } catch (err) {
        console.warn('Could not load promotion config', err);
      }
    }
    loadConfig();
  }, []);

  const premiumFee = promoConfig?.premiumFee || promoConfig?.fee || 15000;
  const isPremiumConfigured = Boolean(promoConfig && promoConfig.active && premiumFee > 0);

  // Floor and field applicability derived from selected classification & transaction type
  const applicability = getPropertyFieldApplicability(type, listingType);
  const floorConfig = getFloorFieldConfig(type);

  const handleTypeChange = (newType) => {
    setType(newType);
    const nextApp = getPropertyFieldApplicability(newType, listingType);
    if (!nextApp.hasFloorLevel) {
      setFloor('');
    }
    if (!nextApp.hasTotalFloors) {
      setFloor('');
      setTotalFloors('');
    }
    if (!nextApp.hasBedrooms) {
      setBedrooms('');
      setBalconies('');
    }
    if (nextApp.isLand) {
      if (!plotArea || plotArea === '0') {
        setPlotArea(builtUpArea || '');
      }
      setCarpetArea('');
      setBuiltUpArea('');
      setFurnishing('');
    } else {
      if (!builtUpArea || builtUpArea === '0') {
        setBuiltUpArea(plotArea || '');
      }
    }
  };

  const handleListingTypeChange = (newListingType) => {
    setListingType(newListingType);
    const nextApp = getPropertyFieldApplicability(type, newListingType);
    if (nextApp.isSale) {
      setPossessionStatus((prev) => prev || 'Ready to Move');
    }
  };

  // City change handler
  const handleCityChange = (newCity) => {
    setCity(newCity);
    if (CITY_COORDS[newCity]) {
      setState(CITY_COORDS[newCity].state);
      setPin(CITY_COORDS[newCity].defaultPin);
      setLat(CITY_COORDS[newCity].lat);
      setLng(CITY_COORDS[newCity].lng);
    }
  };

  // Pre-load if in edit mode
  useEffect(() => {
    if (!editId) {
      setLoadingInitial(false);
      return;
    }

    async function loadListingToEdit() {
      try {
        setLoadingInitial(true);
        setNotFound(false);
        setAccessDenied(false);
        setEditBlocked(false);
        setError(null);

        let prop = null;
        try {
          prop = await getPropertyById(editId);
        } catch (fetchErr) {
          const msg = fetchErr?.message || '';
          if (msg.toLowerCase().includes('not found')) {
            setNotFound(true);
            return;
          }
          if (
            msg.toLowerCase().includes('acquired') ||
            msg.toLowerCase().includes('no longer publicly available') ||
            msg.toLowerCase().includes('completed transaction')
          ) {
            setEditBlocked(true);
            setEditBlockedReason(msg);
            return;
          }
          throw fetchErr;
        }

        if (!prop) {
          setNotFound(true);
          return;
        }

        setLoadedProp(prop);

        // Check ownership
        const activeUserId = user?.id;
        const isAdmin = user?.role === 'admin';
        if (activeUserId && prop.agentId && prop.agentId !== activeUserId && !isAdmin) {
          setAccessDenied(true);
          return;
        }

        // Check edit eligibility
        const eligibility = getPropertyEditEligibility(prop);
        if (!eligibility.canEdit) {
          setEditBlocked(true);
          setEditBlockedReason(eligibility.reason);
          return;
        }

        setInitialStatus(prop.status);
        setListingType(prop.listingType || 'sale');
        const loadedType = prop.type || 'apartment';
        setType(loadedType);
        setTitle(prop.title || '');
        setDescription(prop.description || '');
        setPrice(String(prop.price ?? ''));

        setAddress(prop.address || '');
        setLocality(prop.locality || '');
        setCity(prop.city || 'Bengaluru');
        setState(prop.state || CITY_COORDS[prop.city]?.state || 'Karnataka');
        setPin(prop.pin || CITY_COORDS[prop.city]?.defaultPin || '560001');
        setLat(prop.lat != null ? Number(prop.lat) : CITY_COORDS[prop.city]?.lat || 12.9716);
        setLng(prop.lng != null ? Number(prop.lng) : CITY_COORDS[prop.city]?.lng || 77.5946);

        const loadedApp = getPropertyFieldApplicability(loadedType, prop.listingType || 'sale');
        setBedrooms(String(prop.bedrooms ?? (loadedApp.hasBedrooms ? '3' : '')));
        setBathrooms(String(prop.bathrooms ?? (loadedApp.hasBathrooms ? '3' : '')));
        setBalconies(String(prop.balconies ?? (loadedApp.hasBalconies ? '2' : '')));
        setBuiltUpArea(String(prop.builtUpArea || (loadedApp.hasBuiltUpArea ? prop.sqft || '2100' : '')));
        setCarpetArea(String(prop.carpetArea || (prop.builtUpArea && loadedApp.hasCarpetArea ? Math.round(prop.builtUpArea * 0.82) : '')));
        setPlotArea(String(prop.plotArea || prop.builtUpArea || prop.sqft || '4500'));

        setZoning(prop.zoning || 'Residential');
        setBoundary(prop.boundary || 'Stone walled with iron gate');
        setRoadFrontage(prop.roadFrontage || '45 ft road frontage');
        setCeilingHeight(prop.ceilingHeight || '32 ft');
        setLoadingDocks(prop.loadingDocks != null ? String(prop.loadingDocks) : '4');
        setPowerLoad(prop.powerLoad || '120 kVA');

        const editFloorCfg = getFloorFieldConfig(loadedType);
        if (editFloorCfg.hasFloorLevel && prop.floor != null) {
          setFloor(String(prop.floor));
        } else {
          setFloor('');
        }
        if (editFloorCfg.hasTotalFloors && prop.totalFloors != null) {
          setTotalFloors(String(prop.totalFloors));
        } else if (editFloorCfg.hasTotalFloors) {
          setTotalFloors('1');
        } else {
          setTotalFloors('');
        }
        setFacing(formatFacingDirection(prop.facing) || 'East');
        setFurnishing(prop.furnishing || 'Semi-Furnished');

        setReraId(prop.reraId || '');
        setPossessionStatus(prop.possessionStatus || 'Ready to Move');
        setAge(prop.age || 'New Construction');
        setOwnership(prop.ownership || 'Freehold');

        setAvailableFrom(prop.availableFrom || 'Immediate');
        setSecurityDeposit(
          prop.deposit != null ? String(prop.deposit) : prop.securityDeposit != null ? String(prop.securityDeposit) : ''
        );
        setMaintenance(
          prop.maintenance != null ? String(prop.maintenance) : prop.maintenanceFee != null ? String(prop.maintenanceFee) : ''
        );
        setMinLease(prop.minLease || '11 Months');
        setNoticePeriod(prop.noticePeriod || '1 Month');
        setPreferredTenants(prop.preferredTenants || 'Open to All');
        setPetsAllowed(Boolean(prop.petsAllowed));

        const parkingDigits = typeof prop.parking === 'string' ? prop.parking.replace(/\D/g, '') : prop.parking != null ? String(prop.parking) : '';
        setParking(parkingDigits);
        setWaterSupply(prop.waterSupply || 'Corporation Supply');
        setPowerBackup(Boolean(prop.powerBackup));
        setSecurity(Boolean(prop.security !== false));
        setGated(Boolean(prop.gated !== false));
        setLift(Boolean(prop.lift !== false));
        setGym(Boolean(prop.gym));
        setPool(prop.pool || 'none');
        setGarden(Boolean(prop.garden));

        setApproachRoad(prop.approachRoad || '');
        setNearestTransit(prop.nearestTransit || '');
        setAirportDistance(prop.airportDistance || '');
        setRailwayDistance(prop.railwayDistance || '');
        setHospitalDistance(prop.hospitalDistance || '');
        setCommercialDistance(prop.commercialDistance || '');

        // Gallery load (clamped to 5 photos)
        let loadedImgs = [];
        if (Array.isArray(prop.images) && prop.images.length > 0) {
          loadedImgs = prop.images.slice(0, 5);
        } else if (prop.coverImage) {
          loadedImgs = [prop.coverImage];
        }
        setImages(loadedImgs);

        const coverIdx = prop.coverImage ? loadedImgs.indexOf(prop.coverImage) : 0;
        setCoverImageIndex(coverIdx >= 0 ? coverIdx : 0);

        // Premium & 360 Tour
        const isPrem = isPremium(prop);
        setIsAlreadyPremium(isPrem);
        if (isPrem) {
          setRequestPremium(true);
        }
        if (prop.tour360Url) {
          setTour360Url(prop.tour360Url);
          setPanoramaValid(true);
        }
      } catch (err) {
        setError(err.message || 'Failed to load listing for editing.');
      } finally {
        setLoadingInitial(false);
      }
    }

    loadListingToEdit();
  }, [editId, user?.id]);

  // Google Maps Link Parser
  const handleParseGoogleMapsUrl = (inputUrl) => {
    const targetUrl = inputUrl !== undefined ? inputUrl : googleMapsUrl;
    setMapLinkError('');
    setMapLinkSuccess('');

    if (!targetUrl.trim()) return;

    const result = parseGoogleMapsUrl(targetUrl);
    if (result.success) {
      setLat(result.lat);
      setLng(result.lng);
      setMapLinkSuccess(`Coordinates resolved: ${result.lat}, ${result.lng}`);
      toast.success(`Coordinates found: ${result.lat}, ${result.lng}`);
    } else {
      setMapLinkError(result.error);
    }
  };

  // Section 7: Gallery Handlers (Max 5 photos)
  const handleAddImageUrl = async (e) => {
    e?.preventDefault();
    setUrlError('');

    if (!newImageUrl.trim()) return;
    if (images.length >= 5) {
      setUrlError('Maximum gallery limit of 5 photos reached.');
      toast.error('Gallery limit: exactly 5 photos max.');
      return;
    }

    setValidatingUrl(true);
    try {
      const check = await validateRemoteImageUrl(newImageUrl.trim());
      if (!check.valid) {
        setUrlError(check.error || 'Failed to load image from URL.');
        toast.error(check.error || 'Invalid or inaccessible image URL.');
        return;
      }

      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
      toast.success('Photo verified and added to gallery.');
    } catch {
      setUrlError('Error validating image URL.');
    } finally {
      setValidatingUrl(false);
    }
  };

  const handleLocalFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = 5 - images.length;
    if (availableSlots <= 0) {
      toast.error('Maximum gallery limit of 5 photos reached.');
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast(`Added first ${availableSlots} photos to respect 5-photo maximum.`);
    }

    setUploadingLocal(true);
    try {
      const addedDataUrls = [];
      for (const file of filesToProcess) {
        const val = validateImageFile(file);
        if (!val.valid) {
          toast.error(`${file.name}: ${val.error}`);
          continue;
        }

        const compressed = await compressListingImage(file);
        let finalPhotoUrl;
        try {
          const formData = new FormData();
          formData.append('category', 'property');
          formData.append('file', compressed, file.name);
          const res = await api.upload('/media/upload', formData);
          finalPhotoUrl = res.data?.url;
        } catch (uploadErr) {
          finalPhotoUrl = await fileToDataUrl(compressed);
        }
        addedDataUrls.push(finalPhotoUrl);
      }

      if (addedDataUrls.length > 0) {
        setImages((prev) => [...prev, ...addedDataUrls]);
        toast.success(`Added ${addedDataUrls.length} photo(s) from device.`);
      }
    } catch (err) {
      toast.error('Failed to process image upload: ' + err.message);
    } finally {
      setUploadingLocal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (coverImageIndex === index) {
      setCoverImageIndex(0);
    } else if (coverImageIndex > index) {
      setCoverImageIndex(coverImageIndex - 1);
    }
    toast.success('Photo removed.');
  };

  const handleMoveImage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setImages(updated);

    if (coverImageIndex === fromIdx) {
      setCoverImageIndex(toIdx);
    } else if (coverImageIndex === toIdx) {
      setCoverImageIndex(fromIdx);
    }
  };

  // Section 7: Panorama 360 Validator
  const handleValidatePanorama = async (urlToTest) => {
    const url = urlToTest !== undefined ? urlToTest : tour360Url;
    setPanoramaError('');
    setPanoramaValid(false);

    if (!url.trim()) return;

    setValidatingPanorama(true);
    try {
      const res = await validatePanoramaAsset(url.trim());
      if (res.valid) {
        setPanoramaValid(true);
        if (res.warning) {
          toast(res.warning, { icon: '⚠️' });
        } else {
          toast.success('360° Panorama asset verified and calibrated.');
        }
      } else {
        setPanoramaError(res.error || 'Failed to load panorama asset.');
        toast.error(res.error || 'Invalid 360° panorama asset.');
      }
    } finally {
      setValidatingPanorama(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new Error('Please enter a valid listing price.');
      }

      // 1. Edit Mode: strictly restricted to permitted sections (Narrative, Valuation, Photos, Approved 360)
      if (editId) {
        if (!title.trim()) throw new Error('Listing title is required.');
        if (!description.trim()) throw new Error('Architectural narrative description is required.');
        if (!price || isNaN(Number(price)) || Number(price) <= 0) {
          throw new Error('A valid positive asking price or monthly rent is required.');
        }
        if (!images || images.length === 0) {
          throw new Error('At least one verified gallery photo is required.');
        }

        const updatePayload = {
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          images: images.slice(0, 5),
          coverImage: images[coverImageIndex] || images[0] || undefined,
        };

        if (listingType === 'rent') {
          updatePayload.deposit = securityDeposit ? Number(securityDeposit) : undefined;
          updatePayload.securityDeposit = securityDeposit ? Number(securityDeposit) : undefined;
          updatePayload.maintenance = maintenanceFee ? Number(maintenanceFee) : undefined;
          updatePayload.minLease = minLease || undefined;
          updatePayload.noticePeriod = noticePeriod || undefined;
          updatePayload.preferredTenants = preferredTenants || undefined;
        }

        // Only include 360 tour asset if listing has approved Premium status
        if (isAlreadyPremium && tour360Url.trim()) {
          updatePayload.panoramaUrl = tour360Url.trim();
          updatePayload.tour360Url = tour360Url.trim();
        }

        const updatedProp = await updateProperty(editId, updatePayload);
        toast.success(
          updatedProp?.status === 'pending' && initialStatus === 'approved'
            ? 'Listing updated. Price change submitted for moderation review.'
            : 'Listing specifications updated successfully.'
        );
        navigate('/agent/listings');
        return;
      }

      // 2. Add Mode: full creation validation
      if (!title.trim()) throw new Error('Listing title is required.');
      if (!description.trim()) throw new Error('Architectural narrative description is required.');

      let parsedLat = Number(lat);
      let parsedLng = Number(lng);
      if (!locality.trim()) throw new Error('Locality / neighborhood is required.');
      if (!address.trim()) throw new Error('Street address is required.');
      if (!reraId.trim()) throw new Error('State RERA Registration ID is required.');
      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        throw new Error('Valid geographic latitude and longitude coordinates are required for the neighborhood map.');
      }

      if (!images.length) {
        throw new Error('At least one verified gallery photo is required.');
      }

      // Conditional Area Validation
      if (applicability.hasPlotArea) {
        if (!plotArea || isNaN(Number(plotArea)) || Number(plotArea) <= 0) {
          throw new Error('Total plot area in sq ft is required.');
        }
      }

      if (applicability.hasBuiltUpArea) {
        if (!builtUpArea || isNaN(Number(builtUpArea)) || Number(builtUpArea) <= 0) {
          throw new Error('Super built-up area in sq ft is required.');
        }
      }

      // Conditional Floor Fields Validation
      let parsedFloor = undefined;
      let parsedTotalFloors = undefined;

      if (applicability.hasFloorLevel) {
        if (floor === '' || floor === null || isNaN(Number(floor)) || Number(floor) < 0) {
          throw new Error(`Floor level is required for ${formatPropertyType(type)}.`);
        }
        parsedFloor = Number(floor);
      }

      if (applicability.hasTotalFloors) {
        if (totalFloors === '' || totalFloors === null || isNaN(Number(totalFloors)) || Number(totalFloors) < 1) {
          throw new Error(`Total floors is required for ${formatPropertyType(type)}.`);
        }
        parsedTotalFloors = Number(totalFloors);
      }

      if (applicability.hasFloorLevel && applicability.hasTotalFloors) {
        if (parsedFloor > parsedTotalFloors) {
          throw new Error('Floor level cannot exceed total floors in the building.');
        }
      }

      // Security Deposit handling for rental
      let finalDeposit = undefined;
      if (listingType === 'rent') {
        finalDeposit = securityDeposit ? Number(securityDeposit) : parsedPrice * 2;
      }

      // Prepare 360 asset
      let finalTourUrl = tour360Url.trim() || (requestPremium ? PANORAMA_SAMPLE : null);

      // Construct payload: only include attributes that apply to this property's classification & transaction type
      const propertyData = {
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,

        // Architecture & specs
        bedrooms: applicability.hasBedrooms ? (Number(bedrooms) || 0) : undefined,
        bathrooms: applicability.hasBathrooms ? (Number(bathrooms) || 0) : undefined,
        balconies: applicability.hasBalconies ? (Number(balconies) || 0) : undefined,
        builtUpArea: applicability.hasBuiltUpArea ? Number(builtUpArea) : undefined,
        carpetArea: applicability.hasCarpetArea ? (carpetArea ? Number(carpetArea) : Number(builtUpArea) * 0.82) : undefined,
        plotArea: applicability.hasPlotArea ? Number(plotArea) : undefined,
        floor: parsedFloor,
        totalFloors: parsedTotalFloors,
        facing: applicability.hasFacing ? facing : undefined,
        furnishing: applicability.hasFurnishing ? furnishing : undefined,

        // Land-specific attributes
        zoning: applicability.hasZoning ? zoning : undefined,
        boundary: applicability.hasBoundary ? boundary : undefined,
        roadFrontage: applicability.hasRoadFrontage ? roadFrontage : undefined,

        // Commercial & Industrial attributes
        ceilingHeight: applicability.hasCeilingHeight ? ceilingHeight : undefined,
        loadingDocks: applicability.hasLoadingDocks ? (Number(loadingDocks) || undefined) : undefined,
        powerLoad: applicability.hasPowerLoad ? powerLoad : undefined,

        // Regulatory & Sale Terms
        possessionStatus: applicability.hasPossessionStatus ? possessionStatus : undefined,
        age: applicability.hasAge ? age : undefined,

        // Rent Terms
        availableFrom: applicability.hasAvailableFrom ? availableFrom : undefined,
        securityDeposit: applicability.hasSecurityDeposit ? finalDeposit : undefined,
        maintenance: applicability.hasMaintenance ? (Number(maintenance) || 0) : undefined,
        minLease: applicability.hasMinLease ? minLease : undefined,
        noticePeriod: applicability.hasNoticePeriod ? noticePeriod : undefined,
        preferredTenants: applicability.hasPreferredTenants ? preferredTenants : undefined,
        petsAllowed: applicability.hasPetsAllowed ? Boolean(petsAllowed) : undefined,

        // Utilities & Amenities
        parking: applicability.hasParking ? (parking !== '' && !isNaN(Number(parking)) ? Number(parking) : 0) : 0,
        waterSupply: applicability.hasWaterSupply ? waterSupply : undefined,
        powerBackup: applicability.hasPowerBackup ? Boolean(powerBackup) : false,
        security: Boolean(security),
        gated: Boolean(gated),
        lift: applicability.hasLift ? Boolean(lift) : false,
        gym: applicability.hasGym ? Boolean(gym) : false,
        pool: applicability.hasPool ? (pool === 'shared' ? 'shared' : (pool === 'private' || pool === true) ? 'private' : 'none') : 'none',
        garden: applicability.hasGarden ? Boolean(garden) : false,

        approachRoad,
        nearestTransit,
        airportDistance,
        railwayDistance,
        hospitalDistance,
        commercialDistance,

        coverImage: images[coverImageIndex] || images[0],
        images: images.slice(0, 5),
        tour360Url: finalTourUrl,
      };

      if (!editId) {
        // Add mode: write immutable identity fields
        propertyData.listingType = listingType;
        propertyData.type = type;
        propertyData.address = address.trim();
        propertyData.locality = locality.trim();
        propertyData.city = city;
        propertyData.state = state;
        propertyData.pin = pin.trim();
        propertyData.lat = parsedLat;
        propertyData.lng = parsedLng;
        propertyData.reraId = reraId.trim();
        propertyData.ownership = ownership;
      } else if (loadedProp) {
        // Edit mode: strictly preserve original immutable identity fields from verified record
        propertyData.listingType = loadedProp.listingType;
        propertyData.type = loadedProp.type;
        propertyData.address = loadedProp.address;
        propertyData.locality = loadedProp.locality;
        propertyData.city = loadedProp.city;
        propertyData.state = loadedProp.state;
        propertyData.pin = loadedProp.pin;
        propertyData.lat = loadedProp.lat;
        propertyData.lng = loadedProp.lng;
        propertyData.reraId = loadedProp.reraId;
        propertyData.ownership = loadedProp.ownership;
        propertyData.agentId = loadedProp.agentId;
      }

      // Flow: If Premium is requested and not already active -> open simulated checkout first
      // Listing is NOT submitted and no money/charge is processed until checkout confirmation.
      if (requestPremium && !isAlreadyPremium) {
        if (!isPremiumConfigured) {
          toast.error('Premium requests are unavailable until configured by administrators.');
          setSubmitting(false);
          return;
        }

        // Store form draft safely in memory; keep entered form intact
        setPendingSavedProp(propertyData);
        setShowCheckoutModal(true);
        setSubmitting(false);
        return;
      }

      // Standard save (non-premium or already premium)
      if (editId) {
        const updatedProp = await updateProperty(editId, propertyData);
        toast.success(
          updatedProp?.status === 'pending' && initialStatus === 'approved'
            ? 'Listing updated. Core changes submitted for admin review.'
            : 'Listing specifications updated successfully.'
        );
      } else {
        await createProperty(propertyData);
        toast.success('Listing created and submitted to admin review queue.');
      }

      navigate('/agent/listings');
    } catch (err) {
      const msg = err.data?.error?.message || err.message || 'Failed to submit residence.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Simulated Checkout for Premium Request
  const handleConfirmPremiumCheckout = async () => {
    if (!pendingSavedProp || processingCheckout) return;
    setProcessingCheckout(true);

    try {
      // 1. Submit the listing now that checkout is confirmed
      let saved = null;
      if (editId) {
        saved = await updateProperty(editId, pendingSavedProp);
      } else {
        saved = await createProperty(pendingSavedProp);
      }

      if (!saved?.id) throw new Error('Failed to create listing record.');

      // 2. Submit linked Premium request with simulated payment
      await requestPremiumStatus({ propertyId: saved.id });
      toast.success('Listing saved & Premium request submitted with simulated payment!');
      setShowCheckoutModal(false);
      setPendingSavedProp(null);
      navigate('/agent/listings');
    } catch (err) {
      toast.error(err.message || 'Failed to process Premium request.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleCancelPremiumCheckout = () => {
    setShowCheckoutModal(false);
    setProcessingCheckout(false);
    toast('Premium checkout cancelled. Your listing draft is preserved.', { icon: 'ℹ️' });
  };

  const handleSkipPremiumCheckout = async () => {
    if (!pendingSavedProp || processingCheckout) return;
    setProcessingCheckout(true);
    try {
      const nonPremData = {
        ...pendingSavedProp,
        tour360Url: tour360Url.trim() || null,
      };
      setRequestPremium(false);
      if (editId) {
        await updateProperty(editId, nonPremData);
      } else {
        await createProperty(nonPremData);
      }
      toast.success('Listing saved without Premium tier.');
      setShowCheckoutModal(false);
      setPendingSavedProp(null);
      navigate('/agent/listings');
    } catch (err) {
      toast.error(err.message || 'Failed to save listing without Premium.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  if (loadingInitial) {
    return (
      <DashboardLayout role="agent">
        <div className="space-y-6 max-w-6xl w-full mx-auto pb-16">
          <div className="flex items-center gap-2 font-mono text-xs text-dark-gray/60">
            <Building2 className="w-4 h-4 animate-spin text-deep-purple" />
            <span>Loading residence specifications...</span>
          </div>
          <DashboardSkeleton type="cards" />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="p-8 rounded-2xl bg-porcelain border border-charcoal/15 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-sand/60 border border-charcoal/10 flex items-center justify-center mx-auto text-dark-gray/60">
              <AlertTriangle className="w-6 h-6 text-amber-700" />
            </div>
            <h2 className="font-serif text-2xl text-deep-purple font-medium">Residence Not Found</h2>
            <p className="font-sans text-sm text-dark-gray/70 max-w-md mx-auto">
              The requested property listing (ID:{' '}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-sand/80">{editId}</code>) could not be located.
            </p>
            <div className="pt-2">
              <Link
                to="/agent/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to My Listings</span>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (accessDenied) {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="p-8 rounded-2xl bg-porcelain border border-charcoal/15 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl text-deep-purple font-medium">Access Restricted</h2>
            <p className="font-sans text-sm text-dark-gray/70 max-w-md mx-auto">
              You are not authorized to edit this listing. Portfolio editing is strictly restricted to the representing agent.
            </p>
            <div className="pt-2">
              <Link
                to="/agent/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to My Listings</span>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (editBlocked) {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="p-8 rounded-2xl bg-porcelain border border-charcoal/15 text-center space-y-5 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-800">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl text-deep-purple font-medium">Listing Unavailable for Editing</h2>
            <div className="p-4 rounded-xl bg-sand/35 border border-charcoal/15 text-left max-w-md mx-auto space-y-2">
              <div className="font-serif text-base text-charcoal font-medium">{loadedProp?.title || 'Selected Residence'}</div>
              <div className="font-mono text-xs text-dark-gray/60 flex items-center gap-2">
                <span>ID: {loadedProp?.id || editId}</span>
                {loadedProp?.status && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{loadedProp.status}</span>
                  </>
                )}
              </div>
              <p className="font-sans text-xs text-dark-gray/80 pt-1">
                {editBlockedReason || 'This listing is locked because it is involved in an active lease, transaction, or completed acquisition.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/agent/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sand hover:bg-sand/80 border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to My Listings</span>
              </Link>
              {loadedProp?.id && (
                <Link
                  to={`/property/${loadedProp.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs"
                >
                  <span>View Property</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6 max-w-6xl w-full mx-auto pb-16">
        {/* Header */}
        <div className="pb-4 border-b border-charcoal/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/agent/listings"
                className="inline-flex items-center gap-1 font-mono text-xs text-dark-gray/60 hover:text-deep-purple"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Listings</span>
              </Link>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              {editId ? 'Edit Residence Specifications' : 'Add New Property'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {editId && initialStatus === 'approved' && (
              <span className="font-mono text-[11px] text-amber-900 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                Approved Live Listing
              </span>
            )}
            {isAlreadyPremium && (
              <span className="font-mono text-[11px] text-deep-purple bg-deep-purple/10 px-3 py-1.5 rounded-full border border-deep-purple/20 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Verified Premium
              </span>
            )}
          </div>
        </div>

        {/* Verification Warning */}
        {!user?.isVerified && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Your agent account is currently pending verification. Any listings created will be held in pending review status and released once an administrator approves your RERA credentials.
            </p>
          </div>
        )}

        {/* Moderation Warning on Editing Approved Listing */}
        {editId && initialStatus === 'approved' && (
          <div className="p-4 rounded-xl bg-sand/40 border border-charcoal/15 text-xs font-sans text-charcoal flex items-start gap-3">
            <Info className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
            <p>
              <strong>Moderation Note:</strong> If you modify core transactional specifications (such as price, RERA ID, ownership type, or area), this listing will transition to <em>Pending Review</em> and notify administrators for verification before being re-featured publicly.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-sans text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Read-Only Verified Property Identity & Legal Compliance Banner (Edit Mode) */}
        {editId && loadedProp && (
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-charcoal/10 gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-deep-purple" />
                <span className="font-serif text-xl text-deep-purple font-medium">
                  Verified Property Identity & Credentials
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-dark-gray/60 bg-sand/60 px-2.5 py-1 rounded-full border border-charcoal/10">
                  ID: {loadedProp.id}
                </span>
                <span className="font-mono text-xs uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-medium">
                  Verified Immutable
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3 rounded-xl bg-sand/35 border border-charcoal/10">
                <span className="text-dark-gray/60 uppercase block text-[10px] tracking-wider mb-1">
                  Transaction Type
                </span>
                <span className="font-serif text-base text-deep-purple font-medium capitalize">
                  For {loadedProp.listingType || 'sale'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sand/35 border border-charcoal/10">
                <span className="text-dark-gray/60 uppercase block text-[10px] tracking-wider mb-1">
                  Classification
                </span>
                <span className="font-serif text-base text-deep-purple font-medium">
                  {formatPropertyType(loadedProp.type)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sand/35 border border-charcoal/10">
                <span className="text-dark-gray/60 uppercase block text-[10px] tracking-wider mb-1">
                  RERA Registration ID
                </span>
                <span className="font-sans text-xs text-charcoal font-medium">
                  {loadedProp.reraId || 'Verified Record'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sand/35 border border-charcoal/10">
                <span className="text-dark-gray/60 uppercase block text-[10px] tracking-wider mb-1">
                  Legal Ownership
                </span>
                <span className="font-sans text-xs text-charcoal font-medium">
                  {loadedProp.ownership || 'Freehold'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sand/25 border border-charcoal/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 block">
                  Immutable Physical Location
                </span>
                <p className="text-charcoal font-medium">
                  {loadedProp.address}, {loadedProp.locality}, {loadedProp.city}, {loadedProp.state} — {loadedProp.pin}
                </p>
              </div>
              <div className="font-mono text-[11px] text-dark-gray/60 shrink-0">
                GPS: {Number(loadedProp.lat)?.toFixed?.(4) ?? loadedProp.lat}, {Number(loadedProp.lng)?.toFixed?.(4) ?? loadedProp.lng}
              </div>
            </div>

            {/* Read-Only Context: Certified Architectural & Spatial Specifications */}
            <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 space-y-3 font-mono text-xs">
              <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 block font-medium">
                Certified Architectural Facts & Spatial Specifications (Immutable Context)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-charcoal">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Floor Details</span>
                  <span className="font-serif text-sm text-deep-purple font-medium">
                    {floorConfig.isLand
                      ? 'Plot Layout (Unbuilt)'
                      : floorConfig.isStandalone
                      ? `${loadedProp.totalFloors || '1'} Structure Floors`
                      : `Level ${loadedProp.floor ?? '—'} of ${loadedProp.totalFloors ?? '—'}`}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Configuration & Rooms</span>
                  <span className="font-serif text-sm text-deep-purple font-medium">
                    {loadedProp.type === 'plot'
                      ? `Zoning: ${loadedProp.zoning || 'Residential'}`
                      : `${loadedProp.bedrooms || '—'} BHK • ${loadedProp.bathrooms || '—'} Baths`}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Area Specifications</span>
                  <span className="font-serif text-sm text-deep-purple font-medium">
                    {loadedProp.builtUpArea ? `${loadedProp.builtUpArea} sq ft` : loadedProp.plotArea ? `${loadedProp.plotArea} sq ft` : '—'}
                    {loadedProp.carpetArea ? ` (Carpet: ${loadedProp.carpetArea})` : ''}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Entrance Facing</span>
                  <span className="font-serif text-sm text-deep-purple font-medium">
                    {formatFacingDirection(loadedProp.facing)}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Furnishing Condition</span>
                  <span className="font-sans text-xs text-charcoal font-medium">
                    {loadedProp.furnishing || 'Not Applicable'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Water & Power</span>
                  <span className="font-sans text-xs text-charcoal font-medium truncate block" title={loadedProp.waterSupply}>
                    {loadedProp.waterSupply || 'Corporation / Borewell'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Parking Bays</span>
                  <span className="font-sans text-xs text-charcoal font-medium">
                    {loadedProp.parking ? `${loadedProp.parking} designated bays` : 'Available on request'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-dark-gray/60 uppercase block">Approach Road</span>
                  <span className="font-sans text-xs text-charcoal font-medium truncate block">
                    {loadedProp.roadWidth ? `${loadedProp.roadWidth} ft (${loadedProp.roadType || 'Paved'})` : 'Paved municipal road'}
                  </span>
                </div>
              </div>

              {Array.isArray(loadedProp.amenities) && loadedProp.amenities.length > 0 && (
                <div className="pt-2 border-t border-charcoal/10 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase text-dark-gray/60 mr-1">Enclave Amenities:</span>
                  {loadedProp.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-2 py-0.5 rounded-md bg-sand/60 text-charcoal text-[10px] border border-charcoal/10"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="font-sans text-xs text-dark-gray/60 leading-relaxed italic">
              Physical location, title ownership, RERA registration, architectural layout, and property classification are verified immutable records. To modify identity credentials, contact platform compliance administration.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Classification / Narrative & Core Details */}
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
              <Building2 className="w-5 h-5 text-deep-purple" />
              <span>{editId ? '1. Narrative Description & Valuation Terms' : '1. Classification & Core Details'}</span>
            </div>

            {!editId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Listing Type Toggle */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Transaction Type <span className="text-deep-purple">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-sand/40 rounded-xl border border-charcoal/15">
                    <button
                      type="button"
                      onClick={() => handleListingTypeChange('sale')}
                      className={`py-2 px-3 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        listingType === 'sale'
                          ? 'bg-deep-purple text-white shadow-xs font-medium'
                          : 'text-charcoal hover:bg-sand/60'
                      }`}
                    >
                      For Sale
                    </button>
                    <button
                      type="button"
                      onClick={() => handleListingTypeChange('rent')}
                      className={`py-2 px-3 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        listingType === 'rent'
                          ? 'bg-deep-purple text-white shadow-xs font-medium'
                          : 'text-charcoal hover:bg-sand/60'
                      }`}
                    >
                      For Rent
                    </button>
                  </div>
                </div>

                {/* Property Classification: Custom Portal Dropdown */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Property Classification <span className="text-deep-purple">*</span>
                  </label>
                  <PropertyTypeDropdown
                    value={type}
                    onChange={handleTypeChange}
                  />
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                Listing Title <span className="text-deep-purple">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Cunningham Crescent Sky Villa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-serif text-base text-charcoal focus:outline-none focus:border-deep-purple"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                Architectural Narrative Description <span className="text-deep-purple">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Highlight spatial volume, natural illumination, materiality, cross-ventilation, and garden orientation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple leading-relaxed"
              />
            </div>

            {/* Valuation & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  {listingType === 'sale' ? 'Total Asking Price (₹ INR)' : 'Monthly Rent (₹ INR)'}{' '}
                  <span className="text-deep-purple">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  placeholder={listingType === 'sale' ? 'e.g., 38500000' : 'e.g., 85000'}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-none focus:border-deep-purple"
                />
              </div>
            </div>

            {/* Rent Valuation Terms (When in Edit Mode) */}
            {editId && listingType === 'rent' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-charcoal/10 font-mono text-xs">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Security Deposit (₹ INR)
                  </label>
                  <input
                    type="number"
                    placeholder="Defaults to 2x Monthly Rent"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Monthly Maintenance (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 3500"
                    value={maintenanceFee}
                    onChange={(e) => setMaintenance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Minimum Lease Period
                  </label>
                  <select
                    value={minLease}
                    onChange={(e) => setMinLease(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    <option value="6 Months">6 Months</option>
                    <option value="11 Months">11 Months standard</option>
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3+ Years Long Lease">3+ Years Long Lease</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Notice Period
                  </label>
                  <select
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Preferred Tenants
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Families, Working Professionals, Corporate Lease"
                    value={preferredTenants}
                    onChange={(e) => setPreferredTenants(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sections 2 through 6: Initial Creation Details (Only shown in Add Mode, immutable once created) */}
          {!editId && (
            <>
              {/* Section 2: Location & Neighborhood Map Coordinates */}
            <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
                <MapPin className="w-5 h-5 text-deep-purple" />
                <span>2. Location & Neighborhood Map Coordinates</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    City <span className="text-deep-purple">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    {Object.keys(CITY_COORDS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Locality / Neighborhood <span className="text-deep-purple">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Marine Drive / Indiranagar"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    PIN Code <span className="text-deep-purple">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="682001"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Street Address <span className="text-deep-purple">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 42 Waterfront Boulevard, Near Promenade"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple"
                />
              </div>

              {/* Google Maps Link Resolver */}
              <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/15 space-y-3">
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 font-medium">
                  Locate via Google Maps Link (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste Google Maps link (e.g. https://www.google.com/maps/@12.9716,77.5946,17z)"
                    value={googleMapsUrl}
                    onChange={(e) => {
                      setGoogleMapsUrl(e.target.value);
                      if (e.target.value.includes('@') || e.target.value.includes('q=')) {
                        handleParseGoogleMapsUrl(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseGoogleMapsUrl()}
                    className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Locate
                  </button>
                </div>

                {mapLinkSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>{mapLinkSuccess}</span>
                  </div>
                )}

                {mapLinkError && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-900 font-sans">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{mapLinkError}</span>
                  </div>
                )}
              </div>

              {/* Manual Lat/Lng fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Map Latitude <span className="text-deep-purple">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Map Longitude <span className="text-deep-purple">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>
              </div>

              {/* Interactive Leaflet Pin Preview */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-charcoal/70">
                  <span className="font-semibold text-deep-purple">Interactive Leaflet Preview</span>
                  <span className="text-[11px] text-dark-gray/60">
                    Pan: drag map surface • Set location: click map or drag 📍 marker • Zoom: + / − or scroll
                  </span>
                </div>
                {mapTileError && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>External map tile server unavailable. Pin coordinates remain active and accurate.</span>
                  </div>
                )}
                <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-charcoal/20 relative z-0 shadow-inner">
                  <MapContainer
                    center={[Number(lat) || CITY_COORDS[city]?.lat || 12.9716, Number(lng) || CITY_COORDS[city]?.lng || 77.5946]}
                    zoom={14}
                    minZoom={4}
                    maxZoom={18}
                    maxBounds={INDIA_MAX_BOUNDS}
                    maxBoundsViscosity={0.85}
                    scrollWheelZoom={true}
                    dragging={true}
                    doubleClickZoom={true}
                    zoomControl={true}
                    className="w-full h-full"
                    style={{ background: '#F1ECE3' }}
                  >
                    <MapResizeHandler />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="map-tile-beige"
                      maxZoom={19}
                      crossOrigin="anonymous"
                      eventHandlers={{
                        tileerror: () => {
                          setTileErrorCount((c) => {
                            if (c + 1 > 4) setMapTileError(true);
                            return c + 1;
                          });
                        },
                      }}
                    />
                    {lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng)) && (
                      <Marker
                        position={[Number(lat), Number(lng)]}
                        icon={customPinIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const pos = marker.getLatLng();
                            const nextLat = Number(pos.lat.toFixed(6));
                            const nextLng = Number(pos.lng.toFixed(6));
                            setLat(nextLat);
                            setLng(nextLng);
                            setMapLinkSuccess(`Coordinates adjusted: ${nextLat}, ${nextLng}`);
                          },
                        }}
                      />
                    )}
                    <MapLocationPicker
                      onLocationChange={(newLat, newLng) => {
                        setLat(newLat);
                        setLng(newLng);
                        setMapLinkSuccess(`Coordinates adjusted: ${newLat}, ${newLng}`);
                      }}
                    />
                    <MapCenterSynchronizer
                      center={[Number(lat) || CITY_COORDS[city]?.lat || 12.9716, Number(lng) || CITY_COORDS[city]?.lng || 77.5946]}
                    />
                  </MapContainer>
                </div>
              </div>
            </div>

            {/* Section 3: Architecture, Layout & Dimensions */}
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
              <Compass className="w-5 h-5 text-deep-purple" />
              <span>{editId ? '2. Architectural Dimensions & Spatial Layout' : '3. Architectural Dimensions & Spatial Layout'}</span>
            </div>

            {applicability.hasPlotArea ? (
              /* Land / Plot specific layout */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      {applicability.plotAreaLabel} <span className="text-deep-purple">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={plotArea}
                      onChange={(e) => setPlotArea(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Zoning Classification <span className="text-deep-purple">*</span>
                    </label>
                    <select
                      value={zoning}
                      onChange={(e) => setZoning(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value="Residential">Residential Parcel</option>
                      <option value="Commercial">Commercial Zoning</option>
                      <option value="Mixed Use">Mixed Commercial / Residential</option>
                      <option value="Industrial">Industrial Zone</option>
                      <option value="Agricultural">Agricultural / Farm Land</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Perimeter Boundary / Fencing
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Stone walled with iron gate"
                      value={boundary}
                      onChange={(e) => setBoundary(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Road Frontage Access
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 45 ft road frontage"
                      value={roadFrontage}
                      onChange={(e) => setRoadFrontage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Plot Facing
                    </label>
                    <select
                      value={facing}
                      onChange={(e) => setFacing(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      {ENTRANCE_FACING_DIRECTIONS.map((dir) => (
                        <option key={dir} value={dir}>{dir}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Built property layout (Residential / Commercial / Industrial) */
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {applicability.hasBedrooms && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        Bedrooms (BHK) <span className="text-deep-purple">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}

                  {applicability.hasBathrooms && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        {applicability.bathroomsLabel} <span className="text-deep-purple">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}

                  {applicability.hasBalconies && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        Balconies
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={balconies}
                        onChange={(e) => setBalconies(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}

                  {applicability.hasFloorLevel && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        {applicability.floorLabel} <span className="text-deep-purple">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        placeholder="e.g. 7"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}

                  {applicability.hasTotalFloors && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        {applicability.totalFloorsLabel} <span className="text-deep-purple">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        placeholder="e.g. 18"
                        value={totalFloors}
                        onChange={(e) => setTotalFloors(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      {applicability.builtUpAreaLabel} <span className="text-deep-purple">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={builtUpArea}
                      onChange={(e) => setBuiltUpArea(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  {applicability.hasCarpetArea && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        Carpet Area (sq ft)
                      </label>
                      <input
                        type="number"
                        min="50"
                        value={carpetArea}
                        onChange={(e) => setCarpetArea(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}

                  {applicability.hasFacing && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        Entrance Facing
                      </label>
                      <select
                        value={facing}
                        onChange={(e) => setFacing(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                      >
                        {ENTRANCE_FACING_DIRECTIONS.map((dir) => (
                          <option key={dir} value={dir}>{dir}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Commercial & Industrial Specific Attributes */}
                {(applicability.hasCeilingHeight || applicability.hasLoadingDocks || applicability.hasPowerLoad) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 p-3 rounded-xl bg-sand/30 border border-charcoal/15">
                    {applicability.hasCeilingHeight && (
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                          Clear Ceiling Height
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 32 ft"
                          value={ceilingHeight}
                          onChange={(e) => setCeilingHeight(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                        />
                      </div>
                    )}

                    {applicability.hasLoadingDocks && (
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                          Automated Loading Bays
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          placeholder="e.g., 8 bays"
                          value={loadingDocks}
                          onChange={(e) => setLoadingDocks(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                        />
                      </div>
                    )}

                    {applicability.hasPowerLoad && (
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                          Dedicated Power Load
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 120 kVA"
                          value={powerLoad}
                          onChange={(e) => setPowerLoad(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Restored 3-Button Furnishing Status Control */}
                {applicability.hasFurnishing && (
                  <div className="sm:w-2/3 pt-1">
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Furnishing Status
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-sand/40 rounded-xl border border-charcoal/15">
                      {['Fully Furnished', 'Semi-Furnished', 'Unfurnished'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFurnishing(opt)}
                          className={`py-2 px-3 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[44px] ${
                            furnishing === opt
                              ? 'bg-deep-purple text-white shadow-xs font-medium'
                              : 'text-charcoal hover:bg-sand/60'
                          }`}
                          aria-pressed={furnishing === opt}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Compliance & Lease/Ownership Terms */}
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
              <ShieldCheck className="w-5 h-5 text-deep-purple" />
              <span>{editId ? '3. Regulatory Compliance & Terms' : '4. Regulatory Compliance & Terms'}</span>
            </div>

            {!editId && (
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  State RERA Registration ID <span className="text-deep-purple">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., K-RERA/PRJ/ERN/0045/2026 or PRM/KA/RERA/..."
                  value={reraId}
                  onChange={(e) => setReraId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                />
              </div>
            )}

            {applicability.isSale ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {applicability.hasPossessionStatus && (
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Possession Status
                    </label>
                    <select
                      value={possessionStatus}
                      onChange={(e) => setPossessionStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value="Ready to Move">Ready to Move</option>
                      <option value="Under Construction">Under Construction</option>
                      <option value="New Launch">New Launch</option>
                      <option value="Immediate">Immediate Possession / Registration</option>
                    </select>
                  </div>
                )}

                {applicability.hasAge && (
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Property Age
                    </label>
                    <select
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value="New Construction">New Construction</option>
                      <option value="1 to 3 Years">1 to 3 Years</option>
                      <option value="3 to 7 Years">3 to 7 Years</option>
                      <option value="Historic / Restored Heritage">Historic / Heritage</option>
                    </select>
                  </div>
                )}

                {!editId && (
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Ownership Title
                    </label>
                    <select
                      value={ownership}
                      onChange={(e) => setOwnership(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value="Freehold">Freehold Title</option>
                      <option value="Cooperative Society">Cooperative Society</option>
                      <option value="Leasehold (99 Yrs)">Leasehold</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Security Deposit (₹ INR)
                  </label>
                  <input
                    type="number"
                    placeholder="Defaults to 2x Monthly Rent"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                {applicability.hasMaintenance && (
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Monthly Society Maintenance (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 3500"
                      value={maintenance}
                      onChange={(e) => setMaintenance(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Available From
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Immediate / Nov 15"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Minimum Lease Lock-in
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 11 Months"
                    value={minLease}
                    onChange={(e) => setMinLease(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Notice Period
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1 Month"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Preferred Tenants
                  </label>
                  <select
                    value={preferredTenants}
                    onChange={(e) => setPreferredTenants(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    <option value="Open to All">Open to All</option>
                    <option value="Family Only">Family Only</option>
                    <option value="Bachelors / Corporate">Bachelors / Corporate</option>
                    <option value="Corporate MNCs">Corporate MNCs</option>
                    <option value="Retail / Studios">Retail / Studios</option>
                  </select>
                </div>

                {applicability.hasPetsAllowed && (
                  <div className="sm:col-span-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal">
                      <input
                        type="checkbox"
                        checked={petsAllowed}
                        onChange={(e) => setPetsAllowed(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                      />
                      <span>Pets permitted in residence</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Essential Utilities & Amenities */}
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
              <Layers className="w-5 h-5 text-deep-purple" />
              <span>{editId ? '4. Essential Utilities & Amenities' : '5. Essential Utilities & Amenities'}</span>
            </div>

            {!applicability.isLand ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {applicability.hasParking && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        {applicability.parkingLabel}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        placeholder="e.g., 2 bays"
                        value={parking}
                        onChange={(e) => setParking(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                      />
                    </div>
                  )}

                  {applicability.hasWaterSupply && (
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                        Water Supply Architecture
                      </label>
                      <select
                        value={waterSupply}
                        onChange={(e) => setWaterSupply(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer min-h-[44px]"
                      >
                        <option value="Corporation Supply">Corporation Supply</option>
                        <option value="Borewell + Municipal">Borewell + Municipal</option>
                        <option value="Well">Well</option>
                        <option value="24/7 Treated Water">24/7 Treated Water</option>
                        {waterSupply &&
                          !['Corporation Supply', 'Borewell + Municipal', 'Well', '24/7 Treated Water'].includes(
                            waterSupply
                          ) && <option value={waterSupply}>{waterSupply}</option>}
                      </select>
                    </div>
                  )}
                </div>

                {/* Checkbox grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {applicability.hasPowerBackup && (
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                      <input
                        type="checkbox"
                        checked={powerBackup}
                        onChange={(e) => setPowerBackup(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                      />
                      <span>100% Power Backup</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                    <input
                      type="checkbox"
                      checked={security}
                      onChange={(e) => setSecurity(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                    />
                    <span>24/7 Manned Security</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                    <input
                      type="checkbox"
                      checked={gated}
                      onChange={(e) => setGated(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                    />
                    <span>Gated Perimeter</span>
                  </label>

                  {applicability.hasLift && (
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                      <input
                        type="checkbox"
                        checked={lift}
                        onChange={(e) => setLift(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                      />
                      <span>High-Speed Elevators</span>
                    </label>
                  )}

                  {applicability.hasGym && (
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                      <input
                        type="checkbox"
                        checked={gym}
                        onChange={(e) => setGym(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                      />
                      <span>Residents Gymnasium</span>
                    </label>
                  )}

                  {applicability.hasPool && (
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                      <input
                        type="checkbox"
                        checked={pool}
                        onChange={(e) => setPool(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                      />
                      <span>Swimming Pool</span>
                    </label>
                  )}

                  {applicability.hasGarden && (
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                      <input
                        type="checkbox"
                        checked={garden}
                        onChange={(e) => setGarden(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                      />
                      <span>Landscaped Garden</span>
                    </label>
                  )}
                </div>
              </>
            ) : (
              /* Plot utilities */
              <div className="space-y-3">
                <p className="font-sans text-xs text-dark-gray/60 leading-relaxed">
                  Vacant land and plot parcels are characterized by perimeter security, road accessibility, and municipal connection readiness.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                    <input
                      type="checkbox"
                      checked={security}
                      onChange={(e) => setSecurity(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                    />
                    <span>24/7 Gated Perimeter Security</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-charcoal p-2.5 rounded-xl bg-sand/30 border border-charcoal/10">
                    <input
                      type="checkbox"
                      checked={gated}
                      onChange={(e) => setGated(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple"
                    />
                    <span>Gated Layout Access</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Urban Connectivity */}
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
              <Compass className="w-5 h-5 text-deep-purple" />
              <span>{editId ? '5. Urban Access & Transit Distances' : '6. Urban Access & Transit Distances'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Approach Road
                </label>
                <input
                  type="text"
                  value={approachRoad}
                  placeholder="e.g. 40 ft wide paved arterial road"
                  onChange={(e) => setApproachRoad(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-deep-purple"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Metro / Transit Station
                </label>
                <input
                  type="text"
                  value={nearestTransit}
                  placeholder="e.g. 800m (10 min walk to MG Road Metro)"
                  onChange={(e) => setNearestTransit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-deep-purple"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Airport Distance
                </label>
                <input
                  type="text"
                  value={airportDistance}
                  placeholder="e.g. 28 km (approx. 40 mins via express highway)"
                  onChange={(e) => setAirportDistance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-deep-purple"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Railway Station
                </label>
                <input
                  type="text"
                  value={railwayDistance}
                  placeholder="e.g. 5.5 km from Central Junction"
                  onChange={(e) => setRailwayDistance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-deep-purple"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Hospital
                </label>
                <input
                  type="text"
                  value={hospitalDistance}
                  placeholder="e.g. 1.8 km from Apollo Multispeciality"
                  onChange={(e) => setHospitalDistance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-deep-purple"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                  Market / Commercial Hub
                </label>
                <input
                  type="text"
                  value={commercialDistance}
                  placeholder="e.g. 1.2 km from commercial retail hub"
                  onChange={(e) => setCommercialDistance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-deep-purple"
                />
              </div>
            </div>
          </div>
        </>
      )}

          {/* Section 7 (Add Mode) / Section 2 (Edit Mode): Five-Photo Gallery & 360° Virtual Tour */}
          <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
              <Camera className="w-5 h-5 text-deep-purple" />
              <span>{editId ? '2. Five-Photo Architectural Gallery & 360° Tour' : '7. Five-Photo Architectural Gallery & 360° Tour'}</span>
            </div>

            {/* Gallery Images Container (Limit 5) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/90 font-medium">
                    Gallery Photos ({images.length} / 5) <span className="text-deep-purple">*</span>
                  </label>
                  <p className="font-sans text-xs text-dark-gray/60 mt-0.5">
                    Maximum 5 photos combined across local uploads and URLs. Select one as primary cover.
                  </p>
                </div>
                <span className="font-mono text-xs text-dark-gray/60">
                  {images.length === 5 ? (
                    <span className="text-emerald-800 font-medium">Full Capacity (5/5)</span>
                  ) : (
                    <span>{5 - images.length} slot(s) remaining</span>
                  )}
                </span>
              </div>

              {/* 5-Photo Uniform Contain Preview Grid */}
              {images.length === 0 ? (
                <div className="p-8 rounded-2xl bg-sand/20 border-2 border-dashed border-charcoal/20 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-sand/60 flex items-center justify-center mx-auto text-charcoal/60">
                    <Camera className="w-6 h-6 text-deep-purple/70" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-serif text-base text-charcoal font-medium">No gallery photos added yet</div>
                    <p className="font-sans text-xs text-dark-gray/60 max-w-sm mx-auto">
                      Select up to 5 photos from your device or paste high-resolution image URLs below. The first photo serves as the primary cover.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {images.map((img, idx) => {
                    const hasFailed = failedImages[idx];
                    return (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all group bg-sand/30 flex flex-col justify-between ${
                          coverImageIndex === idx
                            ? 'border-deep-purple ring-2 ring-deep-purple/20 shadow-xs'
                            : 'border-charcoal/15 hover:border-charcoal/30'
                        }`}
                      >
                        {/* Uniform 4:3 container with contained full photo & blurred backdrop */}
                        <div className="relative aspect-4/3 w-full overflow-hidden bg-sand/50 flex items-center justify-center p-1">
                          {hasFailed ? (
                            <div className="flex flex-col items-center justify-center p-2 text-center space-y-1">
                              <AlertTriangle className="w-5 h-5 text-amber-700/70" />
                              <span className="font-mono text-[9px] text-charcoal/70">Preview unavailable</span>
                            </div>
                          ) : (
                            <>
                              {/* Ambient background blur */}
                              <img
                                src={img}
                                alt=""
                                aria-hidden="true"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className="absolute inset-0 w-full h-full object-cover blur-xs opacity-25 scale-110 pointer-events-none select-none"
                              />

                              {/* Full uncropped photo preserved without accidental cropping */}
                              <img
                                src={img}
                                alt={`Photo ${idx + 1}`}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  setFailedImages((prev) => ({ ...prev, [idx]: true }));
                                }}
                                className="relative z-10 max-w-full max-h-full object-contain cursor-pointer transition-transform group-hover:scale-102"
                                onClick={() => setCoverImageIndex(idx)}
                              />
                            </>
                          )}

                          {/* Number badge */}
                          <span className="absolute bottom-1.5 left-1.5 z-20 bg-black/65 backdrop-blur-xs text-white font-mono text-[10px] px-1.5 py-0.5 rounded shadow-xs">
                            #{idx + 1}
                          </span>

                          {/* Cover Badge */}
                          {coverImageIndex === idx && (
                            <span className="absolute top-1.5 left-1.5 z-20 bg-deep-purple text-electric-lemon font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold shadow-xs flex items-center gap-1 border border-deep-purple/30">
                              ★ Cover
                            </span>
                          )}

                          {/* Inspect Zoom Action */}
                          {!hasFailed && (
                            <button
                              type="button"
                              onClick={() => setInspectImageIndex(idx)}
                              className="absolute top-1.5 right-8 z-20 p-1 bg-charcoal/80 hover:bg-deep-purple text-white rounded-md transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-xs"
                              title="Inspect photo uncropped"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 z-20 p-1 bg-charcoal/80 hover:bg-rose-600 text-white rounded-md transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-xs"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Actions bar */}
                        <div className="p-1.5 bg-porcelain flex items-center justify-between border-t border-charcoal/10 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setCoverImageIndex(idx)}
                            className={`hover:underline cursor-pointer flex items-center gap-1 ${
                              coverImageIndex === idx ? 'text-deep-purple font-bold' : 'text-dark-gray/70'
                            }`}
                          >
                            {coverImageIndex === idx ? '★ Primary Cover' : 'Set Cover'}
                          </button>

                          <div className="flex items-center gap-1">
                            {!hasFailed && (
                              <button
                                type="button"
                                onClick={() => setInspectImageIndex(idx)}
                                className="p-0.5 text-dark-gray/60 hover:text-deep-purple cursor-pointer"
                                title="Inspect Photo"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveImage(idx, idx - 1)}
                              className="p-0.5 text-dark-gray/60 hover:text-charcoal disabled:opacity-20 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === images.length - 1}
                              onClick={() => handleMoveImage(idx, idx + 1)}
                              className="p-0.5 text-dark-gray/60 hover:text-charcoal disabled:opacity-20 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Photo Controls (Local Upload + URL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Device Upload */}
                <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-charcoal font-medium">
                      Upload from Device
                    </span>
                    <span className="font-mono text-[10px] text-dark-gray/50">JPG, PNG, WebP</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLocalFileUpload}
                  />
                  <button
                    type="button"
                    disabled={uploadingLocal || images.length >= 5}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-porcelain hover:bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-deep-purple" />
                    <span>{uploadingLocal ? 'Compressing photos...' : 'Select Device Photos'}</span>
                  </button>
                  <p className="font-sans text-[11px] text-dark-gray/60">
                    Client-side compression (WebP 82%) keeps storage lightweight.
                  </p>
                </div>

                {/* Add from URL */}
                <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/15 space-y-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-charcoal font-medium block">
                    Add via Direct URL
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newImageUrl}
                      onChange={(e) => {
                        setNewImageUrl(e.target.value);
                        setUrlError('');
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-porcelain border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                    <button
                      type="button"
                      disabled={validatingUrl || images.length >= 5 || !newImageUrl.trim()}
                      onClick={handleAddImageUrl}
                      className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 shadow-2xs whitespace-nowrap"
                    >
                      {validatingUrl ? 'Validating...' : 'Add URL'}
                    </button>
                  </div>
                  {urlError && <p className="font-sans text-xs text-rose-700">{urlError}</p>}
                  <p className="font-sans text-[11px] text-dark-gray/60">
                    URLs are verified for accessibility before adding.
                  </p>
                </div>
              </div>
            </div>

            {/* 360° Virtual Tour & Premium Promotion Gating */}
            <div className="pt-5 border-t border-charcoal/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-serif text-lg text-charcoal font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>360° Panorama Virtual Tour</span>
                    {isAlreadyPremium ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Active Premium Tier
                      </span>
                    ) : requestPremium ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/20">
                        Premium Requested
                      </span>
                    ) : null}
                  </div>
                  <p className="font-sans text-xs text-dark-gray/60 mt-0.5">
                    Interactive 360° spherical walk-through rendered in WebGL. Strictly controlled by Premium tier status.
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs text-charcoal font-medium">
                    Fee: ₹{premiumFee.toLocaleString('en-IN')} (Simulated)
                  </span>
                </div>
              </div>

              {/* Premium Request & 360° Access Workflow */}
              {editId ? (
                /* Edit Mode: 360 virtual tour can be edited ONLY when listing already has approved Premium tier */
                !isAlreadyPremium ? (
                  <div className="p-4 rounded-xl bg-sand/35 border border-charcoal/15 space-y-3">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-serif text-base text-deep-purple font-medium">
                          360° Virtual Tour Requires Approved Premium Status
                        </h4>
                        <p className="font-sans text-xs text-dark-gray/70 leading-relaxed">
                          Interactive spherical 360° virtual tours and homepage showcase placement are reserved exclusively for listings with verified Premium status. Direct field activation is prohibited; promotions require simulated payment and administrative curation.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-charcoal/10">
                      <span className="font-mono text-xs text-dark-gray/60">
                        Placement fee: ₹{premiumFee.toLocaleString('en-IN')} (30-day duration)
                      </span>
                      <Link
                        to={`/agent/promotions?propertyId=${loadedProp?.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <span>Request Premium Promotion</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : null
              ) : (
                /* Add Mode: Premium Request Toggle Card */
                <div className="p-4 rounded-xl bg-sand/35 border border-charcoal/15 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestPremium}
                      onChange={(e) => setRequestPremium(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-charcoal/20 text-deep-purple focus:ring-deep-purple mt-0.5"
                    />
                    <div className="space-y-1">
                      <span className="font-sans text-xs text-charcoal font-semibold block">
                        Request Verified Premium Listing Status & 360° Tour
                      </span>
                      <p className="font-sans text-xs text-dark-gray/70 leading-relaxed">
                        Enables the 360° interactive virtual walkthrough and attaches the exclusive Premium badge across search results, map previews, and detail pages once approved by administrators.
                      </p>
                    </div>
                  </label>

                  {!isPremiumConfigured && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-sans">
                      Premium promotion requests are currently unconfigured by administrators. You can still save this listing without Premium tier.
                    </div>
                  )}
                </div>
              )}

              {/* 360 Tour Asset Input (Visible when Premium is requested or already Premium) */}
              {(requestPremium || isAlreadyPremium) && (
                <div className="space-y-4 p-4 rounded-xl bg-porcelain border border-charcoal/20">
                  <div className="space-y-1">
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal font-medium">
                      Equirectangular 360° Panorama Asset URL or File
                    </label>
                    <p className="font-sans text-xs text-dark-gray/60">
                      Asset specifications: 2:1 spherical equirectangular projection (JPG, WebP, PNG). Recommended resolution: 4096×2048 or 2048×1024.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="Paste 360 panorama image URL or click sample..."
                      value={tour360Url}
                      onChange={(e) => {
                        setTour360Url(e.target.value);
                        setPanoramaError('');
                        setPanoramaValid(false);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setTour360Url(PANORAMA_SAMPLE);
                        handleValidatePanorama(PANORAMA_SAMPLE);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase text-charcoal transition-colors cursor-pointer"
                    >
                      Use Sample Tour
                    </button>
                    <button
                      type="button"
                      disabled={validatingPanorama || !tour360Url.trim()}
                      onClick={() => handleValidatePanorama()}
                      className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {validatingPanorama ? 'Testing...' : 'Test Asset'}
                    </button>
                  </div>

                  {panoramaError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 font-sans">
                      {panoramaError}
                    </div>
                  )}

                  {/* Live Panorama Viewer Preview */}
                  {tour360Url.trim() && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-mono text-charcoal/70">
                        <span>Interactive 360° Preview</span>
                        <span className="text-[11px] text-emerald-800">Drag to look around</span>
                      </div>
                      <PanoramaViewer panoramaUrl={tour360Url.trim()} height="300px" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-charcoal/10">
            <Link
              to="/agent/listings"
              className="px-5 py-2.5 rounded-xl bg-sand/50 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              {submitting ? (
                <span>Saving specifications...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {requestPremium && !isAlreadyPremium
                      ? 'Save & Proceed to Premium Checkout'
                      : editId
                      ? 'Save Permitted Edits'
                      : 'Submit for Admin Approval'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Simulated Premium Checkout Modal */}
        {showCheckoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-porcelain border border-charcoal/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 font-serif text-2xl text-deep-purple font-medium">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                  <span>Simulated Premium Checkout</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPremiumCheckout}
                  className="p-1 rounded-lg text-dark-gray/60 hover:text-charcoal cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-sand/40 border border-charcoal/10 space-y-2 text-xs font-sans">
                  <div className="font-serif text-base text-charcoal font-medium">
                    {pendingSavedProp?.title || title}
                  </div>
                  <div className="flex items-center justify-between font-mono pt-1">
                    <span className="text-dark-gray/70">Promotion Fee:</span>
                    <span className="font-bold text-charcoal text-sm">
                      ₹{premiumFee.toLocaleString('en-IN')} (Simulated)
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">Badge Duration:</span>
                    <span className="text-charcoal">30 Days</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">360° Tour Asset:</span>
                    <span className="text-emerald-800 font-medium">Calibrated & Linked</span>
                  </div>
                </div>

                {/* Simulated Payment Method Selection */}
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal block">
                    Select Demo Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['card', 'upi', 'netbanking'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCheckoutPaymentMethod(method)}
                        className={`py-2 px-3 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          checkoutPaymentMethod === method
                            ? 'bg-deep-purple text-white border-deep-purple shadow-xs font-medium'
                            : 'bg-porcelain border-charcoal/20 text-charcoal hover:bg-sand/40'
                        }`}
                      >
                        {method === 'card' ? 'Card' : method === 'upi' ? 'UPI' : 'Net Banking'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-950 flex items-start gap-2.5">
                  <CreditCard className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <p>
                    <strong>Simulated Demo Payment:</strong> No actual money is charged. This logs a promotion transaction in your ledger and sends the Premium request to platform administrators for architectural review.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={handleSkipPremiumCheckout}
                    className="w-full sm:w-auto px-4 py-2 font-mono text-xs uppercase text-charcoal/70 hover:text-charcoal underline cursor-pointer"
                  >
                    Continue without Premium
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleCancelPremiumCheckout}
                      className="px-4 py-2 rounded-xl font-mono text-xs uppercase text-charcoal/70 hover:text-charcoal cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={processingCheckout}
                      onClick={handleConfirmPremiumCheckout}
                      className="px-5 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {processingCheckout ? 'Processing Demo...' : 'Confirm & Complete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Lightbox / Zoom Photo Inspection Modal */}
        {inspectImageIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm"
            onClick={() => setInspectImageIndex(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center bg-charcoal/95 rounded-2xl p-4 shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 text-porcelain font-mono text-xs border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span>Photo {inspectImageIndex + 1} of {images.length}</span>
                  {coverImageIndex === inspectImageIndex && (
                    <span className="bg-deep-purple text-electric-lemon px-2 py-0.5 rounded text-[10px] uppercase font-semibold">
                      ★ Primary Cover
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setInspectImageIndex(null)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Close inspection"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full h-[65vh] flex items-center justify-center p-2 overflow-hidden bg-charcoal/40 rounded-xl my-2">
                <img
                  src={images[inspectImageIndex]}
                  alt={`Uncropped preview ${inspectImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>

              <div className="w-full flex items-center justify-between pt-2 border-t border-white/10 font-mono text-xs">
                <button
                  type="button"
                  disabled={inspectImageIndex === 0}
                  onClick={() => setInspectImageIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCoverImageIndex(inspectImageIndex);
                    toast.success('Selected as primary cover photo.');
                  }}
                  className={`px-4 py-1.5 rounded-lg font-mono text-xs uppercase cursor-pointer transition-colors ${
                    coverImageIndex === inspectImageIndex
                      ? 'bg-deep-purple text-electric-lemon font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {coverImageIndex === inspectImageIndex ? '★ Primary Cover' : 'Set as Cover'}
                </button>

                <button
                  type="button"
                  disabled={inspectImageIndex === images.length - 1}
                  onClick={() => setInspectImageIndex((prev) => Math.min(images.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AgentNewListingPage;
