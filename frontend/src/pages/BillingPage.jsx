// src/pages/BillingPage.jsx

// THIS RESOURCE DOES NOT WORK YET (NOT COMPLETELY ANYWAY)
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBilling } from '../contexts/BillingContext';
import PaymentMethodForm from '../components/Billing/PaymentMethodForm';
import SubscriptionDetails from '../components/Billing/SubscriptionDetails';
import BillingHistory from '../components/Billing/BillingHistory';

const BillingPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { 
    subscriptionStatus, 
    subscriptionData, 
    loading, 
    error,
    subscribe,
    cancelSubscription,
    loadSubscriptionDetails
  } = useBilling();
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load subscription details on page load
  useEffect(() => {
    loadSubscriptionDetails();
  }, [loadSubscriptionDetails]);

  // Subscription plans
  const plans = [
    {
      id: 'monthly',
      name: 'Month to Month',
      price: '$9.99',
      period: 'month',
      totalPrice: '$9.99',
      features: [
        'Full guild management features',
        'Unlimited members',
        'Event planning tools',
        'Loot distribution system',
        'Cancel any time'
      ],
      bestFor: 'Flexibility'
    },
    {
      id: 'biannual',
      name: '6 Months',
      price: '$7.50',
      period: 'month',
      totalPrice: '$45',
      features: [
        'All monthly features',
        'Save 25% compared to monthly',
        'Priority support',
        'Extended data retention'
      ],
      bestFor: 'Value',
      popular: true
    },
    {
      id: 'annual',
      name: '12 Months',
      price: '$8.33',
      period: 'month',
      totalPrice: '$100',
      features: [
        'All 6-month features',
        'Two months free compared to monthly',
        'Premium support',
        'Early access to new features'
      ],
      bestFor: 'Commitment'
    }
  ];

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setPaymentDialogOpen(true);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (paymentDetails) => {
    setProcessingPayment(true);
    setPaymentError(null);
    
    try {
      await subscribe(selectedPlan.id, paymentDetails);
      setSuccessMessage(`Successfully subscribed to ${selectedPlan.name} plan`);
      setPaymentDialogOpen(false);
      // Reload subscription details
      loadSubscriptionDetails();
    } catch (error) {
      setPaymentError(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      setCancelDialogOpen(false);
      setSuccessMessage('Your subscription has been canceled');
      // Reload subscription details
      loadSubscriptionDetails();
    } catch (error) {
      setPaymentError(error.message || 'Cancellation failed. Please try again.');
    }
  };

  // Calculate days remaining in trial or subscription
  const getDaysRemaining = () => {
    if (!subscriptionData || !subscriptionData.expiryDate) return 0;
    
    const today = new Date();
    const expiryDate = new Date(subscriptionData.expiryDate);
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Guild Subscription
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {/* Current Subscription Status */}
          {subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? (
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                mb: 4, 
                borderRadius: 2,
                background: 'linear-gradient(45deg, rgba(21,101,192,0.1) 0%, rgba(21,101,192,0.05) 100%)',
                border: '1px solid rgba(25, 118, 210, 0.2)'
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Typography variant="h6" gutterBottom>
                    {subscriptionStatus === 'trial'
                      ? 'Your free trial is active'
                      : `Your subscription is active (${subscriptionData?.planName})`
                    }
                  </Typography>
                  <Typography variant="body1">
                    {subscriptionStatus === 'trial'
                      ? `You have ${getDaysRemaining()} days remaining in your trial`
                      : `Your subscription will renew on ${new Date(subscriptionData?.expiryDate).toLocaleDateString()}`
                    }
                  </Typography>
                  
                  {subscriptionStatus === 'active' && (
                    <Box sx={{ mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        size="small"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        Cancel Subscription
                      </Button>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Guild Status
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      ACTIVE
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                mb: 4, 
                borderRadius: 2,
                background: 'linear-gradient(45deg, rgba(211,47,47,0.1) 0%, rgba(211,47,47,0.05) 100%)',
                border: '1px solid rgba(211, 47, 47, 0.2)'
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Typography variant="h6" gutterBottom color="error">
                    Your subscription has expired
                  </Typography>
                  <Typography variant="body1">
                    Your guild is currently inactive. Subscribe to a plan to regain access to all features.
                  </Typography>
                  {subscriptionData?.gracePeriod && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Your guild data will be deleted after {subscriptionData.gracePeriod} days of inactivity.
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(211, 47, 47, 0.08)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Guild Status
                    </Typography>
                    <Typography variant="h6" color="error" sx={{ fontWeight: 'bold' }}>
                      INACTIVE
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {/* Subscription Plans */}
          <Typography variant="h5" sx={{ mb: 3, mt: 5 }}>
            Choose a Subscription Plan
          </Typography>
          
          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Paper 
                  elevation={plan.popular ? 4 : 2} 
                  sx={{ 
                    p: 3, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'transform 0.2s ease-in-out',
                    borderRadius: 2,
                    border: plan.popular ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255, 255, 255, 0.12)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px -10px rgba(0,0,0,0.2)'
                    }
                  }}
                >
                  {plan.popular && (
                    <Chip 
                      label="Most Popular" 
                      color="primary" 
                      size="small" 
                      sx={{ 
                        position: 'absolute', 
                        top: -12, 
                        right: 20,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                      <Typography variant="h4" component="span" sx={{ fontWeight: 'bold' }}>
                        {plan.price}
                      </Typography>
                      <Typography variant="subtitle1" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                        /{plan.period}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {plan.totalPrice} total
                    </Typography>
                    
                    <Chip
                      label={`Best for: ${plan.bestFor}`}
                      variant="outlined"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ flexGrow: 1 }}>
                    {plan.features.map((feature, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}
                  </Box>
                  
                  <Button
                    variant={plan.popular ? "contained" : "outlined"}
                    color="primary"
                    fullWidth
                    sx={{ mt: 3 }}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={subscriptionStatus === 'active' && subscriptionData?.planId === plan.id}
                  >
                    {subscriptionStatus === 'active' && subscriptionData?.planId === plan.id
                      ? 'Current Plan'
                      : 'Select Plan'
                    }
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          {/* Billing History Section */}
          {subscriptionStatus === 'active' && (
            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                Billing History
              </Typography>
              <BillingHistory />
            </Box>
          )}
        </>
      )}
      
      {/* Payment Dialog */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={() => !processingPayment && setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Payment Details - {selectedPlan?.name}
        </DialogTitle>
        <DialogContent>
          {paymentError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {paymentError}
            </Alert>
          )}
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              You are subscribing to:
            </Typography>
            <Typography variant="h6">
              {selectedPlan?.name} - {selectedPlan?.totalPrice}
            </Typography>
          </Box>
          
          <PaymentMethodForm 
            onSubmit={handlePaymentSubmit} 
            isProcessing={processingPayment}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPaymentDialogOpen(false)}
            disabled={processingPayment}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cancel Subscription Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Cancel Subscription
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to cancel your subscription?
          </Typography>
          <Typography variant="body2" color="error">
            Your guild will remain active until the end of your current billing period.
            After that, your guild will become inactive and will be deleted after 14 days.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Subscription
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelSubscription}
          >
            Cancel Subscription
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BillingPage;