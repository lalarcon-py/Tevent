// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../config/axios';

// Create the auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  // State for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs to prevent multiple simultaneous auth checks
  const authCheckInProgress = useRef(false);
  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_THROTTLE = 2000; // Min time between auth checks (2 seconds)

  const checkAuth = useCallback(async (force = false) => {
    if (authCheckInProgress.current && !force) return;
    
    const now = Date.now();
    if (!force && now - lastAuthCheck.current < AUTH_CHECK_THROTTLE) return;
  
    authCheckInProgress.current = true;
    lastAuthCheck.current = now;
  
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/auth/status');
      
      // Only update if data changed
      const userDataChanged = 
        !isAuthenticated ||
        user?.id !== response.data.id ||
        user?.username !== response.data.username;
  
      if (userDataChanged) {
        setIsAuthenticated(true);
        setUser(response.data);
      }
    } catch (error) {
      // Handle errors
    } finally {
      setIsLoading(false);
      authCheckInProgress.current = false;
    }
  }, [isAuthenticated, user]);

  /**
   * Redirect to Discord OAuth login
   */
  const login = useCallback(() => {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000'
      : process.env.REACT_APP_API_URL || window.location.origin;
    
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${baseUrl}/auth/discord?redirectUrl=${returnUrl}`;
  }, []);

  /**
   * Log out the current user
   */
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