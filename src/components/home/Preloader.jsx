import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { markHomePreloaderRun, setHomeIntroActive } from '@/lib/preloaderState';

export function Preloader({ onSlideStart, onComplete }) {
  const [shouldShow, setShouldShow] = useState(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return false;
      return true;
    }
    return true;
  });
  const [mediaMode, setMediaMode] = useState('video'); // 'video' | 'gif' | 'fallback'
  const [stage, setStage] = useState('loading'); // 'loading' | 'content-exit' | 'slide-up' | 'done'
  const videoRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setShouldShow(false);
      setHomeIntroActive(false);
      if (onSlideStart) onSlideStart();
      if (onComplete) onComplete();
      return;
    }

    // Must show and lock
    setShouldShow(true);
    setHomeIntroActive(true);

    // Prevent wheel, touch, and keyboard scrolling while intro is active
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const preventKeyScroll = (e) => {
      const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', ' '];
      if (scrollKeys.includes(e.key) || scrollKeys.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('wheel', preventScroll, { capture: true, passive: false });
    window.addEventListener('touchmove', preventScroll, { capture: true, passive: false });
    window.addEventListener('keydown', preventKeyScroll, { capture: true, passive: false });

    // Lock scrolling on document
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    let isMounted = true;
    let minWaitTimer = null;
    let maxWaitTimer = null;

    // Assets readiness promise: fonts + hero image + minimum duration
    const fontsReadyPromise = document.fonts ? document.fonts.ready : Promise.resolve();

    const heroBgTest = new Image();
    heroBgTest.src = '/hero/hero-bg.jpg';
    const heroBgPromise = new Promise((resolve) => {
      heroBgTest.onload = () => resolve();
      heroBgTest.onerror = () => resolve();
    });

    const minWaitPromise = new Promise((resolve) => {
      minWaitTimer = setTimeout(resolve, 3000);
    });
    const maxTimeoutPromise = new Promise((resolve) => {
      maxWaitTimer = setTimeout(resolve, 7000);
    });

    Promise.race([
      Promise.all([fontsReadyPromise, heroBgPromise, minWaitPromise]),
      maxTimeoutPromise,
    ]).then(() => {
      if (!isMounted) return;

      if (prefersReducedMotion) {
        setStage('done');
        window.removeEventListener('wheel', preventScroll, { capture: true });
        window.removeEventListener('touchmove', preventScroll, { capture: true });
        window.removeEventListener('keydown', preventKeyScroll, { capture: true });
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        setHomeIntroActive(false);
        if (onSlideStart) onSlideStart();
        if (onComplete) onComplete();
        return;
      }

      // The intro video layer itself slides upward at the approved speed (0.9s)
      // Scrolling remains locked until slide-up finishes completely in onAnimationComplete
      setStage('slide-up');
      if (onSlideStart) {
        onSlideStart();
      }
    });

    return () => {
      isMounted = false;
      if (minWaitTimer) clearTimeout(minWaitTimer);
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      window.removeEventListener('wheel', preventScroll, { capture: true });
      window.removeEventListener('touchmove', preventScroll, { capture: true });
      window.removeEventListener('keydown', preventKeyScroll, { capture: true });
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      setHomeIntroActive(false);
    };
  }, []);


  // Ensure video plays when element is available
  useEffect(() => {
    if (mediaMode === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was prevented or error
        });
      }
    }
  }, [mediaMode, shouldShow]);

  const handleVideoError = () => {
    // If mp4 fails, attempt gif fallback
    const imgTest = new Image();
    imgTest.onload = () => setMediaMode('gif');
    imgTest.onerror = () => setMediaMode('fallback');
    imgTest.src = `/preloader/preloader.gif?t=${Date.now()}`;
  };

  const handleGifError = () => {
    setMediaMode('fallback');
  };

  if (!shouldShow || stage === 'done') return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] w-full h-[100dvh] flex items-center justify-center select-none overflow-hidden"
      style={{
        backgroundColor: 'var(--preloader-bg, #F1ECE3)',
        willChange: stage === 'slide-up' ? 'transform' : 'auto',
        pointerEvents: stage === 'slide-up' ? 'none' : 'auto',
      }}
      initial={{ y: '0%' }}
      animate={
        stage === 'slide-up'
          ? { y: '-102%' }
          : { y: '0%' }
      }
      transition={{
        duration: 0.9,
        ease: [0.76, 0, 0.24, 1],
      }}
      onAnimationComplete={() => {
        if (stage === 'slide-up') {
          setStage('done');
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          setHomeIntroActive(false);
          window.scrollTo(0, 0);
          if (onComplete) {
            onComplete();
          }
        }
      }}
    >
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        {mediaMode === 'video' ? (
          <video
            ref={videoRef}
            src="/preloader/preloader.mp4"
            autoPlay
            muted
            playsInline
            loop
            preload="auto"
            onError={handleVideoError}
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        ) : mediaMode === 'gif' ? (
          <img
            src="/preloader/preloader.gif"
            alt="Loading Porch Light"
            onError={handleGifError}
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex items-baseline gap-1 text-charcoal font-serif text-4xl sm:text-5xl tracking-tight">
              <span>Porch L</span>
              <span className="relative inline-block">
                <span>i</span>
                {/* Pulsing lemon dot above the 'i' */}
                <motion.span
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-lemon border border-charcoal/20 shadow-sm"
                  animate={{
                    scale: [1, 1.45, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </span>
              <span>ght</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-deep-purple/75">
              Verified Indian Homes
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
