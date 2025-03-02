// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../config/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Add rate limiting to prevent rapid successive checks
    const now = Date.now();
    const lastCheck = sessionStorage.getItem('lastAuthCheck');
    
    // Only check if it's been at least 2 seconds since last check
    if (lastCheck && now - parseInt(lastCheck) < 2000) {
      return;
    }
    
    try {
      sessionStorage.setItem('lastAuthCheck', now.toString());
      setLoading(true);
      console.log('Checking authentication status...');
      const response = await axiosInstance.get('/api/auth/status', {
        withCredentials: true
      });
      
      if (response.data && response.data.id) {
        console.log('Authentication successful:', response.data);
        setIsAuthenticated(true);
        setUser(response.data);
      } else {
        console.log('Not authenticated or invalid user data');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      console.log('Logging out...');
      
      // Pre-emptively set auth state to false for immediate UI feedback
      setIsAuthenticated(false);
      setUser(null);
      
      // Then make the API call
      await axiosInstance.get('/auth/logout', {
        withCredentials: true
      });
      
      console.log('Logout successful');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // We've already set auth state to false, so the UI should still update
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading, 
      checkAuth,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);