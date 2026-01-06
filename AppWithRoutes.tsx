
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppContent from './components/AppContent';
import OAuthLoginScreen from './components/OAuthLoginScreen';
import LoginScreen from './components/LoginScreen';
import LOGIN_TYPE from './login.config';
import type { Student, Activity, User as UserType } from './types';

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

// User interface for app state
interface AppUser {
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
}

const STORAGE_KEY_USER = 'cms_user_session_v2';

const AppWithRoutes: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setUser({
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            isAdmin: userData.isAdmin
          });

          // Use a more robust flag: email + timestamp key
          const loginKey = `login_logged_${userData.email}`;
          const hasLoggedBefore = sessionStorage.getItem(loginKey);
          console.log('AppWithRoutes - Session check for:', userData.email, 'hasLoggedBefore:', hasLoggedBefore, 'loginKey:', loginKey);

          if (!hasLoggedBefore) {
            console.log('AppWithRoutes - Logging first-time login for:', userData.email);

            // Set flag immediately to prevent race conditions
            sessionStorage.setItem(loginKey, 'true');

            // Log login activity
            const newActivity = {
              id: Date.now().toString(),
              user: userData.email,
              action: 'LOGIN',
              details: 'User logged in successfully',
              timestamp: new Date().toLocaleString()
            };

            const activityRes = await fetch(`${API_BASE_URL}/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(newActivity)
            });

            if (activityRes.ok) {
              console.log('AppWithRoutes - Login activity logged successfully');
            } else {
              console.error('AppWithRoutes - Failed to log activity, status:', activityRes.status);
              // Clear flag if logging failed so it can retry
              sessionStorage.removeItem(loginKey);
            }
          } else {
            console.log('AppWithRoutes - Skipping duplicate login log for:', userData.email);
          }
        } else {
          // Session invalid, clear local storage
          localStorage.removeItem(STORAGE_KEY_USER);
          setUser(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem(STORAGE_KEY_USER);
        setUser(null);
      }
      setSessionChecked(true);
    };

    checkSession();
  }, []);

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  const handleLogin = async (email: string, name: string, picture: string) => {
    try {
      // Fetch user data from backend to get admin status
      const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });

      if (res.ok) {
        const userData = await res.json();
        setUser({
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          isAdmin: userData.isAdmin
        });
      } else {
        // Fallback if backend doesn't have user yet
        setUser({
          email,
          name,
          picture,
          isAdmin: false
        });
      }
    } catch (e) {
      // Fallback on error
      setUser({
        email,
        name,
        picture,
        isAdmin: false
      });
    }
  };

  const handleLogout = async () => {
    // Clear the login flag for this user
    if (user?.email) {
      const loginKey = `login_logged_${user.email}`;
      sessionStorage.removeItem(loginKey);
    }

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
  };

  // Show loading while checking session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login route - now at root */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : LOGIN_TYPE === 'oauth' ? (
              <OAuthLoginScreen onLogin={handleLogin} />
            ) : (
              <LoginScreen onLogin={(email) => handleLogin(email, '', '')} />
            )
          }
        />

        {/* Main app routes - handle all dashboard sub-routes */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <AppContent user={user} setUser={setUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/dashboard/*"
          element={
            user ? (
              <AppContent user={user} setUser={setUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Also support direct routes without /dashboard prefix */}
        {user && (
          <>
            <Route path="/all-students" element={<AppContent user={user} setUser={setUser} />} />
            <Route path="/add-student" element={<AppContent user={user} setUser={setUser} />} />
            <Route path="/team-tasks" element={<AppContent user={user} setUser={setUser} />} />
            <Route path="/activities" element={<AppContent user={user} setUser={setUser} />} />
            <Route path="/analytics" element={<AppContent user={user} setUser={setUser} />} />
            <Route path="/settings" element={<AppContent user={user} setUser={setUser} />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default AppWithRoutes;
