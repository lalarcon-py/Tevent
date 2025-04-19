// backend/routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

// Get Stripe configuration
router.get('/config', billingController.getConfig);

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

// Webhook endpoint - this needs raw request body, so use bodyParser.raw middleware in app.js
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

module.exports = router;