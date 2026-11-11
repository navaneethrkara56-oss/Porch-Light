import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * SmartImage Component
 * - Fixed aspect-ratio frame
 * - Object-fit cover (or portrait containment with blurred backdrop)
 * - Blurred placeholder fading to sharp on load
 * - Cached image detection across route transitions (prevents opacity-0 freeze)
 * - Themed Porch Light graceful fallback on failure or empty src
 * - Ratios: 'listing' (3:2), 'gallery' (16:9), 'circle' (1:1), 'portrait' (3:4), 'custom'
 */
export function SmartImage({
  src,
  alt = 'Property photo',
  aspect = 'listing', // 'listing' | 'gallery' | 'circle' | 'portrait' | 'auto'
  focalPoint = 'center',
  eager = false,
  containWithBlur = false,
  className = '',
  imageClassName = '',
  onClick,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  // High-fidelity Porch Light themed SVG placeholder with architectural arch and brand seal
  const fallbackSvg =
    'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"%3E%3Crect fill="%23E7E1D6" width="600" height="400"/%3E%3Ccircle cx="300" cy="180" r="40" fill="%238F7FA8" opacity="0.25"/%3E%3Cpath d="M280 198 L300 178 L320 198 Z" fill="%235E4F7A"/%3E%3Crect x="290" y="198" width="20" height="18" fill="%235E4F7A"/%3E%3Ctext fill="%235E4F7A" font-family="serif" font-size="16" font-weight="600" letter-spacing="2" x="50%25" y="246" text-anchor="middle"%3EPORCH LIGHT%3C/text%3E%3C/svg%3E';

  const isFailedOrEmpty = Boolean(error || !src);
  const imageSrc = isFailedOrEmpty ? fallbackSvg : src;

  // Immediate detection of cached images across route navigation
  const checkImgComplete = (el) => {
    if (!el) return;
    if (el.complete) {
      if (el.naturalWidth > 0) {
        setLoaded(true);
      } else if (el.naturalWidth === 0 && src && !error) {
        setError(true);
        setLoaded(true);
      }
    }
  };

  const handleRef = (el) => {
    imgRef.current = el;
    checkImgComplete(el);
  };

  useEffect(() => {
    setError(false);
    if (!src) {
      setLoaded(true);
      return;
    }

    checkImgComplete(imgRef.current);
    const frame = requestAnimationFrame(() => checkImgComplete(imgRef.current));
    const timer = setTimeout(() => checkImgComplete(imgRef.current), 50);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [src]);

  const aspectClasses = {
    listing: 'aspect-[3/2]',
    gallery: 'aspect-[16/9]',
    circle: 'aspect-square rounded-full',
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    auto: '',
  };

  const ratioClass = aspectClasses[aspect] || aspectClasses.listing;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden bg-[#E7E1D6] isolate select-none',
        ratioClass,
        className
      )}
    >
      {/* Blurred thumbnail background if containWithBlur is true */}
      {containWithBlur && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-50 scale-110 pointer-events-none"
          style={{ backgroundImage: `url(${imageSrc})` }}
        />
      )}

      {/* Main image with fade-in transition, cache recognition, and error recovery */}
      <img
        ref={handleRef}
        src={imageSrc}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => {
          if (!error) {
            setError(true);
            setLoaded(true);
          }
        }}
        onLoad={() => {
          setError(false);
          setLoaded(true);
        }}
        style={{ objectPosition: focalPoint }}
        className={cn(
          'w-full h-full transition-all duration-300 ease-out',
          containWithBlur ? 'object-contain relative z-10' : 'object-cover',
          (loaded || isFailedOrEmpty) ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-105',
          imageClassName
        )}
      />

      {/* Shimmer placeholder while loading valid external image */}
      {!loaded && !isFailedOrEmpty && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      )}
    </div>
  );
}
