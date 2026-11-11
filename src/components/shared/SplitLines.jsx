import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * SplitLines
 * Headings jump up line by line:
 * Each line is wrapped in an overflow-hidden wrapper,
 * translateY 100% to 0, stagger 0.08s, cubic-bezier(0.22, 1, 0.36, 1).
 * Respects prefers-reduced-motion.
 */
export function SplitLines({
  lines = [],
  children,
  className = '',
  as: Component = 'h2',
  delay = 0,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.18 });

  // If children is provided as a string with newlines or array
  let renderedLines = lines;
  if (!renderedLines.length && typeof children === 'string') {
    renderedLines = children.split('\n');
  } else if (!renderedLines.length && Array.isArray(children)) {
    renderedLines = children;
  }

  return (
    <Component ref={ref} className={className}>
      {renderedLines.map((line, idx) => (
        <span key={idx} className="block overflow-hidden leading-[1.05]">
          <motion.span
            className="block"
            initial={{ y: '105%' }}
            animate={isInView ? { y: '0%' } : { y: '105%' }}
            transition={{
              duration: 0.85,
              delay: delay + idx * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Component>
  );
}
