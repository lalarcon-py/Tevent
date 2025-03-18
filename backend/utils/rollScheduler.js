// backend/utils/rollScheduler.js
const db = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

// Function to process a roll for a specific storage item
const processRollForItem = async (storageItemId, guildId) => {
  const sequelize = db.sequelize;
  const transaction = await sequelize.transaction();

  try {
    console.log(`Processing roll for storage item ${storageItemId} in guild ${guildId}`);

    // Get all expired but unrolled requests for this item
    const requests = await db.LootRequest.findAll({
      where: {
        storage_item_id: storageItemId,
        guild_id: guildId,
        status: 'Pending',
        expiration_time: { [Op.lt]: new Date() },
        roll_value: null
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'username', 'discord_id']
        },
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [
            {
              model: db.Item,
              attributes: ['name', 'icon']
            }
          ]
        }
      ],
      transaction
    });

    if (requests.length === 0) {
      console.log(`No valid requests found for item ${storageItemId}`);
      await transaction.commit();
      return;
    }

    // Get item info for logging
    const itemName = requests[0]?.storageItem?.Item?.name || 'Unknown Item';
    console.log(`Processing ${requests.length} requests for ${itemName}`);

    // Group requests by type (NEED_ITEM, NEED_TRAIT, GREED)
    const needItemRequests = requests.filter(req => req.need_or_greed === 'NEED_ITEM');
    const needTraitRequests = requests.filter(req => req.need_or_greed === 'NEED_TRAIT');
    const greedRequests = requests.filter(req => req.need_or_greed === 'GREED');

    // Determine which group to process based on priority
    let eligibleRequests = [];
    
    if (needItemRequests.length > 0) {
      eligibleRequests = needItemRequests;
      console.log(`Processing NEED_ITEM requests for ${itemName}`);
    } else if (needTraitRequests.length > 0) {
      eligibleRequests = needTraitRequests;
      console.log(`Processing NEED_TRAIT requests for ${itemName}`);
    } else if (greedRequests.length > 0) {
      eligibleRequests = greedRequests;
      console.log(`Processing GREED requests for ${itemName}`);
    }

    if (eligibleRequests.length === 0) {
      console.log(`No eligible requests found for ${itemName}`);
      await transaction.commit();
      return;
    }

    // Roll for all eligible requests
    for (const request of eligibleRequests) {
      const rollValue = Math.floor(Math.random() * 100) + 1; // 1-100
      await request.update({
        roll_value: rollValue,
        roll_time: new Date()
      }, { transaction });
      console.log(`User ${request.user.username} rolled ${rollValue} for ${itemName}`);
    }

    // Find the winner
    const winner = eligibleRequests.reduce((prev, current) => {
      return (prev.roll_value > current.roll_value) ? prev : current;
    });

    // Mark the winner
    await winner.update({
      status: 'Approved',
      won_roll: true
    }, { transaction });

    // Mark others as denied
    for (const request of eligibleRequests) {
      if (request.id !== winner.id) {
        await request.update({
          status: 'Denied - Lost Roll',
          won_roll: false
        }, { transaction });
      }
    }

    // Update item quantity
    const storageItem = await db.GuildStorageItem.findByPk(storageItemId, { transaction });
    if (storageItem) {
      if (storageItem.quantity <= 1) {
        // Delete the item if it's the last one
        await storageItem.destroy({ transaction });

        // Update all pending requests for this item
        await db.LootRequest.update(
          { status: 'Denied - Out of Stock' },
          { 
            where: { 
              storage_item_id: storageItemId, 
              status: 'Pending'
            },
            transaction
          }
        );
      } else {
        // Decrement quantity
        await storageItem.update({
          quantity: storageItem.quantity - 1
        }, { transaction });
      }
    }

    // Send Discord notifications
    try {
      const discordBotUrl = process.env.DISCORD_BOT_URL || "http://heartfelt-sparkle.railway.internal:3300";
      
      // Notify about roll results
      await axios.post(`${discordBotUrl}/webhook/roll-result`, {
        guildId,
        itemId: storageItemId,
        itemName,
        winnerId: winner.user.id,
        winnerName: winner.user.username,
        winnerDiscordId: winner.user.discord_id,
        winnerRoll: winner.roll_value,
        requestType: winner.need_or_greed,
        losers: eligibleRequests
          .filter(req => req.id !== winner.id)
          .map(req => ({
            id: req.user.id,
            username: req.user.username,
            discordId: req.user.discord_id,
            roll: req.roll_value,
            requestType: req.need_or_greed
          })),
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`Discord notification sent for roll results`);
    } catch (discordError) {
      console.warn('Failed to send Discord notification for roll results:', discordError.message);
      // Continue despite notification failure
    }

    await transaction.commit();
    console.log(`Roll completed for ${itemName}. Winner: ${winner.user.username} with roll ${winner.roll_value}`);
    
  } catch (error) {
    await transaction.rollback();
    console.error(`Error processing roll for item ${storageItemId}:`, error);
  }
};

// Main function to check and process all expired requests
const checkForExpiredRequests = async () => {
    try {
      console.log('Checking for expired requests...');
      
      // Find all expired but unrolled pending requests
      const expiredRequests = await db.LootRequest.findAll({
        where: {
          status: 'Pending',
          expiration_time: { [Op.lt]: new Date() },
          roll_value: null
        },
        attributes: ['guild_id', 'storage_item_id'],
        group: ['guild_id', 'storage_item_id']
      });
  
      console.log(`Found ${expiredRequests.length} expired request groups to process`);
      
      // Keep track of processed items
      const processedItems = [];
      
      // Process each unique guild/item combination
      for (const request of expiredRequests) {
        console.log(`Processing expired requests for guild ${request.guild_id}, item ${request.storage_item_id}`);
        await processRollForItem(request.storage_item_id, request.guild_id);
        processedItems.push(`${request.guild_id}:${request.storage_item_id}`);
      }
      
      return processedItems.length > 0 ? processedItems : null;
    } catch (error) {
      console.error('Error checking for expired requests:', error);
      throw error;
    }
  };

module.exports = {
  checkForExpiredRequests,
  processRollForItem
};