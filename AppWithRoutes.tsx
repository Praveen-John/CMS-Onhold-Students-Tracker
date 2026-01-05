
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppContent from './components/AppContent';
import OAuthLoginScreen from './components/OAuthLoginScreen';
import LoginScreen from './components/LoginScreen';
import LOGIN_TYPE from './login.config';
import type { Student, Activity, User as UserType } from './types';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api';

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
