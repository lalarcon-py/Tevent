// backend/controllers/stripeWebhookController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Guild, Subscription, BillingTransaction } = require('../models');
const { sequelize } = require('../config/database');

// Webhook signature verification
const verifyStripeSignature = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    return res.status(400).json({ error: 'Stripe signature is missing' });
  }
  
  try {
    // Verify webhook signature using your webhook secret
    const event = stripe.webhooks.constructEvent(
      req.rawBody, // raw request body (ensure it's available in your Express app)
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    req.stripeEvent = event;
    next();
  } catch (error) {
    console.error('⚠️ Webhook signature verification failed:', error);
    return res.status(400).json({ error: 'Invalid signature' });
  }
};

// Handle various Stripe webhook events
const handleStripeWebhook = async (req, res) => {
  const event = req.stripeEvent;
  
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event);
        break;
    }
    
    // Return success 2xx status code to Stripe to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error handling Stripe event ${event.type}:`, error);
    
    // Still return 200 to acknowledge receipt to Stripe
    // so they don't keep trying to deliver the same event
    res.status(200).json({ 
      received: true,
      processed: false,
      error: error.message
    });
  }
};

// Handle successful payment
const handlePaymentSucceeded = async (event) => {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Find Stripe metadata if available
    let guildId;
    
    // Try to get metadata from the subscription
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      guildId = stripeSubscription.metadata?.guild_id;
    } catch (err) {
      console.error('Error retrieving subscription from Stripe:', err);
    }
    
    // If no metadata, look up by subscription ID in our database
    if (!guildId) {
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscriptionId },
        transaction
      });
      
      if (!subscription) {
        console.error(`No subscription found for Stripe subscription ID: ${subscriptionId}`);
        await transaction.rollback();
        return;
      }
      
      guildId = subscription.guild_id;
    }
    
    // Find guild and subscription
    const guild = await Guild.findByPk(guildId, { transaction });
    const subscription = await Subscription.findOne({
      where: { guild_id: guildId },
      transaction
    });
    
    if (!guild || !subscription) {
      console.error(`Guild or subscription not found for guild ID: ${guildId}`);
      await transaction.rollback();
      return;
    }
    
    // Update subscription end date
    // For monthly plans, add 1 month. For other intervals, use the period_end from Stripe
    const currentEndDate = new Date(subscription.expiry_date);
    const newEndDate = new Date(currentEndDate);
    
    if (subscription.plan_id === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (subscription.plan_id === 'biannual') {
      newEndDate.setMonth(newEndDate.getMonth() + 6);
    } else if (subscription.plan_id === 'annual') {
      newEndDate.setMonth(newEndDate.getMonth() + 12);
    } else {
      // Default fallback: use the period_end from Stripe
      newEndDate.setTime(invoice.period_end * 1000);
    }
    
    // Update subscription
    await subscription.update({
      expiry_date: newEndDate,
      status: 'active',
      cancelled_at: null
    }, { transaction });
    
    // Ensure guild is active
    await guild.update({ status: 'ACTIVE' }, { transaction });
    
    // Record the transaction
    await BillingTransaction.create({
      guild_id: guildId,
      date: new Date(),
      description: `Payment succeeded for invoice ${invoice.number || invoice.id}`,
      amount: invoice.amount_paid / 100, // Convert from cents to dollars
      status: 'succeeded',
      invoice_id: invoice.id
    }, { transaction });
    
    await transaction.commit();
    console.log(`Successfully processed payment for guild ${guildId}, subscription extended to ${newEndDate}`);
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing payment_succeeded event:', error);
    throw error;
  }
};

// Handle failed payment
const handlePaymentFailed = async (event) => {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Find the subscription by Stripe subscription ID
    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: subscriptionId },
      transaction
    });
    
    if (!subscription) {
      console.error(`No subscription found for Stripe subscription ID: ${subscriptionId}`);
      await transaction.rollback();
      return;
    }
    
    // Record the failed payment 
    await BillingTransaction.create({
      guild_id: subscription.guild_id,
      date: new Date(),
      description: `Payment failed for invoice ${invoice.number || invoice.id}`,
      amount: invoice.amount_due / 100, // Convert from cents to dollars
      status: 'failed',
      invoice_id: invoice.id
    }, { transaction });
    
    // If the subscription is past due, update guild status
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    
    if (now > expiryDate) {
      const guild = await Guild.findByPk(subscription.guild_id, { transaction });
      
      if (guild) {
        await guild.update({ status: 'INACTIVE' }, { transaction });
        console.log(`Guild ${subscription.guild_id} marked as INACTIVE due to payment failure`);
      }
    }
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing payment_failed event:', error);
    throw error;
  }
};

