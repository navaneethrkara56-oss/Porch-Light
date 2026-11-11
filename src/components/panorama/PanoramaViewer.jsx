import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import { Maximize2, RotateCcw } from 'lucide-react';

export function PanoramaViewer({
  panoramaUrl,
  caption = '360° Virtual Tour',
  height = '500px',
  className = '',
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !panoramaUrl) return;

    let viewerInstance = null;
    try {
      viewerInstance = new Viewer({
        container: containerRef.current,
        panorama: panoramaUrl,
        caption,
        loadingTxt: null,
        navbar: ['autorotate', 'zoom', 'caption', 'fullscreen'],
        defaultZoomLvl: 50,
      });

      viewerInstance.addEventListener('ready', () => {
        setLoading(false);
      });

      viewerRef.current = viewerInstance;
    } catch (err) {
      console.warn('360 Viewer failed to initialize', err);
      setError(true);
      setLoading(false);
    }

    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
        viewerRef.current = null;
      }
    };
  }, [panoramaUrl, caption]);

  if (error) {
    return (
      <div
        style={{ height, minHeight: height }}
        className="w-full bg-dark-gray/10 rounded-xl flex flex-col items-center justify-center p-6 text-center border border-dark-gray/15 font-mono text-xs text-dark-gray/60"
      >
        <RotateCcw className="w-6 h-6 mb-2 text-deep-purple" />
        <p>360° tour preview could not load WebGL context.</p>
        <span className="text-[10px] mt-1 text-dark-gray/40">Try viewing on a WebGL-compatible browser.</span>
      </div>
    );
  }

  return (
    <div
      className={`relative isolate z-10 w-full overflow-hidden rounded-xl border border-dark-gray/20 bg-porcelain shadow-xs ${className}`}
      style={{ height, minHeight: height }}
    >
      <div ref={containerRef} className="w-full h-full [&_.psv-loader-container]:hidden" />
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 bg-porcelain flex flex-col items-center justify-center font-mono text-xs text-dark-gray/70 z-10 pointer-events-none"
        >
          <div className="relative flex items-center justify-center w-12 h-12 mb-3" aria-hidden="true">
            <span className="w-4 h-4 rounded-full bg-electric-lemon animate-ping absolute motion-reduce:hidden opacity-75" />
            <span className="w-3.5 h-3.5 rounded-full bg-electric-lemon border border-dark-gray/20 shadow-xs relative z-10 motion-safe:animate-pulse" />
          </div>
          <span className="tracking-wider uppercase text-[11px]">Calibrating 360° Panorama...</span>
          <span className="sr-only">Loading 360 virtual tour</span>
        </div>
      )}
    </div>
  );
}
