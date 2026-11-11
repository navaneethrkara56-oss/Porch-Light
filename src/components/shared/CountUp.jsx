import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * CountUp
 * Space Mono numbers counting up once when 15-20% in view.
 * Handles numbers with suffixes like '30+', '9', '100%'.
 */
export function CountUp({
  value,
  duration = 1800,
  className = '',
  suffix = '',
  prefix = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [displayValue, setDisplayValue] = useState(0);

  // Parse target number and possible suffix if embedded
  let numericTarget = typeof value === 'number' ? value : 0;
  let detectedSuffix = suffix;

  if (typeof value === 'string') {
    const match = value.match(/(\d+)(.*)/);
    if (match) {
      numericTarget = parseInt(match[1], 10);
      if (!detectedSuffix && match[2]) {
        detectedSuffix = match[2];
      }
    }
  }

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easedProgress * numericTarget);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(numericTarget);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isInView, numericTarget, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {detectedSuffix}
    </span>
  );
}
