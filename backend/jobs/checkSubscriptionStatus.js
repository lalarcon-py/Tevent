// backend/jobs/checkSubscriptionStatus.js
const { Guild, Subscription } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Check all subscription statuses and update guild active status accordingly
const checkSubscriptionStatus = async () => {
  console.log('Running scheduled subscription status check...');
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    const now = new Date();
    
    // Find guilds with expired subscriptions
    const expiredSubscriptions = await Subscription.findAll({
      where: {
        expiry_date: { [Op.lt]: now },
        status: { [Op.ne]: 'cancelled' } // Only check active subscriptions
      },
      transaction
    });
    
    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);
    
    // Update each subscription and guild
    for (const subscription of expiredSubscriptions) {
      // Check with Stripe to see if the subscription is still valid
      let stripeSubscriptionValid = false;
      
      if (subscription.stripe_subscription_id) {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripe_subscription_id
          );
          
          // If the subscription is still active in Stripe, update our records
          if (stripeSubscription.status === 'active') {
            // Get the end date of the current period from Stripe
            const stripeEndDate = new Date(stripeSubscription.current_period_end * 1000);
            
            // Update our subscription record with the new expiry date
            await subscription.update({
              expiry_date: stripeEndDate,
              status: 'active'
            }, { transaction });
            
            // Find the guild and ensure it's active
            const guild = await Guild.findByPk(subscription.guild_id, { transaction });
            if (guild && guild.status !== 'ACTIVE') {
              await guild.update({
                status: 'ACTIVE'
              }, { transaction });
              console.log(`Guild ${guild.id} (${guild.name}) marked as ACTIVE due to valid Stripe subscription`);
            }
            
            stripeSubscriptionValid = true;
            continue; // Skip the rest of the loop for this subscription
          }
        } catch (error) {
          console.error(`Error checking Stripe subscription ${subscription.stripe_subscription_id}:`, error);
          // Continue with the expiration logic if there was an error
        }
      }
      
      // If we get here, either there was no Stripe subscription ID,
      // the Stripe subscription wasn't active, or there was an error
      if (!stripeSubscriptionValid) {
        // Mark subscription as expired
        await subscription.update({
          status: 'expired'
        }, { transaction });
        
        // Find the guild and mark it as inactive
        const guild = await Guild.findByPk(subscription.guild_id, { transaction });
        
        if (guild && guild.status === 'ACTIVE') {
          await guild.update({
            status: 'INACTIVE'
          }, { transaction });
          console.log(`Guild ${guild.id} (${guild.name}) marked as INACTIVE due to expired subscription`);
        }
      }
    }
    
    // Find guilds with trial periods
    const guildsWithoutSubscription = await Guild.findAll({
      where: {
        status: { [Op.ne]: 'ACTIVE' }
      },
      include: [{
        model: Subscription,
        required: false
      }],
      transaction
    });
    
    for (const guild of guildsWithoutSubscription) {
      // If guild has an active subscription, make sure it's set to active
      if (guild.Subscription && 
          guild.Subscription.status === 'active' && 
          new Date(guild.Subscription.expiry_date) > now) {
        await guild.update({ status: 'ACTIVE' }, { transaction });
        console.log(`Guild ${guild.id} (${guild.name}) marked as ACTIVE due to valid subscription`);
        continue;
      }
      
      // Check if trial is still valid (7 days from creation)
      const guildCreatedAt = new Date(guild.createdAt || guild.created_at);
      const trialEndDate = new Date(guildCreatedAt);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      // Check if guild is in trial period
      if (now < trialEndDate) {
        await guild.update({ status: 'ACTIVE' }, { transaction });
        console.log(`Guild ${guild.id} (${guild.name}) marked as ACTIVE due to valid trial period`);
      } 
      // Check if guild should be scheduled for deletion (expired + 14 days grace period)
      else {
        // Calculate deletion date (14 days after trial ends or subscription expires)
        const deletionDate = new Date(trialEndDate);
        deletionDate.setDate(deletionDate.getDate() + 14);
        
        // If we're past the deletion date and deletion_scheduled_at is not set, schedule deletion
        if (now > deletionDate && !guild.deletion_scheduled_at) {
          await guild.update({ 
            deletion_scheduled_at: now,
            status: 'PENDING_DELETION'
          }, { transaction });
          console.log(`Guild ${guild.id} (${guild.name}) marked for deletion`);
        }
      }
    }
    
    // Find guilds that should be active due to valid subscriptions
    // but might be incorrectly marked as inactive
    const validSubscriptions = await Subscription.findAll({
      where: {
        expiry_date: { [Op.gt]: now },
        status: 'active'
      },
      transaction
    });
    
    for (const subscription of validSubscriptions) {
      const guild = await Guild.findByPk(subscription.guild_id, { transaction });
      
      if (guild && guild.status !== 'ACTIVE') {
        await guild.update({
          status: 'ACTIVE'
        }, { transaction });
        console.log(`Guild ${guild.id} (${guild.name}) marked as ACTIVE due to valid subscription`);
      }
    }
    
    // Commit the transaction
    await transaction.commit();
    console.log('Subscription status check completed successfully');
    return { success: true, updated: expiredSubscriptions.length };
  } catch (error) {
    // Rollback the transaction on error
    await transaction.rollback();
    console.error('Error checking subscription status:', error);
    return { success: false, error: error.message };
  }
};

// Export the function for scheduling
module.exports = {
  checkSubscriptionStatus
};