import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getSavedProperties, toggleSavedProperty } from '@/services/properties';
import { addToCompare, isInCompare, getCompareState } from '@/services/compare';
import { useAuth } from '@/features/auth/AuthContext';
import { SmartImage } from '@/components/media/SmartImage';
import toast from 'react-hot-toast';
import { formatINR, formatArea } from '@/lib/formatINR';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  SlidersHorizontal,
  Calendar,
  ExternalLink,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export function UserSavedPage() {
  const { user, loading: authLoading } = useAuth();
  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [compareState, setCompareState] = useState({ buy: [], rent: [] });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSavedProperties();
      setSavedProperties(res.data || []);
      const cmp = getCompareState();
      setCompareState(cmp);
    } catch (err) {
      console.error('Failed to load saved properties:', err);
      setError(err.message || 'Failed to load saved residences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  const handleRemove = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleSavedProperty(id);
      toast.success('Removed from collection');
      loadData();
    } catch (err) {
      toast.error('Failed to remove property');
    }
  };

  const handleToggleCompare = (prop, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      addToCompare(prop);
      setCompareState(getCompareState());
    } catch (err) {
      alert(err.message || 'Could not add to compare');
    }
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Contextual Back Navigation */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Personal Wishlist
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Saved Homes
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/compare"
              className="px-4 py-2 rounded-full bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-deep-purple" />
              <span>Compare Set ({(compareState.sale?.length || 0) + (compareState.rent?.length || 0)})</span>
            </Link>
            <Link
              to="/buy"
              className="px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors"
            >
              Discover More
            </Link>
          </div>
        </div>

        {error && !loading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="font-sans text-xs text-amber-900">{error}</span>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-[11px] uppercase tracking-wider transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : savedProperties.length === 0 ? (
          <DashboardEmptyState
            title="Your saved wishlist is empty."
            description="Explore residences for sale and verified long-term rentals, then click the heart icon to save residences you'd like to revisit or compare."
            actionLabel="Browse Residences"
            actionLink="/buy"
            icon={Heart}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedProperties.map((prop) => {
              const inCompare = isInCompare(prop.id, prop.listingType);
              const image =
                prop.coverImage ||
                prop.images?.[0] ||
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

              return (
                <div
                  key={prop.id}
                  id={`property-${prop.id}`}
                  className="rounded-2xl bg-porcelain border border-charcoal/10 overflow-hidden shadow-xs hover:border-deep-purple/30 transition-all flex flex-col group"
                >
                  {/* Image Container */}
                  <div className="relative h-48 bg-sand overflow-hidden">
                    <SmartImage
                      src={image}
                      alt={prop.title}
                      aspect="auto"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/90 text-charcoal border border-charcoal/15 backdrop-blur-xs shadow-xs">
                        {prop.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-purple text-white">
                        {prop.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(prop.id, e)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-sand/90 hover:bg-sand text-rose-600 transition-colors shadow-xs cursor-pointer border border-charcoal/15"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-dark-gray/60 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-deep-purple" />
                        <span>
                          {prop.locality}, {prop.city}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl text-charcoal font-medium line-clamp-1">
                        {prop.title}
                      </h3>
                      <div className="font-mono text-base text-deep-purple font-medium mt-2">
                        {formatINR(prop.price, { withSymbol: true, rent: prop.listingType === 'rent' })}
                      </div>

                      {/* Specs Summary */}
                      <div className="mt-3 pt-3 border-t border-charcoal/5 flex items-center justify-between text-xs font-mono text-dark-gray/70">
                        {prop.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-deep-purple" />
                            {prop.bedrooms} BHK
                          </span>
                        )}
                        {prop.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3.5 h-3.5 text-deep-purple" />
                            {prop.bathrooms} Baths
                          </span>
                        )}
                        {(prop.builtUpArea || prop.carpetArea) && (
                          <span className="flex items-center gap-1">
                            <Maximize2 className="w-3.5 h-3.5 text-deep-purple" />
                            {formatArea(prop.builtUpArea || prop.carpetArea)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-charcoal/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleCompare(prop, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                          inCompare
                            ? 'bg-deep-purple text-white shadow-xs'
                            : 'bg-sand/60 hover:bg-sand text-charcoal border border-charcoal/10'
                        }`}
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>{inCompare ? 'In Compare' : 'Compare'}</span>
                      </button>

                      <Link
                        to={`/property/${prop.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
