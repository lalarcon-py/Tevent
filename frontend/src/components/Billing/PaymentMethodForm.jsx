// src/components/Billing/PaymentMethodForm.jsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Wrapper component to provide Stripe context
export default function PaymentMethodFormWrapper(props) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodForm {...props} />
    </Elements>
  );
}

function PaymentMethodForm({ onSubmit, isProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cardError, setCardError] = useState(null);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    let hasError = false;
    
    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    } else {
      setNameError('');
    }
    
    if (!email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email is invalid');
      hasError = true;
    } else {
      setEmailError('');
    }
    
    if (hasError) return;
    
    if (!stripe || !elements) {
      setCardError('Payment processing not available. Please try again.');
      return;
    }
    
    // Create payment method
    const cardElement = elements.getElement(CardElement);
    
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name,
        email
      }
    });
    
    if (error) {
      setCardError(error.message);
      return;
    }
    
    // Submit payment details to parent component
    onSubmit({
      paymentMethodId: paymentMethod.id,
      name,
      email
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Name on Card"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!nameError}
            helperText={nameError}
            fullWidth
            required
            disabled={isProcessing}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
            fullWidth
            required
            disabled={isProcessing}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Card Details
          </Typography>
          <Box 
            sx={{ 
              p: 2, 
              border: '1px solid',
              borderColor: cardError ? 'error.main' : 'divider',
              borderRadius: 1
            }}
          >
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </Box>
          {cardError && (
            <FormHelperText error>{cardError}</FormHelperText>
          )}
        </Grid>
      </Grid>
      
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!stripe || isProcessing}
        sx={{ mt: 3 }}
      >
        {isProcessing ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Submit Payment'
        )}
      </Button>
    </Box>
  );
}