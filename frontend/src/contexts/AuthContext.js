// src/contexts/AuthContext.js - Fixed version
import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import axiosInstance, { getGlobalEventBus } from '../config/axios';
import { useSimulatedRole } from './SimulatedRoleContext';
import API_URL from '../config/apiUrl';

// Create the auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  // State for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { simulatedRole } = useSimulatedRole();

  const effectiveRole = simulatedRole || user?.role;
  
  // Refs to prevent multiple simultaneous auth checks
  const inFlight = useRef(null);       // the currently running status request, if any
  const lastAuthCheck = useRef(0);
  const intervalRef = useRef(null);
  const AUTH_CHECK_THROTTLE = 60000;   // Min time between background auth checks (60 seconds)
  const FORCE_CHECK_FLOOR = 5000;      // Even forced checks honor this floor, to stop request storms

  // Store user data in ref to avoid dependency issues
  const userRef = useRef(null);

  const checkAuth = useCallback((force = false) => {
    // Always coalesce concurrent checks: never run two /api/auth/status requests
    // at once. A forced check that arrives while one is in flight waits for that
    // result instead of firing a parallel request. Bypassing this guard for
    // forced checks is what previously allowed a request stampede.
    if (inFlight.current) return inFlight.current;

    // Throttle. Forced checks use a much shorter floor than background checks so a
    // genuine re-verify (e.g. after a 401) happens promptly, but a flood of forced
    // calls still can't turn into thousands of requests per second.
    const now = Date.now();
    const minInterval = force ? FORCE_CHECK_FLOOR : AUTH_CHECK_THROTTLE;
    if (now - lastAuthCheck.current < minInterval) return Promise.resolve();
    lastAuthCheck.current = now;

    const run = (async () => {
      try {
        // Only set loading true on initial check
        if (!userRef.current) {
          setIsLoading(true);
        }

        const response = await axiosInstance.get('/api/auth/status', {
          // Add cache busting only for forced checks
          params: force ? { _t: Date.now() } : undefined
        });

        // Only update if data changed by comparing with ref
        const currentUser = userRef.current;
        const newUser = response.data;

        const userDataChanged =
          !currentUser ||
          currentUser.id !== newUser.id ||
          currentUser.username !== newUser.username ||
          currentUser.role !== newUser.role;

        if (userDataChanged) {
          console.log('User data changed, updating state');
          userRef.current = newUser;
          setIsAuthenticated(true);
          setUser(newUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (error.response && error.response.status === 401) {
          userRef.current = null;
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
        inFlight.current = null;
      }
    })();

    inFlight.current = run;
    return run;
  }, []); // No dependencies to prevent recreation

  // Initial auth check on mount
  useEffect(() => {
    checkAuth(true);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkAuth]);

  // When any API call returns 401, re-verify the session so we can react immediately
  // to true session expiry without needing the 10-minute polling interval to fire.
  useEffect(() => {
    const eventBus = getGlobalEventBus();
    const handleAuthRequired = () => checkAuth(true);
    eventBus.on('AUTH_REQUIRED', handleAuthRequired);
    return () => {
      const listeners = eventBus.listeners['AUTH_REQUIRED'];
      if (listeners) {
        const idx = listeners.indexOf(handleAuthRequired);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    };
  }, [checkAuth]);
  
  // Set up interval with ref
  useEffect(() => {
    // If we already have an interval, don't create another
    if (intervalRef.current) return;
    
    // Set up interval for periodic checks - much less frequently
    intervalRef.current = setInterval(() => {
      checkAuth();
    }, 600000); // Check every 10 minutes instead of frequently
    
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [checkAuth]);

  const login = useCallback(() => {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${API_URL}/auth/discord?redirectUrl=${returnUrl}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      // First, clear localStorage safely
      try {
        localStorage.removeItem('guildId');
        localStorage.removeItem('userId');
      } catch (storageError) {
        console.warn('Failed to access localStorage:', storageError);
      }
      
      // Update state before API call to make UI responsive
      userRef.current = null;
      setIsAuthenticated(false);
      setUser(null);
      
      // Make the API call
      await fetch(`${API_URL}/auth/logout`, {
        credentials: 'include'
      });
      
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }, []);

  // Stable forced-check function exposed to consumers. Without this, every render
  // produced a brand-new function, so consumer effects depending on `checkAuth`
  // re-fired every render and triggered another forced check — an infinite loop.
  const forceCheckAuth = useCallback(() => checkAuth(true), [checkAuth]);

  // Memoize the context value so it only changes when auth state actually changes,
  // not on every render. This keeps the exposed `checkAuth` reference stable.
  const contextValue = useMemo(() => ({
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuth: forceCheckAuth // Force check when manually called
  }), [isAuthenticated, user, isLoading, login, logout, forceCheckAuth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;