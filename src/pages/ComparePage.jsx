import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import * as propertyService from '@/services/properties';
import * as compareService from '@/services/compare';
import { SmartImage } from '@/components/media/SmartImage';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { formatINR, formatINRPieces, formatArea, RupeeSymbol } from '@/lib/formatINR';
import { X, Check, Minus, Plus, Columns, ChevronLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

function checkAmenity(property, amenity) {
  if (!property) return false;
  return (
    (property.amenities || []).some((a) =>
      a.toLowerCase().includes(amenity.toLowerCase().split(' ')[0])
    ) ||
    (amenity.includes('Pool') && property.pool && property.pool !== 'none') ||
    (amenity.includes('Gym') && property.gym) ||
    (amenity.includes('Power') && property.powerBackup) ||
    (amenity.includes('Security') && property.security)
  );
}

export function ComparePage({ inDashboard = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeType, setActiveType] = useState('sale'); // 'sale' | 'rent'
  const [comparedProperties, setComparedProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize from URL ids or compareService
  useEffect(() => {
    let active = true;
    setLoading(true);

    propertyService.getProperties({ pageSize: 40 }).then((res) => {
      if (!active) return;
      setAllProperties(res.data);

      const urlIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
      const queryType = searchParams.get('type');
      const targetType = queryType === 'rent' ? 'rent' : 'sale';
      setActiveType(targetType);

      if (urlIds.length > 0) {
        // Only load properties strictly matching targetType to prevent Buy/Rent leakage
        const validMatches = res.data.filter((p) => urlIds.includes(p.id) && p.listingType === targetType);
        // Explicitly add any URL-specified properties without toggling off existing ones
        validMatches.forEach((prop) => {
          compareService.addCompare(prop, targetType);
        });
      }

      // Read current store state (do NOT inject fake/default properties on empty state)
      const stored = compareService.getCompareList(targetType);
      setComparedProperties(stored);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [searchParams]);

  // Subscribe to compareService for live sync
  useEffect(() => {
    const unsubscribe = compareService.subscribeToCompare((state) => {
      const currentList = state[activeType] || [];
      setComparedProperties(currentList);
    });
    return unsubscribe;
  }, [activeType]);

  const handleSwitchType = (type) => {
    setActiveType(type);
    setSearchParams({ type });
    const stored = compareService.getCompareList(type);
    setComparedProperties(stored);
  };

  const handleRemoveProperty = (id) => {
    compareService.removeCompare(id, activeType);
    const currentUrlIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    const remainingIds = currentUrlIds.filter((urlId) => urlId !== id);
    if (remainingIds.length > 0) {
      setSearchParams({ type: activeType, ids: remainingIds.join(',') });
    } else {
      setSearchParams({ type: activeType });
    }
    toast.success('Removed from comparison');
  };

  const handleRemoveAll = () => {
    compareService.clearCompare(activeType);
    setSearchParams({ type: activeType });
    toast.success(`Removed all ${activeType === 'rent' ? 'rental' : 'sale'} properties from comparison`);
  };

  const handleAddThirdProperty = (prop) => {
    const res = compareService.addCompare(prop, activeType);
    if (!res.success) {
      toast.error(res.message);
    } else if (res.action === 'already_added') {
      toast.success(`${prop.title} is already in comparison`);
    } else {
      toast.success(`Added ${prop.title} to compare`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center font-mono text-xs text-dark-gray/60">
        Loading comparative analytics...
      </div>
    );
  }

  const isRent = activeType === 'rent';
  const availableToAdd = allProperties
    .filter((p) => p.listingType === activeType && !comparedProperties.some((c) => c.id === p.id))
    .slice(0, 5);

  return (
    <div className={inDashboard ? "space-y-6 w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 overflow-x-hidden w-full"}>
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          {!inDashboard && (
            <button
              onClick={() => navigate(isRent ? '/rent' : '/buy')}
              className="inline-flex items-center gap-2 font-mono text-xs font-medium text-dark-gray hover:text-deep-purple bg-sand/40 border border-dark-gray/25 px-3 py-2 rounded-xl transition-all mb-3 cursor-pointer min-h-[38px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to {isRent ? 'Rental Listings' : 'Sale Listings'}</span>
            </button>
          )}
          <div className="font-mono text-[11px] sm:text-xs uppercase text-heather-purple tracking-widest">
            {inDashboard ? 'Specification Matrix' : 'Architectural Evaluation'}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-deep-purple tracking-tight">
            Compare Sanctuaries
          </h1>
          <p className="font-sans text-xs sm:text-sm text-dark-gray/70 mt-1 max-w-xl">
            Side-by-side spec comparison across dimensions, compliance, and living parameters.
          </p>
        </div>

        {/* Top Controls: Type Switcher & Remove All Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-auto w-full sm:w-auto">
          {/* Type Switcher (Buy vs Rent Comparisons are Strictly Separated) */}
          <div className="p-1 rounded-2xl bg-sand/60 border border-dark-gray/15 flex items-center gap-1 font-mono text-xs shadow-inner flex-1 sm:flex-initial justify-center">
            <button
              type="button"
              onClick={() => handleSwitchType('sale')}
              className={`flex-1 sm:flex-initial py-2 px-3 sm:px-4 rounded-xl font-medium transition-all cursor-pointer min-h-[40px] text-center ${
                !isRent
                  ? 'bg-deep-purple text-porcelain shadow-xs font-bold'
                  : 'text-dark-gray/70 hover:text-dark-gray'
              }`}
            >
              Sale ({compareService.getCompareList('sale').length})
            </button>
            <button
              type="button"
              onClick={() => handleSwitchType('rent')}
              className={`flex-1 sm:flex-initial py-2 px-3 sm:px-4 rounded-xl font-medium transition-all cursor-pointer min-h-[40px] text-center ${
                isRent
                  ? 'bg-deep-purple text-porcelain shadow-xs font-bold'
                  : 'text-dark-gray/70 hover:text-dark-gray'
              }`}
            >
              Rent ({compareService.getCompareList('rent').length})
            </button>
          </div>

          {/* Remove All Button (Active Category Only) */}
          {comparedProperties.length > 0 && (
            <button
              type="button"
              onClick={handleRemoveAll}
              className="inline-flex items-center justify-center gap-1.5 font-mono text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs min-h-[40px] shrink-0"
              title={`Remove all ${isRent ? 'rental' : 'sale'} properties`}
              aria-label="Remove all from comparison"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove all</span>
            </button>
          )}
        </div>
      </div>

      {/* INSUFFICIENT STATE (Fewer than 2 properties) */}
      {comparedProperties.length < 2 ? (
        <div className="space-y-6 max-w-xl mx-auto my-8">
          <div className="text-center py-12 px-5 sm:px-6 border border-dashed border-dark-gray/25 rounded-3xl bg-porcelain/60 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-sand/80 text-deep-purple flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Columns className="w-7 h-7" />
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl text-deep-purple mb-2">
              {comparedProperties.length === 0
                ? 'No properties selected'
                : 'Add at least 2 properties to compare'}
            </h3>

            <p className="font-mono text-xs text-dark-gray/65 max-w-md mx-auto mb-6 leading-relaxed">
              {comparedProperties.length === 0
                ? `Select up to 3 ${isRent ? 'rental' : 'sale'} properties from the browse listings or map to inspect side-by-side specifications.`
                : `Side-by-side comparison requires at least 2 ${isRent ? 'rental' : 'sale'} properties. You currently have 1 property queued.`}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={isRent ? '/rent' : '/buy'} className="w-full sm:w-auto">
                <Button variant="dark" className="w-full sm:w-auto min-h-[42px] text-xs font-mono uppercase tracking-wider py-2.5 px-6">
                  Browse {isRent ? 'Rental' : 'Sale'} Listings
                </Button>
              </Link>
              {comparedProperties.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleRemoveAll}
                  className="w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider py-2.5 px-4 text-rose-700 hover:text-rose-900 border-rose-200 hover:border-rose-300 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove all
                </Button>
              )}
            </div>
          </div>

          {/* If 1 property is queued, show it + Quick Add to immediately complete comparison on mobile and desktop */}
          {comparedProperties.length === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-dark-gray/60 px-1">
                Currently Queued Sanctuary:
              </div>
              <div className="rounded-2xl border border-dark-gray/15 bg-porcelain p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-36 aspect-[16/9] sm:aspect-[4/3] rounded-xl overflow-hidden bg-sand shrink-0">
                  <SmartImage src={comparedProperties[0].coverImage || comparedProperties[0].images?.[0]} alt={comparedProperties[0].title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full space-y-1 text-left">
                  <h4 className="font-serif text-lg text-deep-purple font-medium line-clamp-1">{comparedProperties[0].title}</h4>
                  <div className="font-mono text-xs text-dark-gray/60">{comparedProperties[0].locality ? `${comparedProperties[0].locality}, ` : ''}{comparedProperties[0].city}</div>
                  <div className="font-serif text-lg text-dark-gray font-normal flex items-baseline">
                    <RupeeSymbol className="mr-0.5 text-base" />
                    <span>{formatINRPieces(comparedProperties[0].price, { short: true, rent: isRent }).amount}{formatINRPieces(comparedProperties[0].price, { short: true, rent: isRent }).suffix}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveProperty(comparedProperties[0].id)}
                  className="self-end sm:self-center p-2 rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200/60 font-mono text-xs flex items-center gap-1 min-h-[38px] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              {availableToAdd.length > 0 && (
                <div className="rounded-2xl border-2 border-dashed border-dark-gray/20 p-5 bg-sand/15 space-y-3">
                  <div className="font-serif text-base font-medium text-charcoal">
                    Quick Add a 2nd Property to Start Comparison:
                  </div>
                  <div className="space-y-2">
                    {availableToAdd.slice(0, 3).map((item) => {
                      const itemPrice = formatINRPieces(item.price, { short: true, rent: isRent });
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddThirdProperty(item)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-sand/40 border border-dark-gray/15 hover:border-deep-purple transition-all text-xs cursor-pointer shadow-2xs min-h-[44px]"
                        >
                          <div className="truncate pr-2 text-left">
                            <div className="font-medium truncate text-charcoal">{item.title}</div>
                            <div className="text-[10px] text-dark-gray/60">{item.locality ? `${item.locality}, ` : ''}{item.city}</div>
                          </div>
                          <div className="text-right shrink-0 flex items-center font-medium text-deep-purple">
                            <RupeeSymbol className="mr-0.5 text-xs" />
                            <span>{itemPrice.amount}{itemPrice.suffix}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP COMPARATIVE TABLE VIEW (>= 768px) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-dark-gray/15 bg-porcelain shadow-md mt-6">
            <table className="w-full border-collapse text-left text-xs font-mono">
              {/* Table Header: Photos & Remove Buttons */}
              <thead>
                <tr className="border-b border-dark-gray/15 bg-sand/30">
                  <th className="p-4 w-44 min-w-[160px] text-dark-gray/60 uppercase font-medium">
                    Sanctuary Profile
                  </th>

                  {comparedProperties.map((p) => {
                    const priceInfo = formatINRPieces(p.price, { short: true, rent: isRent });
                    return (
                      <th key={p.id} className="p-4 w-72 min-w-[260px] align-top">
                        <div className="space-y-3">
                          <div className="relative aspect-[3/2] rounded-xl overflow-hidden border border-dark-gray/15 bg-sand">
                            <SmartImage src={p.coverImage || p.images?.[p.coverImageIndex || 0] || p.images?.[0]} alt={p.title} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveProperty(p.id)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-gray/80 text-white hover:bg-black transition-colors shadow-xs cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Remove from comparison"
                              aria-label={`Remove ${p.title} from comparison`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="font-serif text-lg text-deep-purple font-medium line-clamp-1">
                            {p.title}
                          </div>

                          <div className="font-serif text-2xl text-dark-gray font-normal flex items-baseline">
                            <RupeeSymbol className="mr-0.5 text-xl" />
                            <span>{priceInfo.amount}{priceInfo.suffix}</span>
                          </div>

                          <div className="font-mono text-[11px] text-dark-gray/60 font-normal">
                            {p.locality ? `${p.locality}, ` : ''}{p.city}
                          </div>

                          <Link to={`/property/${p.id}`} className="block pt-1">
                            <Button variant="outline" size="sm" className="w-full text-xs font-mono uppercase tracking-wider min-h-[38px]">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </th>
                    );
                  })}

                  {/* Slot to add a 3rd property if only 2 selected */}
                  {comparedProperties.length < 3 && (
                    <th className="p-4 w-72 min-w-[240px] align-top bg-sand/10">
                      <div className="h-full border-2 border-dashed border-dark-gray/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-deep-purple/10 text-deep-purple flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div className="font-serif text-base font-medium text-charcoal">
                          Add a 3rd Property
                        </div>
                        <p className="font-mono text-[11px] text-dark-gray/60 leading-tight">
                          Compare up to 3 {isRent ? 'rentals' : 'properties'} side by side.
                        </p>

                        {availableToAdd.length > 0 && (
                          <div className="w-full pt-2 space-y-1.5 text-left">
                            <span className="text-[10px] uppercase text-dark-gray/50 tracking-wider block text-center">
                              Quick Add:
                            </span>
                            {availableToAdd.slice(0, 3).map((item) => {
                              const itemPrice = formatINRPieces(item.price, { short: true, rent: isRent });
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleAddThirdProperty(item)}
                                  className="w-full text-left p-2 rounded-lg bg-sand/40 border border-dark-gray/15 hover:border-deep-purple transition-all truncate text-[11px] cursor-pointer"
                                >
                                  <div className="font-medium truncate">{item.title}</div>
                                  <div className="text-[10px] text-dark-gray/60 flex items-center">
                                    <RupeeSymbol className="mr-0.5" />
                                    <span>{itemPrice.amount}{itemPrice.suffix}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              {/* Spec Comparison Rows */}
              <tbody className="divide-y divide-dark-gray/10">
                {/* Architecture & Typology */}
                <tr>
                  <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                    Property Type
                  </td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3.5 px-4 capitalize font-medium text-charcoal">
                      {p.type}
                    </td>
                  ))}
                  {comparedProperties.length < 3 && <td />}
                </tr>

                {/* RERA ID */}
                <tr>
                  <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                    RERA Compliance
                  </td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3.5 px-4">
                      <span className="text-deep-purple bg-deep-purple/10 border border-deep-purple/20 px-2 py-0.5 rounded font-medium text-[11px]">
                        {p.reraId || 'Approved'}
                      </span>
                    </td>
                  ))}
                  {comparedProperties.length < 3 && <td />}
                </tr>

                {/* Carpet / Built-up Area */}
                <tr>
                  <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                    Area Dimensions
                  </td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3.5 px-4 font-medium text-charcoal">
                      {p.carpetArea ? `${p.carpetArea} sq ft (Carpet)` : formatArea(p.builtUpArea)}
                    </td>
                  ))}
                  {comparedProperties.length < 3 && <td />}
                </tr>

                {/* Bedrooms & Configuration */}
                <tr>
                  <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                    Configuration
                  </td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3.5 px-4 font-medium text-charcoal">
                      {p.bedrooms ? `${p.bedrooms} BHK (${p.bathrooms || 1} Baths)` : 'Studio / Plot'}
                    </td>
                  ))}
                  {comparedProperties.length < 3 && <td />}
                </tr>

                {/* Furnishing */}
                <tr>
                  <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                    Furnishing
                  </td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3.5 px-4 capitalize text-charcoal">
                      {p.furnishing || 'Semi-Furnished'}
                    </td>
                  ))}
                  {comparedProperties.length < 3 && <td />}
                </tr>

                {/* Type-Specific: Possession or Deposit */}
                {isRent ? (
                  <>
                    <tr>
                      <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                        Security Deposit
                      </td>
                      {comparedProperties.map((p) => (
                        <td key={p.id} className="p-3.5 px-4 font-medium text-charcoal">
                          {p.deposit ? formatINR(p.deposit, { withSymbol: true }) : 'Not provided'}
                        </td>
                      ))}
                      {comparedProperties.length < 3 && <td />}
                    </tr>
                    <tr>
                      <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                        Monthly Maintenance
                      </td>
                      {comparedProperties.map((p) => (
                        <td key={p.id} className="p-3.5 px-4 font-medium text-charcoal">
                          {p.maintenance ? `₹${p.maintenance.toLocaleString('en-IN')}/mo` : 'Included in rent'}
                        </td>
                      ))}
                      {comparedProperties.length < 3 && <td />}
                    </tr>
                    <tr>
                      <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                        Notice Period
                      </td>
                      {comparedProperties.map((p) => (
                        <td key={p.id} className="p-3.5 px-4 text-charcoal">
                          {p.noticePeriod || '1 Month'}
                        </td>
                      ))}
                      {comparedProperties.length < 3 && <td />}
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                        Possession Status
                      </td>
                      {comparedProperties.map((p) => (
                        <td key={p.id} className="p-3.5 px-4 text-charcoal font-medium">
                          {p.possessionStatus || 'Ready to Move'}
                        </td>
                      ))}
                      {comparedProperties.length < 3 && <td />}
                    </tr>
                    <tr>
                      <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                        Ownership Type
                      </td>
                      {comparedProperties.map((p) => (
                        <td key={p.id} className="p-3.5 px-4 text-charcoal">
                          {p.ownership || 'Freehold'}
                        </td>
                      ))}
                      {comparedProperties.length < 3 && <td />}
                    </tr>
                    <tr>
                      <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                        Property Age
                      </td>
                      {comparedProperties.map((p) => (
                        <td key={p.id} className="p-3.5 px-4 text-charcoal">
                          {p.age || 'New Construction'}
                        </td>
                      ))}
                      {comparedProperties.length < 3 && <td />}
                    </tr>
                  </>
                )}

                {/* Parking & Parking Slots */}
                <tr>
                  <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                    Parking Facilities
                  </td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3.5 px-4 text-charcoal">
                      {p.parking || 'Covered Reserved'}
                    </td>
                  ))}
                  {comparedProperties.length < 3 && <td />}
                </tr>

                {/* Amenities Breakdown */}
                {['Swimming Pool', 'Gymnasium', 'Power Backup', '24/7 Security'].map((amenity) => (
                  <tr key={amenity}>
                    <td className="p-3.5 px-4 font-semibold text-dark-gray/70 bg-sand/20 uppercase text-[11px]">
                      {amenity}
                    </td>
                    {comparedProperties.map((p) => {
                      const hasAmenity = checkAmenity(p, amenity);
                      return (
                        <td key={p.id} className="p-3.5 px-4">
                          {hasAmenity ? (
                            <div className="flex items-center gap-1.5 text-deep-purple font-medium">
                              <Check className="w-4 h-4 text-deep-purple" />
                              <span>Included</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-dark-gray/40">
                              <Minus className="w-4 h-4" />
                              <span>—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {comparedProperties.length < 3 && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE COMPARATIVE STACKED CARDS VIEW (< 768px) */}
          <div className="block md:hidden mt-6 space-y-6">
            {comparedProperties.map((p, idx) => {
              const priceInfo = formatINRPieces(p.price, { short: true, rent: isRent });
              return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-dark-gray/15 bg-porcelain shadow-xs overflow-hidden"
                >
                  {/* Photo Header with Index Badge & Touch-Friendly Remove Action */}
                  <div className="relative aspect-[16/9] w-full bg-sand overflow-hidden">
                    <SmartImage
                      src={p.coverImage || p.images?.[p.coverImageIndex || 0] || p.images?.[0]}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-dark-gray/85 text-porcelain text-[10px] font-mono uppercase tracking-wider backdrop-blur-sm shadow-xs">
                      Sanctuary 0{idx + 1} of 0{comparedProperties.length}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProperty(p.id)}
                      className="absolute top-2.5 right-2.5 min-w-[38px] min-h-[38px] p-2 rounded-full bg-dark-gray/85 text-white hover:bg-black transition-colors shadow-xs flex items-center justify-center cursor-pointer"
                      title={`Remove ${p.title} from comparison`}
                      aria-label={`Remove ${p.title} from comparison`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title, Pricing & Details Action */}
                  <div className="p-4 border-b border-dark-gray/10 space-y-2">
                    <h3 className="font-serif text-xl text-deep-purple font-medium line-clamp-2 leading-snug">
                      {p.title}
                    </h3>
                    <div className="font-serif text-2xl text-dark-gray font-normal flex items-baseline">
                      <RupeeSymbol className="mr-0.5 text-xl" />
                      <span>{priceInfo.amount}{priceInfo.suffix}</span>
                    </div>
                    <div className="font-mono text-xs text-dark-gray/65">
                      {p.locality ? `${p.locality}, ` : ''}{p.city}
                    </div>
                    <div className="pt-1">
                      <Link to={`/property/${p.id}`} className="block">
                        <Button variant="outline" size="sm" className="w-full min-h-[42px] text-xs font-mono uppercase tracking-wider">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Specification Breakdown */}
                  <div className="divide-y divide-dark-gray/10 font-mono text-xs">
                    <div className="flex justify-between items-center p-3 px-4 bg-sand/20">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Property Type</span>
                      <span className="capitalize font-medium text-charcoal">{p.type}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 px-4">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium">RERA Compliance</span>
                      <span className="text-deep-purple bg-deep-purple/10 border border-deep-purple/20 px-2 py-0.5 rounded font-medium text-[11px]">
                        {p.reraId || 'Approved'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 px-4 bg-sand/20">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Area Dimensions</span>
                      <span className="font-medium text-charcoal">
                        {p.carpetArea ? `${p.carpetArea} sq ft (Carpet)` : formatArea(p.builtUpArea)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 px-4">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Configuration</span>
                      <span className="font-medium text-charcoal">
                        {p.bedrooms ? `${p.bedrooms} BHK (${p.bathrooms || 1} Baths)` : 'Studio / Plot'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 px-4 bg-sand/20">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Furnishing</span>
                      <span className="capitalize text-charcoal">{p.furnishing || 'Semi-Furnished'}</span>
                    </div>

                    {isRent ? (
                      <>
                        <div className="flex justify-between items-center p-3 px-4">
                          <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Security Deposit</span>
                          <span className="font-medium text-charcoal">
                            {p.deposit ? formatINR(p.deposit, { withSymbol: true }) : 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 px-4 bg-sand/20">
                          <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Monthly Maintenance</span>
                          <span className="font-medium text-charcoal">
                            {p.maintenance ? `₹${p.maintenance.toLocaleString('en-IN')}/mo` : 'Included in rent'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 px-4">
                          <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Notice Period</span>
                          <span className="text-charcoal">{p.noticePeriod || '1 Month'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-3 px-4">
                          <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Possession Status</span>
                          <span className="font-medium text-charcoal">{p.possessionStatus || 'Ready to Move'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 px-4 bg-sand/20">
                          <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Ownership Type</span>
                          <span className="text-charcoal">{p.ownership || 'Freehold'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 px-4">
                          <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Property Age</span>
                          <span className="text-charcoal">{p.age || 'New Construction'}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center p-3 px-4 bg-sand/20">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium">Parking Facilities</span>
                      <span className="text-charcoal">{p.parking || 'Covered Reserved'}</span>
                    </div>

                    {/* Key Amenities */}
                    <div className="p-3 px-4 space-y-2">
                      <span className="text-dark-gray/60 uppercase text-[11px] font-medium block">Key Amenities</span>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        {['Swimming Pool', 'Gymnasium', 'Power Backup', '24/7 Security'].map((amenity) => {
                          const hasAmenity = checkAmenity(p, amenity);
                          return (
                            <div
                              key={amenity}
                              className={`flex items-center gap-1.5 p-2 rounded-lg text-[11px] ${
                                hasAmenity
                                  ? 'bg-deep-purple/10 text-deep-purple font-medium border border-deep-purple/20'
                                  : 'bg-dark-gray/5 text-dark-gray/45'
                              }`}
                            >
                              {hasAmenity ? (
                                <Check className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                              ) : (
                                <Minus className="w-3.5 h-3.5 shrink-0 text-dark-gray/40" />
                              )}
                              <span className="truncate">{amenity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Mobile Slot to add a 3rd property if only 2 selected */}
            {comparedProperties.length < 3 && (
              <div className="rounded-2xl border-2 border-dashed border-dark-gray/25 p-5 bg-sand/15 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-deep-purple/10 text-deep-purple flex items-center justify-center mx-auto">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="font-serif text-lg font-medium text-charcoal">
                  Add a 3rd Property
                </div>
                <p className="font-mono text-xs text-dark-gray/65 max-w-xs mx-auto">
                  Compare up to 3 {isRent ? 'rentals' : 'properties'} side by side.
                </p>

                {availableToAdd.length > 0 && (
                  <div className="pt-2 space-y-2 text-left">
                    <span className="text-[10px] uppercase text-dark-gray/50 tracking-wider block text-center">
                      Quick Add:
                    </span>
                    {availableToAdd.slice(0, 3).map((item) => {
                      const itemPrice = formatINRPieces(item.price, { short: true, rent: isRent });
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddThirdProperty(item)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-sand/40 border border-dark-gray/15 hover:border-deep-purple transition-all text-xs cursor-pointer shadow-2xs min-h-[44px]"
                        >
                          <div className="truncate pr-2">
                            <div className="font-medium truncate text-charcoal">{item.title}</div>
                            <div className="text-[10px] text-dark-gray/60">{item.locality ? `${item.locality}, ` : ''}{item.city}</div>
                          </div>
                          <div className="text-right shrink-0 flex items-center font-medium text-deep-purple">
                            <RupeeSymbol className="mr-0.5 text-xs" />
                            <span>{itemPrice.amount}{itemPrice.suffix}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ComparePage;
