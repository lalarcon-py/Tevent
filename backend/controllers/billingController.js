// backend/controllers/billingController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { User, Guild, GuildMember, Subscription, BillingTransaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Mapping of plan IDs to Stripe price IDs
const PLAN_PRICE_MAP = {
  monthly: 'price_1R0B3SQAPdENNwPpNuypRR5c', // Replace with your actual Stripe price IDs
  biannual: 'price_1R0B5ZQAPdENNwPpQSJaEc5Q',
  annual: 'price_1R0B75QAPdENNwPpNbTn2WMq'
};

// Plan details for reference
const PLAN_DETAILS = {
  monthly: {
    name: 'Month to Month',
    amount: 9.99,
    interval: 'monthly',
    intervalCount: 1
  },
  biannual: {
    name: '6 Months',
    amount: 45,
    interval: 'biannually',
    intervalCount: 6
  },
  annual: {
    name: '12 Months',
    amount: 100,
    interval: 'annually',
    intervalCount: 12
  }
};

// Helper function to get guild for user with proper error handling
const getGuildForUser = async (userId, roleRequired = 'Guild Master') => {
  const guildMember = await GuildMember.findOne({
    where: {
      user_id: userId,
      role: roleRequired
    },
    include: [{ model: Guild }]
  });

  if (!guildMember) {
    throw new Error(`You must be a ${roleRequired} to perform this action`);
  }

  return guildMember.Guild;
};

// Helper function for handling Stripe API errors
const handleStripeError = (error) => {
  console.error('Stripe API error:', error);
  
  // Determine appropriate error message based on error type
  let errorMessage = 'An error occurred with the payment processor';
  
  if (error.type === 'StripeCardError') {
    errorMessage = error.message || 'Your card was declined';
  } else if (error.type === 'StripeInvalidRequestError') {
    errorMessage = 'Invalid payment information provided';
  } else if (error.type === 'StripeAPIError' || error.type === 'StripeConnectionError') {
    errorMessage = 'Payment service temporarily unavailable. Please try again later.';
  } else if (error.type === 'StripeRateLimitError') {
    errorMessage = 'Too many requests. Please try again in a few moments.';
  }
  
  return { success: false, error: errorMessage };
};