// Handle subscription deletion
const handleSubscriptionDeleted = async (event) => {
  const subscription = event.data.object;
  const stripeSubscriptionId = subscription.id;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Find the subscription by Stripe subscription ID
    const dbSubscription = await Subscription.findOne({
      where: { stripe_subscription_id: stripeSubscriptionId },
      transaction
    });
    
    if (!dbSubscription) {
      console.error(`No subscription found for Stripe subscription ID: ${stripeSubscriptionId}`);
      await transaction.rollback();
      return;
    }
    
    // Update subscription status
    await dbSubscription.update({
      status: 'cancelled',
      cancelled_at: new Date()
    }, { transaction });
    
    // Check if guild should be marked inactive
    const now = new Date();
    const expiryDate = new Date(dbSubscription.expiry_date);
    
    if (now > expiryDate) {
      const guild = await Guild.findByPk(dbSubscription.guild_id, { transaction });
      
      if (guild) {
        await guild.update({ status: 'INACTIVE' }, { transaction });
        console.log(`Guild ${dbSubscription.guild_id} marked as INACTIVE due to subscription deletion`);
      }
    }
    
    // Record the event
    await BillingTransaction.create({
      guild_id: dbSubscription.guild_id,
      date: new Date(),
      description: 'Subscription cancelled',
      amount: 0,
      status: 'cancelled',
      invoice_id: null
    }, { transaction });
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing subscription_deleted event:', error);
    throw error;
  }
};

// Handle subscription updates
const handleSubscriptionUpdated = async (event) => {
  const subscription = event.data.object;
  const stripeSubscriptionId = subscription.id;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Find the subscription by Stripe subscription ID
    const dbSubscription = await Subscription.findOne({
      where: { stripe_subscription_id: stripeSubscriptionId },
      transaction
    });
    
    if (!dbSubscription) {
      console.error(`No subscription found for Stripe subscription ID: ${stripeSubscriptionId}`);
      await transaction.rollback();
      return;
    }
    
    // Update subscription status based on the status from Stripe
    const stripeStatus = subscription.status;
    let dbStatus = 'active';
    
    switch (stripeStatus) {
      case 'active':
        dbStatus = 'active';
        break;
      case 'canceled':
      case 'cancelled':
        dbStatus = 'cancelled';
        break;
      case 'unpaid':
      case 'past_due':
        dbStatus = 'past_due';
        break;
      case 'trialing':
        dbStatus = 'trial';
        break;
      default:
        dbStatus = stripeStatus;
    }
    
    // Update our database record
    await dbSubscription.update({
      status: dbStatus,
      cancelled_at: stripeStatus === 'canceled' ? new Date() : dbSubscription.cancelled_at
    }, { transaction });
    
    // Update guild status if necessary
    const now = new Date();
    const expiryDate = new Date(dbSubscription.expiry_date);
    const guild = await Guild.findByPk(dbSubscription.guild_id, { transaction });
    
    if (guild) {
      if (dbStatus === 'active' || now < expiryDate) {
        // Ensure guild is active
        await guild.update({ status: 'ACTIVE' }, { transaction });
      } else if (dbStatus === 'cancelled' && now > expiryDate) {
        // Mark guild as inactive if subscription is cancelled and past expiry
        await guild.update({ status: 'INACTIVE' }, { transaction });
      }
    }
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing subscription_updated event:', error);
    throw error;
  }
};

// Handle trial ending soon
const handleTrialWillEnd = async (event) => {
  const subscription = event.data.object;
  const stripeSubscriptionId = subscription.id;
  
  try {
    // Find the subscription by Stripe subscription ID
    const dbSubscription = await Subscription.findOne({
      where: { stripe_subscription_id: stripeSubscriptionId }
    });
    
    if (!dbSubscription) {
      console.error(`No subscription found for Stripe subscription ID: ${stripeSubscriptionId}`);
      return;
    }
    
    // You could add logic here to notify the guild master via email, Discord, etc.
    console.log(`Trial ending soon for guild ${dbSubscription.guild_id}`);
    
  } catch (error) {
    console.error('Error processing trial_will_end event:', error);
    throw error;
  }
};

module.exports = {
  verifyStripeSignature,
  handleStripeWebhook
};