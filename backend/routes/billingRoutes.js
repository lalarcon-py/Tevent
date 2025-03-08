// backend/routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

// Get current subscription
router.get('/subscription', billingController.getSubscription);

// Get billing history
router.get('/history', billingController.getBillingHistory);

// Download invoice
router.get('/invoice/:invoiceId', billingController.getInvoice);

// Subscribe to a plan
router.post('/subscribe', billingController.subscribe);

// Cancel subscription
router.post('/cancel', billingController.cancelSubscription);

// Update payment method
router.post('/update-payment', billingController.updatePaymentMethod);


router.get('/config', (req, res) => {
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  });

module.exports = router;