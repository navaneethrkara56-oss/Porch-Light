import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useSiteWideSmoothScroll } from '@/hooks/useSiteWideSmoothScroll';
import { AuthBackground } from '@/components/auth/AuthBackground';

export function PageLayout({ children }) {
  const location = useLocation();
  useSiteWideSmoothScroll();

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password';

  return (
    <div className="min-h-screen flex flex-col bg-porcelain text-charcoal relative selection:bg-deep-purple selection:text-white">
      {/* Persistent Auth background: renders existing background image with sanctuary styling and zero shader lag */}
      <div
        className={`fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-300 z-0 ${
          isAuthPage ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
        style={{ visibility: isAuthPage ? 'visible' : 'hidden' }}
      >
        <AuthBackground />
      </div>

      <Header />

      {/* Main Content Area */}
      <main className={`flex-1 relative z-10 ${location.pathname === '/' ? 'pt-0' : 'pt-[72px]'}`}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
