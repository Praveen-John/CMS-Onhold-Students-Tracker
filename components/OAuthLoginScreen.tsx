import React, { useEffect, useState } from 'react';
import { GoogleLogo, LoaderIcon, ExclamationCircleIcon } from './icons';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // If VITE_BASE_URL is set, use it
  if (import.meta.env.VITE_BASE_URL) {
    return import.meta.env.VITE_BASE_URL;
  }

  // In production, use relative URL (same domain)
  if (import.meta.env.PROD) {
    return '/api';
  }

  // Development fallback
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Debug: Log configuration (remove in production)
console.log('OAuth Config Check:', {
  hasClientId: !!GOOGLE_CLIENT_ID,
  clientIdPrefix: GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
  apiBaseUrl: API_BASE_URL
});

interface OAuthLoginScreenProps {
  onLogin: (email: string, name: string, picture: string) => void;
}

const OAuthLoginScreen: React.FC<OAuthLoginScreenProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    // Check for OAuth callback errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    if (oauthError) {
      if (oauthError === 'oauth_failed') {
        setError('Google authentication failed. Please try again.');
      } else if (oauthError === 'server_error') {
        setError('Server error during authentication. Please try again.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load Google Identity Services
    loadGoogleScript();
  }, []);

  const loadGoogleScript = () => {
    if (window.google) {
      setGoogleLoaded(true);
      initializeGoogleSignIn();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleLoaded(true);
      initializeGoogleSignIn();
    };
    script.onerror = () => {
      setError('Failed to load Google Sign-In. Check your internet connection.');
    };
    document.body.appendChild(script);
  };

  const initializeGoogleSignIn = () => {
    if (!window.google) {
      setError('Google Sign-In library not loaded. Please refresh the page.');
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID not configured. Please check .env.local file.');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true, // Improved tracking protection support
      });
    } catch (err) {
      console.error('Google initialization error:', err);
      setError(`Failed to initialize Google Sign-In: ${err}`);
    }
  };

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Authentication failed');
      }

      const userData = await res.json();
      onLogin(userData.email, userData.name, userData.picture);
    } catch (err: any) {
      const errorMsg = err?.message || 'Authentication failed';
      console.error('OAuth error:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!window.google) {
      setError('Google Sign-In not loaded yet. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Use OAuth2 token flow directly - more reliable
    useTokenFlow();
  };

  const useTokenFlow = () => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: (response: any) => {
          if (response.access_token) {
            fetchUserInfo(response.access_token);
          } else {
            setError('Failed to get access token from Google');
            setIsLoading(false);
          }
        },
        error_callback: (error: any) => {
          console.error('OAuth error:', error);
          setIsLoading(false);
          if (error.type === 'popup_closed') {
            setError('Popup was closed. If this persists, check that OAuth consent screen is configured in Google Cloud Console.');
          } else {
            setError(`Google Sign-In failed: ${error.type || 'Unknown error'}`);
          }
        }
      });
      client.requestAccessToken();
    } catch (err) {
      setError(`Failed to open Google Sign-In: ${err}`);
      setIsLoading(false);
    }
  };

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();

      const res = await fetch(`${API_BASE_URL}/auth/google/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          sub: userInfo.sub
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Authentication failed');
      }

      const userData = await res.json();
      onLogin(userData.email, userData.name, userData.picture);
    } catch (err: any) {
      const errorMsg = err?.message || 'Authentication failed';
      console.error('User info fetch error:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900 px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Login Card */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-800">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-6">
              <span className="text-white font-bold text-3xl">C</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              CMS Tracker
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Secure Portal with Google Authentication
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Authorized @lmes.in users only</span>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Authentication Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading || !googleLoaded}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <LoaderIcon className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <GoogleLogo className="w-5 h-5 mr-2" />
                )}
                {isLoading ? 'Authenticating...' : 'Sign in with Google'}
              </button>

              {!googleLoaded && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Loading Google Sign-In...</p>
                    <p className="mt-1">If this persists, check your browser console for errors.</p>
                  </div>
                </div>
              )}

              {!GOOGLE_CLIENT_ID && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <p className="font-medium">Google Client ID not configured</p>
                    <p className="mt-1">Please set VITE_GOOGLE_CLIENT_ID in your .env.local file</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Powered by Google OAuth 2.0 • All data is encrypted
        </p>
      </div>
    </div>
  );
};

export default OAuthLoginScreen;