// Helper function to calculate subscription period dates
const calculateSubscriptionDates = (planId) => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  
  // Set end date based on plan
  if (planId === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (planId === 'biannual') {
    endDate.setMonth(endDate.getMonth() + 6);
  } else if (planId === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  return { startDate, endDate };
};

const billingController = {
  // Get Stripe public key config
  getConfig: async (req, res) => {
    try {
      res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      });
    } catch (error) {
      console.error('Error getting Stripe config:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  },

  // Get current subscription
  getSubscription: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is a Guild Master of any guild
      let guild;
      try {
        guild = await getGuildForUser(req.user.id, 'Guild Master');
      } catch (error) {
        return res.json({ 
          status: 'none',
          message: 'You are not a Guild Master of any guild'
        });
      }

      // Get the guild's subscription
      const subscription = await Subscription.findOne({
        where: { guild_id: guild.id }
      });

      if (!subscription) {
        // Check if guild is within free trial period (7 days from creation)
        const guildCreatedAt = new Date(guild.created_at || guild.createdAt);
        const trialEndDate = new Date(guildCreatedAt);
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        
        const now = new Date();
        
        if (now < trialEndDate) {
          // Still in trial
          return res.json({
            status: 'trial',
            data: {
              startDate: guildCreatedAt,
              expiryDate: trialEndDate,
              planName: 'Free Trial'
            }
          });
        } else {
          // Trial expired
          // Calculate days until deletion (14 days after trial expiry)
          const deletionDate = new Date(trialEndDate);
          deletionDate.setDate(deletionDate.getDate() + 14);
          
          const daysUntilDeletion = Math.max(0, Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24)));
          
          return res.json({
            status: 'expired',
            data: {
              gracePeriod: daysUntilDeletion,
              lastActiveDate: trialEndDate
            }
          });
        }
      }

      // Check subscription status
      const now = new Date();
      const expiryDate = new Date(subscription.expiry_date);
      
      if (subscription.status === 'cancelled' && now > expiryDate) {
        // Calculate days until deletion (14 days after expiry)
        const deletionDate = new Date(expiryDate);
        deletionDate.setDate(deletionDate.getDate() + 14);
        
        const daysUntilDeletion = Math.max(0, Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24)));
        
        return res.json({
          status: 'expired',
          data: {
            lastActiveDate: expiryDate,
            gracePeriod: daysUntilDeletion,
            cancelled: true
          }
        });
      }
      
      if (now > expiryDate) {
        // Calculate days until deletion (14 days after expiry)
        const deletionDate = new Date(expiryDate);
        deletionDate.setDate(deletionDate.getDate() + 14);
        
        const daysUntilDeletion = Math.max(0, Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24)));
        
        return res.json({
          status: 'expired',
          data: {
            lastActiveDate: expiryDate,
            gracePeriod: daysUntilDeletion
          }
        });
      }

      // Get payment method details if available
      let paymentMethod = null;
      if (subscription.payment_method_id) {
        try {
          const stripePaymentMethod = await stripe.paymentMethods.retrieve(
            subscription.payment_method_id
          );
          
          paymentMethod = {
            brand: stripePaymentMethod.card.brand,
            last4: stripePaymentMethod.card.last4,
            expiryMonth: stripePaymentMethod.card.exp_month,
            expiryYear: stripePaymentMethod.card.exp_year
          };
        } catch (error) {
          console.error('Error retrieving payment method:', error);
        }
      }

      // Return active subscription
      return res.json({
        status: 'active',
        data: {
          id: subscription.id,
          planId: subscription.plan_id,
          planName: PLAN_DETAILS[subscription.plan_id]?.name || subscription.plan_id,
          startDate: subscription.start_date,
          expiryDate: subscription.expiry_date,
          amount: PLAN_DETAILS[subscription.plan_id]?.amount || 0,
          interval: PLAN_DETAILS[subscription.plan_id]?.interval || 'monthly',
          stripeSubscriptionId: subscription.stripe_subscription_id,
          paymentMethod,
          cancelled: subscription.status === 'cancelled'
        }
      });
    } catch (error) {
      console.error('Error getting subscription:', error);
      res.status(500).json({ error: 'Failed to get subscription details' });
    }
  },

  // Get billing history
  getBillingHistory: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get guilds where user is Guild Master
      const guildMemberships = await GuildMember.findAll({
        where: {
          user_id: req.user.id,
          role: 'Guild Master'
        },
        attributes: ['guild_id']
      });

      if (!guildMemberships.length) {
        return res.json({ transactions: [] });
      }

      const guildIds = guildMemberships.map(gm => gm.guild_id);

      // Get billing transactions for these guilds
      const transactions = await BillingTransaction.findAll({
        where: {
          guild_id: { [Op.in]: guildIds }
        },
        order: [['date', 'DESC']],
        limit: 50 // Limit to recent transactions
      });

      res.json({
        transactions: transactions.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          status: t.status,
          invoiceId: t.invoice_id
        }))
      });
    } catch (error) {
      console.error('Error getting billing history:', error);
      res.status(500).json({ error: 'Failed to get billing history' });
    }
  },

  // Get invoice
  getInvoice: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { invoiceId } = req.params;

      // Verify user has access to this invoice
      const transaction = await BillingTransaction.findOne({
        where: { invoice_id: invoiceId },
        include: [{
          model: Guild,
          include: [{
            model: GuildMember,
            where: {
              user_id: req.user.id,
              role: 'Guild Master'
            }
          }]
        }]
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      try {
        // Get invoice from Stripe
        const invoice = await stripe.invoices.retrieve(invoiceId, {
          expand: ['customer', 'subscription']
        });

        // Get PDF
        const pdf = await stripe.invoices.retrievePdf(invoiceId);

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);

        // Send the PDF
        res.send(pdf);
      } catch (stripeError) {
        console.error('Stripe error getting invoice:', stripeError);
        res.status(500).json({ error: 'Failed to retrieve invoice from payment processor' });
      }
    } catch (error) {
      console.error('Error getting invoice:', error);
      res.status(500).json({ error: 'Failed to get invoice' });
    }
  },

  // Subscribe to a plan
  subscribe: async (req, res) => {
    // Use a transaction for database consistency
    const transaction = await sequelize.transaction();
    
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { planId, paymentMethod } = req.body;

      if (!planId || !paymentMethod) {
        return res.status(400).json({ error: 'Plan ID and payment method are required' });
      }

      // Verify plan exists
      if (!PLAN_PRICE_MAP[planId]) {
        return res.status(400).json({ error: 'Invalid plan ID' });
      }

      // Find guild where user is Guild Master
      let guild;
      try {
        guild = await getGuildForUser(req.user.id, 'Guild Master');
      } catch (error) {
        return res.status(403).json({ error: error.message });
      }

      // Calculate subscription dates
      const { startDate, endDate } = calculateSubscriptionDates(planId);

      // Check if customer already exists in Stripe
      let customerId;
      
      // Look for existing customer ID associated with guild
      const existingSubscription = await Subscription.findOne({
        where: { guild_id: guild.id }
      });

      // Stripe integration
      try {
        if (existingSubscription && existingSubscription.stripe_customer_id) {
          customerId = existingSubscription.stripe_customer_id;
          
          // Update the customer's payment method if it exists
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethod
            }
          });
        } else {
          // Create a new customer in Stripe
          const customer = await stripe.customers.create({
            email: req.user.email || `${req.user.username}@example.com`,
            name: req.user.username,
            payment_method: paymentMethod,
            invoice_settings: {
              default_payment_method: paymentMethod
            },
            metadata: {
              guild_id: guild.id,
              user_id: req.user.id
            }
          });
          
          customerId = customer.id;
        }

        // Create a subscription in Stripe
        const stripeSubscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [
            { price: PLAN_PRICE_MAP[planId] }
          ],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription'
          },
          metadata: {
            guild_id: guild.id,
            plan_id: planId,
            user_id: req.user.id
          },
          expand: ['latest_invoice.payment_intent']
        });

        // Create or update the subscription in our database
        let dbSubscription;
        
        if (existingSubscription) {
          // Update existing subscription
          dbSubscription = await existingSubscription.update({
            plan_id: planId,
            start_date: startDate,
            expiry_date: endDate,
            stripe_subscription_id: stripeSubscription.id,
            stripe_customer_id: customerId,
            payment_method_id: paymentMethod,
            status: 'active',
            cancelled_at: null
          }, { transaction });
        } else {
          // Create new subscription
          dbSubscription = await Subscription.create({
            guild_id: guild.id,
            plan_id: planId,
            start_date: startDate,
            expiry_date: endDate,
            stripe_subscription_id: stripeSubscription.id,
            stripe_customer_id: customerId,
            payment_method_id: paymentMethod,
            status: 'active'
          }, { transaction });
        }

        // Activate guild if it was inactive
        if (guild.status !== 'ACTIVE') {
          await guild.update({ status: 'ACTIVE' }, { transaction });
        }

        // Record the transaction
        const planDetails = PLAN_DETAILS[planId];
        await BillingTransaction.create({
          guild_id: guild.id,
          date: new Date(),
          description: `Subscription to ${planDetails.name}`,
          amount: planDetails.amount,
          status: stripeSubscription.latest_invoice.payment_intent.status === 'succeeded' ? 'succeeded' : 'pending',
          invoice_id: stripeSubscription.latest_invoice.id
        }, { transaction });

        // Commit the transaction
        await transaction.commit();

        // Return subscription details
        return res.json({
          status: 'success',
          subscriptionData: {
            id: dbSubscription.id,
            planId: dbSubscription.plan_id,
            planName: planDetails.name,
            startDate: dbSubscription.start_date,
            expiryDate: dbSubscription.expiry_date,
            stripeSubscriptionId: stripeSubscription.id,
            amount: planDetails.amount,
            interval: planDetails.interval
          },
          requiresAction: stripeSubscription.latest_invoice.payment_intent.status === 'requires_action',
          clientSecret: stripeSubscription.latest_invoice.payment_intent.status === 'requires_action'
            ? stripeSubscription.latest_invoice.payment_intent.client_secret
            : null
        });
      } catch (stripeError) {
        // Rollback the transaction if Stripe fails
        await transaction.rollback();
        const errorResponse = handleStripeError(stripeError);
        console.error('Stripe subscription error:', stripeError);
        res.status(500).json({ error: errorResponse.error });
      }
    } catch (error) {
      // Rollback the transaction on any error
      await transaction.rollback();
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  },

  // Cancel subscription
  cancelSubscription: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Find guild where user is Guild Master
      let guild;
      try {
        guild = await getGuildForUser(req.user.id, 'Guild Master');
      } catch (error) {
        return res.status(403).json({ error: error.message });
      }

      // Find the subscription
      const subscription = await Subscription.findOne({
        where: { guild_id: guild.id }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'No active subscription found' });
      }

      // Cancel subscription in Stripe if it exists
      if (subscription.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
            metadata: {
              cancelled_by: req.user.id,
              cancelled_at: new Date().toISOString()
            }
          });
        } catch (stripeError) {
          console.error('Error cancelling Stripe subscription:', stripeError);
          // Continue even if Stripe cancellation fails
        }
      }

      // Update subscription status but don't delete it
      // The guild remains active until expiry_date
      await subscription.update({
        status: 'cancelled',
        cancelled_at: new Date()
      });

      // Return success
      res.json({
        status: 'success',
        message: 'Subscription cancelled successfully',
        activeUntil: subscription.expiry_date
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  },

  // Update payment method
  updatePaymentMethod: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({ error: 'Payment method ID is required' });
      }

      // Find guild where user is Guild Master
      let guild;
      try {
        guild = await getGuildForUser(req.user.id, 'Guild Master');
      } catch (error) {
        return res.status(403).json({ error: error.message });
      }

      // Find the subscription
      const subscription = await Subscription.findOne({
        where: { guild_id: guild.id }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      // Update payment method in Stripe
      try {
        if (subscription.stripe_customer_id) {
          await stripe.customers.update(subscription.stripe_customer_id, {
            invoice_settings: {
              default_payment_method: paymentMethodId
            }
          });

          // If there's an active Stripe subscription, update its default payment method
          if (subscription.stripe_subscription_id) {
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              default_payment_method: paymentMethodId
            });
          }
        }

        // Update payment method in our database
        await subscription.update({
          payment_method_id: paymentMethodId
        });

        res.json({
          status: 'success',
          message: 'Payment method updated successfully'
        });
      } catch (stripeError) {
        const errorResponse = handleStripeError(stripeError);
        res.status(500).json({ error: errorResponse.error });
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      res.status(500).json({ error: 'Failed to update payment method' });
    }
  },
  
  // Handle Stripe webhook events
  handleWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify the event came from Stripe
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Handle the event
    const transaction = await sequelize.transaction();
    
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object, transaction);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object, transaction);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object, transaction);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object, transaction);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      await transaction.commit();
      res.json({ received: true });
    } catch (error) {
      await transaction.rollback();
      console.error('Error handling webhook event:', error);
      res.status(500).json({ error: 'Failed to process webhook event' });
    }
  }
};

