import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatINR } from '@/lib/formatINR';
import { MapPropertyPreview } from '@/components/map/MapPropertyPreview';
import { AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Geographic bounds and limits for framing India comfortably with surrounding context
export const INDIA_CENTER = [22.0, 79.0];
export const INDIA_DEFAULT_ZOOM = 5;

export const INDIA_VIEW_BOUNDS = [
  [8.0, 68.0],   // South-West (Kanyakumari / Gujarat borders)
  [35.5, 97.5],  // North-East (Kashmir / Arunachal Pradesh)
];

export const INDIA_MAX_BOUNDS = [
  [4.0, 64.0],   // South: Indian Ocean, West: Arabian Sea
  [38.5, 102.0], // North: Himalayas, East: Eastern borders
];

/**
 * Stabilized MapBoundsUpdater
 * Frames all of India comfortably when properties span nationwide,
 * and zooms in when properties are filtered to a specific localized city/region.
 * Does NOT reset bounds or jump on card hover, map pan, zoom, or ordinary re-renders.
 * Smoothly pans to the selected property when selectedId changes.
 */
function MapBoundsUpdater({ properties, selectedId }) {
  const map = useMap();
  const lastFittedKeyRef = useRef('');
  const lastSelectedIdRef = useRef(null);

  // 1. Single property detail view framing (neighborhood scale)
  const isSingleProperty = properties.length === 1;
  const singleProp = properties[0];

  useEffect(() => {
    if (isSingleProperty && singleProp) {
      if (
        typeof singleProp.lat === 'number' &&
        typeof singleProp.lng === 'number' &&
        !isNaN(singleProp.lat) &&
        !isNaN(singleProp.lng)
      ) {
        // Offset center slightly south and east so the pin sits comfortably in upper-right/center,
        // leaving the lower-left area open for the floating preview card without overlap!
        const targetLat = singleProp.lat - 0.0022;
        const targetLng = singleProp.lng + 0.0035;
        map.setView([targetLat, targetLng], 14, { animate: false });
        lastFittedKeyRef.current = String(singleProp.id);
        lastSelectedIdRef.current = singleProp.id;
      }
      return;
    }

    if (!properties || properties.length === 0) return;

    // Stable fingerprint of the current matching property IDs
    const currentKey = properties
      .map((p) => p.id)
      .sort()
      .join(',');

    // Only fit bounds if the actual set of properties changed and no single pin is being focused
    if (currentKey !== lastFittedKeyRef.current && !selectedId) {
      lastFittedKeyRef.current = currentKey;
      const validCoords = properties
        .filter(
          (p) =>
            typeof p.lat === 'number' &&
            typeof p.lng === 'number' &&
            !isNaN(p.lat) &&
            !isNaN(p.lng)
        )
        .map((p) => [p.lat, p.lng]);

      if (validCoords.length > 0) {
        const lats = validCoords.map((c) => c[0]);
        const lngs = validCoords.map((c) => c[1]);
        const latSpan = Math.max(...lats) - Math.min(...lats);
        const lngSpan = Math.max(...lngs) - Math.min(...lngs);

        // If span is large (> 6 deg), properties span nationwide -> frame all of India
        if (latSpan > 6 || lngSpan > 6) {
          map.fitBounds(INDIA_VIEW_BOUNDS, {
            padding: [24, 24],
            maxZoom: 6,
          });
        } else {
          // Localized cluster (e.g. filtered to a specific city or Near Me)
          const bounds = L.latLngBounds(validCoords);
          map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 13,
          });
        }
      }
    }
  }, [properties, selectedId, isSingleProperty, singleProp, map]);

  // 2. Focused panning when a single property is selected
  useEffect(() => {
    if (selectedId && selectedId !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = selectedId;
      const selected = properties.find((p) => p.id === selectedId);
      if (
        selected &&
        typeof selected.lat === 'number' &&
        typeof selected.lng === 'number' &&
        !isNaN(selected.lat) &&
        !isNaN(selected.lng)
      ) {
        map.panTo([selected.lat, selected.lng], { animate: true, duration: 0.5 });
      }
    } else if (!selectedId) {
      lastSelectedIdRef.current = null;
    }
  }, [selectedId, properties, map]);

  return null;
}

/**
 * Stabilized MapResizeHandler
 * Updates map dimensions only when the Map tab becomes visible or on debounced window resize.
 * Passes { pan: false } to prevent map jumping or shaking during resize.
 */
