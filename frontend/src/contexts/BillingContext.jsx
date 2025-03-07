// src/contexts/BillingContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from './AuthContext';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51NjQaxDOgA9CgRuxU6i14aq7vKnf25X0xbsN0RWbUjO7cCMXO5BvFEPexUfOJXVvPb6zoyrlxbEHIuCBD1h1iaxq00vGCNqeqX';
const stripePromise = loadStripe(stripeKey);

const BillingContext = createContext();

export const BillingProvider = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // 'none', 'trial', 'active', 'expired'
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

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
      if (response.data.requiresAction) {
        const stripe = await stripePromise;
        const { error: confirmError } = await stripe.confirmCardPayment(
          response.data.clientSecret
        );
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }
      
      // Update subscription state
      setSubscriptionStatus('active');
      setSubscriptionData(response.data.subscriptionData);
      
      return response.data;
    } catch (error) {
      console.error('Subscription failed:', error);
      setError('Subscription failed. Please try again.');
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
      
      await axiosInstance.post('/api/billing/cancel');
      
      // Note: don't immediately change status as subscription remains active until the end of the period
      
      return true;
    } catch (error) {
      console.error('Cancellation failed:', error);
      setError('Failed to cancel subscription. Please try again.');
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
      
      await axiosInstance.post('/api/billing/update-payment', { paymentMethodId });
      
      return true;
    } catch (error) {
      console.error('Payment update failed:', error);
      setError('Failed to update payment method. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check if guild is active
  const isGuildActive = () => {
    return subscriptionStatus === 'active' || subscriptionStatus === 'trial';
  };

  const value = {
    subscriptionStatus,
    subscriptionData,
    loading,
    error,
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