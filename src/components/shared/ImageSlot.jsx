import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { getSlotUrl, getInitialSlotUrl, getTintPlaceholder, REMOTE_STOCK_SLOTS } from '@/assets/home-images';

/**
 * ImageSlot
 * - 20px corners
 * - Plain rectangles only
 * - Fallback chain: local file -> stock URL -> generated local SVG placeholder
 * - Clip-path reveal (1.4s, cubic-bezier(0.22, 1, 0.36, 1))
 * - Never renders an empty box
 */
export function ImageSlot({
  slot,
  src,
  alt = 'Porch Light Architecture',
  className = '',
  imgClassName = '',
  style = {},
  imgStyle = {},
  aspectRatio = 'auto',
  dim = false,
  eager = false,
  reveal = true,
  onClick,
}) {
  const initialSrc = src || (slot ? getInitialSlotUrl(slot) : '');
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [attemptLevel, setAttemptLevel] = useState(0); // 0: initial, 1: remote, 2: svg
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.18 });

  useEffect(() => {
    let isMounted = true;
    if (slot && !src) {
      getSlotUrl(slot).then((resolvedUrl) => {
        if (isMounted) {
          setCurrentSrc(resolvedUrl);
        }
      });
    } else if (src) {
      setCurrentSrc(src);
    }
    return () => {
      isMounted = false;
    };
  }, [slot, src]);

  const handleError = () => {
    if (attemptLevel === 0 && slot && REMOTE_STOCK_SLOTS[slot]) {
      setAttemptLevel(1);
      setCurrentSrc(REMOTE_STOCK_SLOTS[slot]);
    } else {
      setAttemptLevel(2);
      setCurrentSrc(getTintPlaceholder(slot || 'Porch Light'));
    }
  };

  const imageElement = (
    <img
      src={currentSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={handleError}
      style={imgStyle}
      className={`w-full h-full object-cover rounded-[20px] transition-transform duration-1000 ${
        dim ? 'brightness-[0.82]' : ''
      } ${imgClassName}`}
    />
  );

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[20px] bg-sand/40 ${className}`}
      style={{ aspectRatio, ...style }}
    >
      {reveal ? (
        <motion.div
          className="w-full h-full rounded-[20px] overflow-hidden"
          initial={{ clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 }}
          animate={
            isInView
              ? { clipPath: 'inset(0% 0% 0% 0%)', scale: 1 }
              : { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 }
          }
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {imageElement}
        </motion.div>
      ) : (
        imageElement
      )}
    </div>
  );
}
