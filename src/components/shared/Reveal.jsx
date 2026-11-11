import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * Reveal
 * Universal element reveal conforming to HOME_DESIGN.md:
 * - 'fade-up' (default for paragraphs): fade and rise 20px
 * - 'mono-label': fade with small slide from the left (x: -18 to 0)
 * - 'stagger-container': children or chips enter one by one 0.06s apart
 * - 'photo': clip-path from bottom plus scale 1.08 to 1
 * Plays once when ~18% in view.
 */
export function Reveal({
  children,
  variant = 'fade-up', // 'fade-up' | 'mono-label' | 'photo' | 'chip-row'
  className = '',
  delay = 0,
  as: Component = 'div',
  ...props
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.18 });

  if (variant === 'photo') {
    return (
      <div ref={ref} className={`overflow-hidden ${className}`} {...props}>
        <motion.div
          className="w-full h-full"
          initial={{
            clipPath: 'inset(100% 0% 0% 0%)',
            scale: 1.08,
          }}
          animate={
            isInView
              ? { clipPath: 'inset(0% 0% 0% 0%)', scale: 1 }
              : { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 }
          }
          transition={{
            duration: 1.05,
            delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {children}
        </motion.div>
      </div>
    );
  }

  if (variant === 'mono-label') {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, x: -18 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  if (variant === 'chip-row') {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.06,
              delayChildren: delay,
            },
          },
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  // Default: paragraph or generic element fade and rise 20px
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ChipItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