// Webhook handler functions
async function handleInvoicePaymentSucceeded(invoice, transaction) {
  if (!invoice.subscription) return;
  
  // Find the corresponding subscription in our database
  const subscription = await Subscription.findOne({
    where: { stripe_subscription_id: invoice.subscription }
  });
  
  if (!subscription) return;
  
  // Update the subscription status
  await subscription.update({
    status: 'active'
  }, { transaction });
  
  // Update guild status
  const guild = await Guild.findByPk(subscription.guild_id);
  if (guild && guild.status !== 'ACTIVE') {
    await guild.update({ status: 'ACTIVE' }, { transaction });
  }
  
  // Record the transaction
  const planDetails = PLAN_DETAILS[subscription.plan_id] || { name: 'Subscription', amount: invoice.amount_paid / 100 };
  
  await BillingTransaction.create({
    guild_id: subscription.guild_id,
    date: new Date(),
    description: `Payment for ${planDetails.name}`,
    amount: invoice.amount_paid / 100,
    status: 'succeeded',
    invoice_id: invoice.id
  }, { transaction });
}

async function handleInvoicePaymentFailed(invoice, transaction) {
  if (!invoice.subscription) return;
  
  // Find the corresponding subscription in our database
  const subscription = await Subscription.findOne({
    where: { stripe_subscription_id: invoice.subscription }
  });
  
  if (!subscription) return;
  
  // Record the failed transaction
  await BillingTransaction.create({
    guild_id: subscription.guild_id,
    date: new Date(),
    description: 'Payment failed',
    amount: invoice.amount_due / 100,
    status: 'failed',
    invoice_id: invoice.id
  }, { transaction });
}