function MapResizeHandler() {
  const map = useMap();

  // Multi-stage invalidation to guarantee full container rendering across tab and layout transitions
  useEffect(() => {
    const timers = [
      setTimeout(() => { try { map.invalidateSize({ pan: false }); } catch (e) {} }, 100),
      setTimeout(() => { try { map.invalidateSize({ pan: false }); } catch (e) {} }, 300),
      setTimeout(() => { try { map.invalidateSize({ pan: false }); } catch (e) {} }, 600),
      setTimeout(() => { try { map.invalidateSize({ pan: false }); } catch (e) {} }, 1200),
    ];

    const container = map.getContainer();
    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        try { map.invalidateSize({ pan: false }); } catch (e) {}
      });
      observer.observe(container);
    }

    return () => {
      timers.forEach(clearTimeout);
      if (observer) observer.disconnect();
    };
  }, [map]);

  useEffect(() => {
    let resizeTimer = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try { map.invalidateSize({ pan: false }); } catch (e) {}
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

export function PropertyMap({
  properties = [],
  hoveredId = null,
  selectedId = null,
  onMarkerClick,
  onClosePreview,
  mode = 'sale',
  savedIds = [],
  comparedProperties = [],
  onToggleSave,
  onToggleCompare,
  onGuestClick,
  className = '',
  center = INDIA_CENTER,
  zoom = INDIA_DEFAULT_ZOOM,
  activeTab = 'map',
}) {
  const [hasTileError, setHasTileError] = useState(false);

  // Selected property object
  const selectedProperty = properties.find((p) => p.id === selectedId) || null;

  const createCustomIcon = (property, isHovered, isSelected) => {
    const isRent = mode === 'rent' || property.listingType === 'rent';
    const priceText = formatINR(property.price, { short: true, rent: isRent });

    const bgClass = isSelected
      ? 'bg-deep-purple text-porcelain border-2 border-electric-lemon shadow-xl scale-110 z-50'
      : isHovered
      ? 'bg-charcoal text-porcelain border border-charcoal shadow-lg scale-105 z-40'
      : 'bg-porcelain text-charcoal border border-charcoal/30 shadow-sm hover:border-charcoal hover:bg-charcoal hover:text-white';

    const dotClass = isSelected
      ? 'bg-electric-lemon animate-pulse'
      : isHovered
      ? 'bg-electric-lemon'
      : 'bg-deep-purple';

    const html = `
      <div class="inline-flex items-center justify-center gap-1.5 px-3 h-7 rounded-full font-mono text-[11px] font-bold leading-none select-none transition-all duration-200 cursor-pointer ${bgClass}">
        <span class="w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}"></span>
        <span class="leading-none text-center truncate max-w-[110px] tracking-tight">${priceText}</span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-property-pin',
      iconSize: [110, 32],
      iconAnchor: [55, 16],
    });
  };

  // Filter out any properties with invalid or missing coordinates
  const validProperties = properties.filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
  );

  return (
    <div className={`relative w-full h-full min-h-[320px] overflow-hidden bg-porcelain isolate z-10 ${className}`}>
      {/* Tile loading fallback notice if external tiles fail */}
      {hasTileError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-charcoal/90 text-porcelain px-4 py-2 rounded-full font-mono text-xs flex items-center gap-2 shadow-lg backdrop-blur-md">
          <AlertCircle className="w-3.5 h-3.5 text-lemon" />
          <span>External map tiles unavailable. Property coordinates remain plotted.</span>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={4}
        maxZoom={18}
        maxBounds={INDIA_MAX_BOUNDS}
        maxBoundsViscosity={0.85}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomControl={true}
        className="w-full h-full z-10"
        style={{ background: '#F1ECE3' }}
      >
        <MapResizeHandler activeTab={activeTab} />

        {/* Keyless OpenStreetMap standard raster tiles — zero API keys required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          crossOrigin="anonymous"
          className="map-tile-beige"
          eventHandlers={{
            tileerror: () => {
              setHasTileError(true);
            },
          }}
        />

        <MapBoundsUpdater properties={validProperties} selectedId={selectedId} />

        {validProperties.map((property) => {
          const isHovered = hoveredId === property.id;
          const isSelected = selectedId === property.id;
          return (
            <Marker
              key={property.id}
              position={[property.lat, property.lng]}
              icon={createCustomIcon(property, isHovered, isSelected)}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(property),
              }}
            />
          );
        })}
      </MapContainer>

      {/* Floating Closable Property Preview Card */}
      {selectedProperty && (
        <MapPropertyPreview
          property={selectedProperty}
          mode={mode}
          isSaved={savedIds.includes(selectedProperty.id)}
          isCompared={comparedProperties.some((p) => p.id === selectedProperty.id)}
          onClose={onClosePreview}
          onToggleSave={onToggleSave}
          onToggleCompare={onToggleCompare}
          onGuestClick={onGuestClick}
        />
      )}
    </div>
  );
}

export default PropertyMap;
