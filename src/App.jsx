import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AppRouter } from '@/app/router';
import { ScrollToTop } from '@/components/layout/ScrollToTop';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AppRouter />
          <Toaster
            position="bottom-left"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#26262B',
                color: '#F1ECE3',
                fontFamily: '"Space Mono", monospace',
                fontSize: '12px',
                borderRadius: '9999px',
                padding: '10px 18px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
              },
              success: {
                iconTheme: {
                  primary: '#E6FF3D',
                  secondary: '#26262B',
                },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
