import React, { useState } from 'react';
import { SparklesIcon, LoaderIcon } from './icons';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api';

interface LoginScreenProps {
  onLogin: (email: string, name: string, picture: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    // SECURITY: Enforce domain restriction
    if (!normalizedEmail.endsWith('@lmes.in')) {
      setError('Access Restricted: Only authorized users (@lmes.in) can access this portal.');
      setIsLoading(false);
      return;
    }

    try {
      // Call backend simple login endpoint
      const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE_URL}/auth/simple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Authentication failed' }));
        throw new Error(errorData.message || 'Authentication failed');
      }

      const userData = await res.json();
      onLogin(userData.email, userData.name, userData.picture);
    } catch (err: any) {
      const errorMsg = err?.message || 'Authentication failed';
      console.error('Login error:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
            CMS Tracker
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Secure Internal Access Portal
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-black dark:border-slate-600 placeholder-slate-500 dark:placeholder-slate-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="employee@lmes.in"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Authentication Failed
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-500/30"
            >
              {isLoading ? (
                <LoaderIcon className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center">
                  Sign in to Dashboard
                  <SparklesIcon className="ml-2 h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;