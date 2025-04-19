// src/contexts/BillingContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from './AuthContext';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key - with better error handling
let stripePromise = null;

const BillingContext = createContext();

export const BillingProvider = ({ children }) => {
    const [subscriptionStatus, setSubscriptionStatus] = useState(null); // 'none', 'trial', 'active', 'expired'
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stripe, setStripe] = useState(null);
    const { user } = useAuth();

  useEffect(() => {
    const getStripeConfig = async () => {
      try {
        const response = await axiosInstance.get('/api/billing/config');
        // Add validation before trying to load Stripe
        if (response.data && response.data.publishableKey && 
            typeof response.data.publishableKey === 'string' && 
            response.data.publishableKey.trim() !== '') {
          const loadedStripe = await loadStripe(response.data.publishableKey);
          setStripe(loadedStripe);
        } else {
          console.warn('Invalid Stripe publishable key received from server');
        }
      } catch (error) {
        console.error('Failed to load Stripe configuration:', error);
      }
    };
    
    getStripeConfig();
  }, []);

  // Load subscription details
  const loadSubscriptionDetails = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get('/api/billing/subscription');
      
      setSubscriptionStatus(response.data.status);
      setSubscriptionData(response.data.data);
    } catch (error) {
      console.error('Failed to load subscription details:', error);
      setError('Failed to load subscription details. Please try again.');
      setSubscriptionStatus('none');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to a plan
  const subscribe = async (planId, paymentDetails) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create payment intent
      const response = await axiosInstance.post('/api/billing/subscribe', {
        planId,
        paymentMethod: paymentDetails.paymentMethodId
      });
      
      // Handle client-side confirmation if required by your payment processor
      if (response.data.requiresAction && response.data.clientSecret) {
        const stripeInstance = await stripe;
        if (!stripeInstance) {
          throw new Error('Stripe failed to initialize');
        }
        
        const { error: confirmError } = await stripeInstance.confirmCardPayment(
          response.data.clientSecret
        );
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }
      
      // Reload subscription data to ensure we have the latest info
      await loadSubscriptionDetails();
      
      return response.data;
    } catch (error) {
      console.error('Subscription failed:', error);
      setError(error.response?.data?.error || 'Subscription failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.post('/api/billing/cancel');
      
      // Reload subscription details to ensure we have the latest info
      await loadSubscriptionDetails();
      
      return response.data;
    } catch (error) {
      console.error('Cancellation failed:', error);
      setError(error.response?.data?.error || 'Failed to cancel subscription. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update payment method
  const updatePaymentMethod = async (paymentMethodId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.post('/api/billing/update-payment', { paymentMethodId });
      
      // Reload subscription details
      await loadSubscriptionDetails();
      
      return response.data;
    } catch (error) {
      console.error('Payment update failed:', error);
      setError(error.response?.data?.error || 'Failed to update payment method. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check if guild is active based on subscription status
  const isGuildActive = useCallback(() => {
    return subscriptionStatus === 'active' || subscriptionStatus === 'trial';
  }, [subscriptionStatus]);

  // Refresh subscription status periodically
  useEffect(() => {
    if (user) {
      // Load subscription details initially
      loadSubscriptionDetails();
      
      // Set up periodic check every 5 minutes
      const intervalId = setInterval(() => {
        loadSubscriptionDetails();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [user, loadSubscriptionDetails]);

  const value = {
    subscriptionStatus,
    subscriptionData,
    loading,
    error,
    stripe,
    subscribe,
    cancelSubscription,
    updatePaymentMethod,
    loadSubscriptionDetails,
    isGuildActive
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};