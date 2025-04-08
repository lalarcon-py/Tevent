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
      
      // Check for active guild membership for each user
      const userChecks = [];
      for (const request of requests) {
        if (!request.user || !request.user.id) continue;
        
        try {
          const membership = await db.GuildMember.findOne({
            where: {
              guild_id: guildId,
              user_id: request.user.id,
              status: 'Active'
            }
          });
          
          if (!membership) {
            // User is not in the guild anymore, deny their request
            await request.update({
              status: 'Denied - Left Guild',
              roll_value: 0,
              roll_time: now
            });
            console.log(`🎲 ${request.user.username} is no longer in the guild, denying request`);
            
            // Remove this request from all groups
            const reqId = request.id;
            needItemRequests.splice(needItemRequests.findIndex(r => r.id === reqId), 1);
            needTraitRequests.splice(needTraitRequests.findIndex(r => r.id === reqId), 1);
            greedRequests.splice(greedRequests.findIndex(r => r.id === reqId), 1);
          }
        } catch (err) {
          console.error(`Error checking membership for user ${request.user.id}:`, err);
        }
      }
      
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
      
      // Always prioritize NEED_ITEM over NEED_TRAIT over GREED
      // Check NEED_ITEM first (highest priority)
      if (needItemRequests.length > 0) {
        winner = needItemRequests.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, needItemRequests[0]);
        winningGroup = 'NEED_ITEM';
        console.log(`🎲 Winner from NEED_ITEM category: ${winner.user.username} with roll ${winner.roll_value}`);
      }
      // If no NEED_ITEM requests, check NEED_TRAIT
      else if (needTraitRequests.length > 0) {
        winner = needTraitRequests.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, needTraitRequests[0]);
        winningGroup = 'NEED_TRAIT';
        console.log(`🎲 Winner from NEED_TRAIT category: ${winner.user.username} with roll ${winner.roll_value}`);
      }
      // If no NEED_ITEM or NEED_TRAIT, check GREED
      else if (greedRequests.length > 0) {
        winner = greedRequests.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, greedRequests[0]);
        winningGroup = 'GREED';
        console.log(`🎲 Winner from GREED category: ${winner.user.username} with roll ${winner.roll_value}`);
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
      
      // If winner wishlisted this item, remove it from their wishlist
      try {
        // Only attempt to remove from wishlist if we have an item_id (some storage items might not have it)
        if (storageItem.Item && storageItem.Item.id) {
          const wishlistItem = await db.WishList.findOne({
            where: {
              user_id: winner.user_id,
              guild_id: guildId,
              item_id: storageItem.Item.id
            }
          });
          
          if (wishlistItem) {
            await wishlistItem.destroy();
            console.log(`🎲 Removed item ${storageItem.Item.name} from ${winner.user.username}'s wishlist`);
          }
        }
      } catch (wishlistError) {
        console.error('Failed to remove item from wishlist:', wishlistError);
        // Continue processing even if wishlist removal fails
      }
      
      // Mark all other requests as denied with reason
      for (const request of requests) {
        if (request.id !== winner.id) {
          await request.update({
            status: 'Denied - Lost Roll',
            won_roll: false
          });
        }
      }
      
      // Create roll history entry and check for previous wins
      try {
      const rollResults = requests.map(req => ({
      id: req.id,
      user_id: req.user_id,
      username: req.user.username,
      avatar_url: req.user.avatar_url,
      roll_value: req.roll_value,
      need_or_greed: req.need_or_greed,
      winner: req.id === winner.id
      }));
      
      // Check if winner has previously won this item (only for NEED_ITEM and NEED_TRAIT)
      let isRepeatedWin = false;
      let previousWinDate = null;
      
      if (winner.need_or_greed === 'NEED_ITEM' || winner.need_or_greed === 'NEED_TRAIT') {
      // Look for previous wins of the same item by this user
      const previousWins = await db.RollHistory.findAll({
        where: {
          guild_id: guildId,
          winner_id: winner.user_id,
          item_name: storageItem.Item?.name || 'Unknown Item',
          // Only consider previous NEED wins
            winner_need_type: {
              [db.Sequelize.Op.in]: ['NEED_ITEM', 'NEED_TRAIT']
            }
            },
          order: [['roll_time', 'ASC']]
        });
          
          if (previousWins.length > 0) {
            isRepeatedWin = true;
            previousWinDate = previousWins[0].roll_time;
            console.log(`🎲 ${winner.user.username} has previously won ${storageItem.Item?.name} on ${previousWinDate.toISOString()}`);
          }
        }
        
        await db.RollHistory.create({
          guild_id: guildId,
          item_name: storageItem.Item?.name || 'Unknown Item',
          item_type: storageItem.Item?.type || 'Unknown Type',
          item_icon: storageItem.Item?.icon || null,
          item_trait: storageItem.trait || null,
          winner_id: winner.user_id,
          winner_name: winner.user.username,
          winner_roll: winner.roll_value,
          winner_need_type: winner.need_or_greed,
          roll_results: rollResults,
          roll_time: now,
          is_repeated_win: isRepeatedWin,
          previous_win_date: previousWinDate
        });
        
        console.log(`🎲 Created roll history entry for ${itemName}`);
      } catch (historyError) {
        console.error('Failed to create roll history entry:', historyError);
        // Continue processing even if history creation fails
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

const processRollForItem = async (storageItemId, guildId) => {
  const t = await sequelize.transaction();
  
  try {
    // Get all pending requests for this item
    const pendingRequests = await db.LootRequest.findAll({
      where: {
        storage_item_id: storageItemId,
        guild_id: guildId,
        status: 'Pending'
      },
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [{ model: db.Item }]
        },
        { model: db.User, as: 'user' }
      ],
      transaction: t
    });
    
    if (pendingRequests.length === 0) {
      await t.commit();
      return { success: false, message: 'No pending requests found' };
    }
    
    // Check for guild membership
    const guildMembers = await db.GuildMember.findAll({
      where: {
        guild_id: guildId,
        status: 'Active'
      }
    });
    
    // Get active guild member user IDs
    const activeMemberIds = guildMembers.map(member => member.user_id);
    
    // Filter out users who are no longer in the guild
    const filteredRequests = pendingRequests.filter(request => {
      if (!activeMemberIds.includes(request.user_id)) {
        // Update request to be denied with reason
        request.update({
          status: 'Denied - Left Guild',
          roll_value: 0,
          roll_time: new Date()
        });
        return false;
      }
      return true;
    });
    
    // Sort by need/greed priority
    const sortedRequests = filteredRequests.sort((a, b) => {
      // First by need/greed priority - always NEED_ITEM > NEED_TRAIT > GREED
      const priorityOrder = { 'NEED_ITEM': 0, 'NEED_TRAIT': 1, 'GREED': 2 };
      const aPriority = priorityOrder[a.need_or_greed] || 3;
      const bPriority = priorityOrder[b.need_or_greed] || 3;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then by request time (first come, first served)
      return new Date(a.request_time) - new Date(b.request_time);
    });
    
    // Generate roll values for each request
    const rollResults = sortedRequests.map(request => {
      return {
        ...request.toJSON(),
        roll_value: Math.floor(Math.random() * 100) + 1 // 1-100 roll
      };
    });
    
    // Get highest priority group available
    const priorityOrder = { 'NEED_ITEM': 0, 'NEED_TRAIT': 1, 'GREED': 2 };
    let highestPriorityGroup = 3; // Start with value higher than any valid priority
    
    for (const result of rollResults) {
      const priority = priorityOrder[result.need_or_greed] || 3;
      if (priority < highestPriorityGroup) {
        highestPriorityGroup = priority;
      }
    }
    
    // Filter to only highest priority group
    const highestPriorityResults = rollResults.filter(result => {
      const priority = priorityOrder[result.need_or_greed] || 3;
      return priority === highestPriorityGroup;
    });
    
    // Sort by roll value (highest wins) within the highest priority group
    highestPriorityResults.sort((a, b) => b.roll_value - a.roll_value);
    
    console.log(`Highest priority group is ${Object.keys(priorityOrder)[highestPriorityGroup]} with ${highestPriorityResults.length} requests`);
    
    // Get the winner (first after sorting within highest priority group)
    const winner = highestPriorityResults[0];
    
    // Update all requests with their roll values
    for (const result of rollResults) {
      await db.LootRequest.update({
        roll_value: result.roll_value,
        roll_time: new Date(),
        won_roll: result.id === winner.id,
        status: result.id === winner.id ? 'Approved' : 'Denied - Lost Roll'
      }, {
        where: { id: result.id },
        transaction: t
      });
    }
    
    // If the winner wishlisted this item, remove it from their wishlist
    if (winner) {
      try {
        const storageItem = await db.GuildStorageItem.findByPk(storageItemId, {
          include: [{ model: db.Item }],
          transaction: t
        });
        
        if (storageItem && storageItem.Item && storageItem.Item.id) {
          const wishlistItem = await db.WishList.findOne({
            where: {
              user_id: winner.user_id,
              guild_id: guildId,
              item_id: storageItem.Item.id
            },
            transaction: t
          });
          
          if (wishlistItem) {
            await wishlistItem.destroy({ transaction: t });
            console.log(`Roll winner's wishlist item removed: ${storageItem.Item.name}`);
          }
        }
      } catch (wishlistError) {
        console.error('Failed to remove item from wishlist:', wishlistError);
        // Continue processing even if wishlist removal fails
      }
    }
    
    // Get item details for roll history
    const storageItem = await db.GuildStorageItem.findByPk(storageItemId, {
      include: [{ model: db.Item }],
      transaction: t
    });
    
    if (!storageItem) {
      throw new Error('Storage item not found');
    }
    
    // Check if winner has previously won this item (only for NEED_ITEM and NEED_TRAIT)
    let isRepeatedWin = false;
    let previousWinDate = null;
    
    if (winner.need_or_greed === 'NEED_ITEM' || winner.need_or_greed === 'NEED_TRAIT') {
      // Look for previous wins of the same item by this user
      const previousWins = await db.RollHistory.findAll({
        where: {
          guild_id: guildId,
          winner_id: winner.user_id,
          item_name: storageItem.Item.name,
          // Only consider previous NEED wins
          winner_need_type: {
            [db.Sequelize.Op.in]: ['NEED_ITEM', 'NEED_TRAIT']
          }
        },
        order: [['roll_time', 'ASC']],
        transaction: t
      });
      
      if (previousWins.length > 0) {
        isRepeatedWin = true;
        previousWinDate = previousWins[0].roll_time;
        console.log(`Roll winner ${winner.user.username} has previously won ${storageItem.Item.name} on ${previousWinDate.toISOString()}`);
      }
    }
    
    // Create roll history entry
    const rollHistory = await db.RollHistory.create({
      guild_id: guildId,
      item_name: storageItem.Item.name,
      item_type: storageItem.Item.type,
      item_icon: storageItem.Item.icon,
      item_trait: storageItem.trait,
      winner_id: winner.user_id,
      winner_name: winner.user.username,
      winner_roll: winner.roll_value,
      winner_need_type: winner.need_or_greed,
      roll_results: rollResults.map(r => ({
        id: r.id,
        user_id: r.user_id,
        username: r.user.username,
        avatar_url: r.user.avatar_url,
        roll_value: r.roll_value,
        need_or_greed: r.need_or_greed,
        winner: r.id === winner.id
      })),
      roll_time: new Date(),
      is_repeated_win: isRepeatedWin,
      previous_win_date: previousWinDate
    }, { transaction: t });
    
    // Update storage item quantity
    const newQuantity = Math.max(0, storageItem.quantity - 1);
    
    if (newQuantity === 0) {
      // Delete the item if quantity is now 0
      await db.GuildStorageItem.destroy({
        where: { id: storageItemId },
        transaction: t
      });
      
      // Update all remaining pending requests for this item
      await db.LootRequest.update({
        status: 'Denied - Out of Stock',
        storage_item_id: null
      }, {
        where: {
          storage_item_id: storageItemId,
          status: 'Pending'
        },
        transaction: t
      });
    } else {
      // Just update the quantity
      await storageItem.update({ quantity: newQuantity }, { transaction: t });
    }
    
    await t.commit();
    
    return {
      success: true,
      results: {
        winner: winner,
        allRolls: rollResults,
        rollHistory: rollHistory
      }
    };
  } catch (error) {
    await t.rollback();
    console.error('Roll processing error:', error);
    throw error;
  }
};

module.exports = {
  checkForExpiredRequests,
  processRollForItem
};