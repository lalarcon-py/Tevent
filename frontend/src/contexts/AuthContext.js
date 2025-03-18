// src/contexts/AuthContext.js - Fixed version
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../config/axios';
import { useSimulatedRole } from './SimulatedRoleContext';

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
  const authCheckInProgress = useRef(false);
  const lastAuthCheck = useRef(0);
  const intervalRef = useRef(null);
  const AUTH_CHECK_THROTTLE = 5000; // Min time between auth checks (5 seconds)

  // Store user data in ref to avoid dependency issues
  const userRef = useRef(null);

  const checkAuth = useCallback(async (force = false) => {
    // If a check is already in progress and not forced, skip
    if (authCheckInProgress.current && !force) return;
    
    const now = Date.now();
    if (!force && now - lastAuthCheck.current < AUTH_CHECK_THROTTLE) return;
  
    authCheckInProgress.current = true;
    lastAuthCheck.current = now;
  
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
      authCheckInProgress.current = false;
    }
  }, []); // No dependencies to prevent recreation

  // Initial auth check on mount 
  useEffect(() => {
    // Check auth on mount
    checkAuth(true);
    
    // Clean up any existing interval
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
    }, 300000); // Check every 5 minutes
    
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [checkAuth]);

  const login = useCallback(() => {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000'
      : process.env.REACT_APP_API_URL || window.location.origin;
    
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${baseUrl}/auth/discord?redirectUrl=${returnUrl}`;
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
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000'
        : process.env.REACT_APP_API_URL || window.location.origin;
      
      await fetch(`${baseUrl}/auth/logout`, {
        credentials: 'include'
      });
      
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }, []);

  // Context value
  const contextValue = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuth: () => checkAuth(true) // Force check when manually called
  };

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