async function handleSubscriptionUpdated(stripeSubscription, transaction) {
  // Find the corresponding subscription in our database
  const subscription = await Subscription.findOne({
    where: { stripe_subscription_id: stripeSubscription.id }
  });
  
  if (!subscription) return;
  
  // Update subscription details as needed
  const updates = {};
  
  if (stripeSubscription.cancel_at_period_end) {
    updates.status = 'cancelled';
    if (!subscription.cancelled_at) {
      updates.cancelled_at = new Date();
    }
  } else if (stripeSubscription.status === 'active' && subscription.status !== 'active') {
    updates.status = 'active';
    updates.cancelled_at = null;
  } else if (stripeSubscription.status === 'canceled') {
    updates.status = 'cancelled';
    if (!subscription.cancelled_at) {
      updates.cancelled_at = new Date();
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await subscription.update(updates, { transaction });
  }
}

async function handleSubscriptionDeleted(stripeSubscription, transaction) {
  // Find the corresponding subscription in our database
  const subscription = await Subscription.findOne({
    where: { stripe_subscription_id: stripeSubscription.id }
  });
  
  if (!subscription) return;
  
  // Update subscription status
  await subscription.update({
    status: 'cancelled',
    cancelled_at: new Date()
  }, { transaction });
  
  // Check if subscription has expired
  const now = new Date();
  const expiryDate = new Date(subscription.expiry_date);
  
  if (now > expiryDate) {
    // Mark guild as inactive if the subscription is expired
    const guild = await Guild.findByPk(subscription.guild_id);
    if (guild && guild.status === 'ACTIVE') {
      await guild.update({ status: 'INACTIVE' }, { transaction });
    }
  }
}

module.exports = billingController;