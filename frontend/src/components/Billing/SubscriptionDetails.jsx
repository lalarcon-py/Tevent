// src/components/Billing/SubscriptionDetails.jsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip
} from '@mui/material';
import { useBilling } from '../../contexts/BillingContext';

const SubscriptionDetails = () => {
  const { subscriptionData, subscriptionStatus } = useBilling();
  
  if (!subscriptionData) {
    return (
      <Typography color="text.secondary">
        No subscription data available.
      </Typography>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h6">
          Subscription Details
        </Typography>
        <Chip
          label={subscriptionStatus === 'trial' ? 'TRIAL' : subscriptionStatus.toUpperCase()}
          color={subscriptionStatus === 'active' ? 'success' : subscriptionStatus === 'trial' ? 'info' : 'error'}
          size="small"
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Plan
          </Typography>
          <Typography variant="body1">
            {subscriptionData.planName}
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Status
          </Typography>
          <Typography variant="body1">
            {subscriptionStatus === 'trial' ? 'Free Trial' : 'Active'}
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Start Date
          </Typography>
          <Typography variant="body1">
            {formatDate(subscriptionData.startDate)}
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
            {subscriptionStatus === 'trial' ? 'Trial Ends' : 'Next Billing Date'}
          </Typography>
          <Typography variant="body1">
            {formatDate(subscriptionData.expiryDate)}
          </Typography>
        </Grid>
        
        {subscriptionStatus === 'active' && (
          <>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Payment Method
              </Typography>
              <Typography variant="body1">
                {subscriptionData.paymentMethod?.brand} •••• {subscriptionData.paymentMethod?.last4}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Amount
              </Typography>
              <Typography variant="body1">
                ${subscriptionData.amount.toFixed(2)} {subscriptionData.interval}
              </Typography>
            </Grid>
          </>
        )}
      </Grid>
    </Paper>
  );
};

export default SubscriptionDetails;