// backend/utils/rollScheduler.js
const db = require('../models');
const axios = require('axios');

/**
 * Check for items that need rolling
 */
const checkForExpiredRequests = async () => {
  try {
    console.log('🎲 Checking for items that need rolling...');
    
    // Get current time
    const now = new Date();
    
    // Find all pending requests
    const pendingRequests = await db.LootRequest.findAll({
      where: {
        status: 'Pending',
        roll_value: null // Only get requests that haven't been rolled yet
      },
      include: [
        { 
          model: db.GuildStorageItem, 
          as: 'storageItem',
          include: [{ model: db.Item }]
        },
        { 
          model: db.User, 
          as: 'user'
        }
      ]
    });
    
    console.log(`🎲 Found ${pendingRequests.length} pending requests to check`);
    
    if (pendingRequests.length === 0) {
      return { processed: 0 };
    }
    
    // Group requests by storage item ID
    const requestsByItem = {};
    
    pendingRequests.forEach(request => {
      if (!request.storage_item_id || !request.storageItem) return;
      
      if (!requestsByItem[request.storage_item_id]) {
        requestsByItem[request.storage_item_id] = {
          storageItem: request.storageItem,
          requests: []
        };
      }
      
      requestsByItem[request.storage_item_id].requests.push(request);
    });
    
    console.log(`🎲 Found ${Object.keys(requestsByItem).length} items with pending requests`);
    
    let processedCount = 0;
    
    // Process each item
    for (const [storageItemId, { storageItem, requests }] of Object.entries(requestsByItem)) {
      // Calculate when this item should expire based on when it was created
      const creationTime = new Date(storageItem.created_at || storageItem.createdAt);
      const timerDuration = storageItem.timer_duration || 1440; // in minutes
      const expirationTime = new Date(creationTime.getTime() + (timerDuration * 60000));
      
      console.log(`🎲 Item ${storageItemId} created at ${creationTime.toISOString()}`);
      console.log(`🎲 Item ${storageItemId} timer: ${timerDuration} minutes`);
      console.log(`🎲 Item ${storageItemId} expires at ${expirationTime.toISOString()}`);
      console.log(`🎲 Current time is ${now.toISOString()}`);
      console.log(`🎲 Item expired? ${expirationTime < now ? 'YES' : 'NO'}`);
      
      // Skip if the item's timer hasn't expired yet
      if (expirationTime > now) {
        console.log(`🎲 Item ${storageItemId} timer hasn't expired yet, skipping`);
        continue;
      }
      
      console.log(`🎲 Item ${storageItemId} timer has expired, processing ${requests.length} requests`);
      
      // Skip if no requests
      if (requests.length === 0) {
        console.log(`🎲 No requests for item ${storageItemId}, skipping`);
        continue;
      }
      
      const itemName = storageItem.Item ? storageItem.Item.name : 'Unknown Item';
      const guildId = storageItem.guild_id;
      
      // Group requests by need/greed type for priority
      const needItemRequests = requests.filter(r => r.need_or_greed === 'NEED_ITEM');
      const needTraitRequests = requests.filter(r => r.need_or_greed === 'NEED_TRAIT');
      const greedRequests = requests.filter(r => r.need_or_greed === 'GREED');
      
      console.log(`🎲 Priority breakdown - NEED_ITEM: ${needItemRequests.length}, NEED_TRAIT: ${needTraitRequests.length}, GREED: ${greedRequests.length}`);
      
      // Assign roll values to all requests
      for (const request of requests) {
        // Generate a random roll between 1-100
        const rollValue = Math.floor(Math.random() * 100) + 1;
        
        // Update the request with roll value and time
        await request.update({
          roll_value: rollValue,
          roll_time: now
        });
        
        console.log(`🎲 ${request.user.username} rolled ${rollValue} for ${itemName} (${request.need_or_greed})`);
      }
      
      // Determine winner based on priority and roll value
      let winner = null;
      let winningGroup = null;
      
      // Check NEED_ITEM first (highest priority)
      if (needItemRequests.length > 0) {
        winner = needItemRequests.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, needItemRequests[0]);
        winningGroup = 'NEED_ITEM';
      }
      // If no NEED_ITEM requests, check NEED_TRAIT
      else if (needTraitRequests.length > 0) {
        winner = needTraitRequests.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, needTraitRequests[0]);
        winningGroup = 'NEED_TRAIT';
      }
      // If no NEED_ITEM or NEED_TRAIT, check GREED
      else if (greedRequests.length > 0) {
        winner = greedRequests.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, greedRequests[0]);
        winningGroup = 'GREED';
      }
      
      if (!winner) {
        console.log(`🎲 No winner determined for item ${itemName}`);
        continue;
      }
      
      console.log(`🎲 Winner: ${winner.user.username} with roll ${winner.roll_value} (${winningGroup})`);
      
      // Mark winner
      await winner.update({
        status: 'Approved',
        won_roll: true
      });
      
      // Mark all other requests as denied with reason
      for (const request of requests) {
        if (request.id !== winner.id) {
          await request.update({
            status: 'Denied - Lost Roll',
            won_roll: false
          });
        }
      }
      
      // Decrement item quantity
      if (storageItem.quantity > 0) {
        await storageItem.update({
          quantity: Math.max(0, storageItem.quantity - 1)
        });
      }
      
      // Send Discord notification
      try {
        const discordBotUrl = process.env.DISCORD_BOT_URL || "http://heartfelt-sparkle.railway.internal:3300";
        
        // Compile roll results for message
        const rollResults = requests.map(req => ({
          username: req.user.username,
          roll: req.roll_value,
          needOrGreed: req.need_or_greed,
          winner: req.id === winner.id
        })).sort((a, b) => b.roll - a.roll); // Sort by roll, highest first
        
        await axios.post(`${discordBotUrl}/webhook/roll-results`, {
          guildId: guildId,
          itemId: storageItemId,
          itemName: itemName,
          winner: {
            userId: winner.user_id,
            username: winner.user.username,
            roll: winner.roll_value,
            needOrGreed: winner.need_or_greed
          },
          rollResults: rollResults,
          secret: process.env.BOT_WEBHOOK_SECRET
        });
        
        console.log('🎲 Discord notification sent for roll results');
      } catch (discordError) {
        console.warn('Failed to send Discord notification:', discordError.message);
      }
      
      processedCount++;
    }
    
    console.log(`🎲 Processed rolls for ${processedCount} items`);
    return {
      processed: processedCount
    };
  } catch (error) {
    console.error('Error processing item rolls:', error);
    return { error: error.message };
  }
};

module.exports = {
  checkForExpiredRequests
};