import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getGoogleConfig } from '@/services/auth';
import toast from 'react-hot-toast';

export function GoogleLoginButton({ onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');

  // Load configured Google Client ID from backend if not in Vite env
  useEffect(() => {
    let isMounted = true;
    if (!clientId) {
      getGoogleConfig().then((id) => {
        if (isMounted && id) setClientId(id);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Dynamically load Google Identity Services script
  useEffect(() => {
    if (window.google?.accounts) return;
    const existing = document.getElementById('google-gsi-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleClick = async () => {
    if (loading) return;

    if (!clientId) {
      toast.error('Google Client ID is not configured. Please check backend environment configuration.');
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      toast.error('Google Identity Services is still loading. Please try again in a moment.');
      return;
    }

    setLoading(true);
    try {
      // Official Google Identity Services OAuth 2.0 flow with prompt=select_account
      // Ensures the user explicitly sees the Google Account Chooser dialog
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              toast.error(tokenResponse.error_description || 'Google sign-in was canceled');
            }
            return;
          }

          try {
            await loginWithGoogle({ accessToken: tokenResponse.access_token });
            if (onSuccess) onSuccess();
          } catch (e) {
            // Error notification already dispatched in AuthContext
          } finally {
            setLoading(false);
          }
        },
        error_callback: (err) => {
          setLoading(false);
          if (err?.type === 'popup_failed_to_open') {
            toast.error('Popup blocked by browser. Please allow popups for Google sign-in.');
          } else {
            toast.error('Google sign-in failed. Check Authorized JavaScript Origins in Google Cloud Console.');
          }
        },
      });

      // Explicitly request access token with prompt=select_account
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setLoading(false);
      toast.error(err.message || 'Unable to open Google account chooser.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-full border border-dark-gray/30 bg-porcelain hover:bg-white text-dark-gray text-xs font-mono uppercase tracking-wider transition-all shadow-sm disabled:opacity-60 cursor-pointer"
    >
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
      <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
    </button>
  );
}

export default GoogleLoginButton;
