// backend/routes/rollRoutes.js
const express = require('express');
const router = express.Router();
const { LootRequest, User, Guild, GuildMember, RollHistory, GuildStorageItem, Item, sequelize, Sequelize } = require('../models');
const { Op } = Sequelize; // Explicitly extract Op from Sequelize
const discordWebhook = require('../utils/discord');
const axios = require('axios');

// Update user's roll type
router.put('/:guildId/rolls/:userId', async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const { rollType, itemId, requestId } = req.body;
    
    // Validate input
    if (!rollType) {
      return res.status(400).json({ error: 'Roll type is required' });
    }
    
    // Validate rollType
    const validRollTypes = ['NEED_ITEM', 'NEED_TRAIT', 'GREED'];
    if (!validRollTypes.includes(rollType)) {
      return res.status(400).json({ error: 'Invalid roll type' });
    }
    
    // Check if user is guild master or has permissions
    const requesterMembership = await GuildMember.findOne({
      where: { 
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!requesterMembership || !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(requesterMembership.role)) {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Only Guild Masters, Advisors, and Guardians can update roll types'
      });
    }
    
    // Check if target user is in the guild
    const targetMembership = await GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: userId
      }
    });
    
    if (!targetMembership) {
      return res.status(404).json({ error: 'User is not a member of this guild' });
    }
    
    // Get user details
    const user = await User.findByPk(userId);
    const requester = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If a specific request ID is provided, update that request's roll type
    if (requestId) {
      const lootRequest = await LootRequest.findOne({
        where: {
          id: requestId,
          user_id: userId,
          guild_id: guildId
        }
      });
      
      if (!lootRequest) {
        return res.status(404).json({ error: 'Loot request not found' });
      }
      
      // Update the roll type
      await lootRequest.update({
        need_or_greed: rollType
      });
      
      // Get formatted roll type
      const rollTypeFormatted = formatRollType(rollType);
      
      // Log to Discord
      try {
        await discordWebhook.send({
          content: `🎲 **Roll Type Changed**\n${requester.username} changed ${user.username}'s roll type to **${rollTypeFormatted}**`
        });
      } catch (discordErr) {
        console.error('Discord notification error:', discordErr);
        // Continue even if Discord notification fails
      }
      
      return res.json({
        success: true,
        userId,
        rollType,
        message: `Roll type updated to ${rollTypeFormatted} for user ${user.username}`
      });
    }
    
    // If we have an item ID but not a request ID, find or create the request
    if (itemId) {
      const [lootRequest, created] = await LootRequest.findOrCreate({
        where: {
          user_id: userId,
          guild_id: guildId,
          storage_item_id: itemId,
          status: 'Pending'
        },
        defaults: {
          need_or_greed: rollType,
          priority: 0,
          request_time: new Date()
        }
      });
      
      if (!created) {
        await lootRequest.update({ need_or_greed: rollType });
      }
      
      // Get formatted roll type
      const rollTypeFormatted = formatRollType(rollType);
      
      // Log to Discord
      try {
        await discordWebhook.send({
          content: `🎲 **Roll Type Changed**\n${requester.username} changed ${user.username}'s roll type to **${rollTypeFormatted}**`
        });
      } catch (discordErr) {
        console.error('Discord notification error:', discordErr);
        // Continue even if Discord notification fails
      }
      
      return res.json({
        success: true,
        userId,
        rollType,
        requestId: lootRequest.id,
        message: `Roll type updated to ${rollTypeFormatted} for user ${user.username}`
      });
    }
    
    // If neither item ID nor request ID provided, return error
    return res.status(400).json({ error: 'Item ID or request ID is required' });
    
  } catch (error) {
    console.error('Error updating roll type:', error);
    res.status(500).json({ error: 'Failed to update roll type' });
  }
});

// Manually set a winner for an item
router.post('/:guildId/set-winner', async (req, res) => {
  // Start a transaction to ensure data consistency
  const t = await sequelize.transaction();
  
  try {
    const { guildId } = req.params;
    const { userId, itemId, requestId, note } = req.body;
    
    // Validate required input
    if (!userId) {
      await t.rollback();
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!itemId && !requestId) {
      await t.rollback();
      return res.status(400).json({ error: 'Either item ID or request ID is required' });
    }
    
    // Check if requester is a Guild Master (only Guild Masters can manually set winners)
    const requesterMembership = await GuildMember.findOne({
      where: { 
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Master'  // Only Guild Masters can set winners
      },
      transaction: t
    });
    
    if (!requesterMembership) {
      await t.rollback();
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Only Guild Masters can manually set winners'
      });
    }
    
    // Get winner details
    const winner = await User.findByPk(userId, { transaction: t });
    if (!winner) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if winner is a member of the guild
    const winnerMembership = await GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: userId
      },
      transaction: t
    });
    
    if (!winnerMembership) {
      await t.rollback();
      return res.status(404).json({ error: 'User is not a member of this guild' });
    }
    
    // Find the storage item
    let storageItem, winnerRequest;
    
    if (requestId) {
      // If requestId is provided, find the related request and storage item
      winnerRequest = await LootRequest.findOne({
        where: {
          id: requestId,
          guild_id: guildId
        },
        include: [
          { model: GuildStorageItem, as: 'storageItem' }
        ],
        transaction: t
      });
      
      if (!winnerRequest) {
        await t.rollback();
        return res.status(404).json({ error: 'Loot request not found' });
      }
      
      storageItem = winnerRequest.storageItem;
      
      // If the request is for a different user, update it
      if (winnerRequest.user_id !== userId) {
        await winnerRequest.update({
          user_id: userId,
          status: 'Pending'  // Reset status to pending
        }, { transaction: t });
      }
    } else {
      // If itemId is provided, find the storage item directly
      storageItem = await GuildStorageItem.findOne({
        where: {
          id: itemId,
          guild_id: guildId
        },
        include: [{ model: Item }],
        transaction: t
      });
      
      if (!storageItem) {
        await t.rollback();
        return res.status(404).json({ error: 'Item not found in guild storage' });
      }
      
      // Find or create a loot request for this user and item
      [winnerRequest] = await LootRequest.findOrCreate({
        where: {
          user_id: userId,
          guild_id: guildId,
          storage_item_id: itemId
        },
        defaults: {
          need_or_greed: 'NEED_ITEM',  // Default to Need Item
          priority: 0,
          request_time: new Date(),
          status: 'Pending'
        },
        transaction: t
      });
    }
    
    // Get all pending requests for this item
    const allRequests = await LootRequest.findAll({
      where: {
        storage_item_id: storageItem.id,
        guild_id: guildId,
        status: 'Pending'
      },
      include: [{ model: User, as: 'user' }],
      transaction: t
    });
    
    // Set roll values for all pending requests (random values for non-winners)
    const now = new Date();
    const rollResults = [];
    
    for (const request of allRequests) {
      // Winner gets a roll of 100, others get random values 1-99
      const isWinner = request.id === winnerRequest.id;
      const rollValue = isWinner ? 100 : Math.floor(Math.random() * 99) + 1;
      
      await request.update({
        roll_value: rollValue,
        roll_time: now,
        won_roll: isWinner,
        status: isWinner ? 'Approved' : 'Denied - Lost Roll'
      }, { transaction: t });
      
      // Add to roll results for history
      rollResults.push({
        id: request.id,
        user_id: request.user_id,
        username: request.user.username,
        avatar_url: request.user.avatar_url,
        roll_value: rollValue,
        need_or_greed: request.need_or_greed,
        winner: isWinner
      });
    }
    
    // Check if winner has previously won this item
    let isRepeatedWin = false;
    let previousWinDate = null;
    
    const previousWins = await RollHistory.findAll({
      where: {
        guild_id: guildId,
        winner_id: userId,
        item_name: storageItem.Item?.name || 'Unknown Item',
        winner_need_type: {
          [Op.in]: ['NEED_ITEM', 'NEED_TRAIT']
        }
      },
      order: [['roll_time', 'ASC']],
      transaction: t
    });
    
    if (previousWins.length > 0) {
      isRepeatedWin = true;
      previousWinDate = previousWins[0].roll_time;
    }
    
    // Create a roll history entry
    const manualNote = note || `Manually assigned by ${req.user.username}`;
    
    const rollHistory = await RollHistory.create({
      guild_id: guildId,
      item_name: storageItem.Item?.name || 'Unknown Item',
      item_type: storageItem.Item?.type || 'Unknown Type',
      item_icon: storageItem.Item?.icon || null,
      item_trait: storageItem.trait || null,
      winner_id: userId,
      winner_name: winner.username,
      winner_roll: 100,  // Always 100 for manual selection
      winner_need_type: winnerRequest.need_or_greed,
      roll_results: rollResults,
      roll_time: now,
      is_repeated_win: isRepeatedWin,
      previous_win_date: previousWinDate,
      reprocessed: true,
      reprocessed_note: manualNote
    }, { transaction: t });
    
    // Decrement item quantity
    if (storageItem.quantity > 0) {
      await storageItem.update({
        quantity: Math.max(0, storageItem.quantity - 1)
      }, { transaction: t });
    }
    
    // If quantity is now 0, mark all remaining pending requests as "Out of Stock"
    if (storageItem.quantity <= 1) {
      await LootRequest.update({
        status: 'Denied - Out of Stock',
        storage_item_id: null
      }, {
        where: {
          storage_item_id: storageItem.id,
          status: 'Pending',
          id: { [Op.ne]: winnerRequest.id }
        },
        transaction: t
      });
    }
    
    // Check and remove from wishlist if needed
    try {
      if (storageItem.Item?.id) {
        // Check if the WishList model exists before using it
        if (sequelize.models.WishList) {
          const wishlistItem = await sequelize.models.WishList.findOne({
            where: {
              user_id: userId,
              guild_id: guildId,
              item_id: storageItem.Item.id
            },
            transaction: t
          });
          
          if (wishlistItem) {
            await wishlistItem.destroy({ transaction: t });
          }
        }
      }
    } catch (wishlistError) {
      console.error('Failed to remove item from wishlist:', wishlistError);
      // Continue processing even if wishlist removal fails
    }
    
    // Send Discord notification
    try {
      const discordBotUrl = process.env.DISCORD_BOT_URL || "http://localhost:3300";
      
      const requester = await User.findByPk(req.user.id);
      
      await axios.post(`${discordBotUrl}/webhook/roll-results`, {
        guildId: guildId,
        itemId: storageItem.id,
        itemName: storageItem.Item?.name || 'Unknown Item',
        winner: {
          userId: winner.id,
          username: winner.username,
          roll: 100,
          needOrGreed: winnerRequest.need_or_greed
        },
        rollResults: rollResults,
        manualAssignment: true,
        assignedBy: requester.username,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
    } catch (discordError) {
      console.warn('Failed to send Discord notification:', discordError.message);
      // Continue even if Discord notification fails
    }
    
    // Commit transaction
    await t.commit();
    
    return res.json({
      success: true,
      message: `${winner.username} has been manually assigned as the winner for this item`,
      winner: {
        id: winner.id,
        username: winner.username,
        roll: 100,
        rollType: winnerRequest.need_or_greed
      },
      rollHistory: rollHistory
    });
  } catch (error) {
    // Rollback transaction on error
    await t.rollback();
    console.error('Error setting manual winner:', error);
    res.status(500).json({ error: 'Failed to set winner' });
  }
});

// Change winner of a completed roll
router.post('/:guildId/change-winner/:rollHistoryId', async (req, res) => {
  // Declare transaction outside try/catch so it's available in catch block
  let t;
  
  try {
    // Log request details for debugging
    console.log('Change winner request:', {
      guildId: req.params.guildId,
      rollHistoryId: req.params.rollHistoryId,
      userId: req.body.userId,
      authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user ? { id: req.user.id, username: req.user.username } : null
    });
    
    // Start a transaction to ensure data consistency
    t = await sequelize.transaction();
    
    const { guildId, rollHistoryId } = req.params;
    const { userId, note } = req.body;
    
    // Validate required input
    if (!userId) {
      await t.rollback();
      return res.status(400).json({ error: 'New winner User ID is required' });
    }
    
    // Check if user is authenticated - with more details logged
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log('Authentication failed for change winner request');
      await t.rollback();
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    console.log('User authenticated:', req.user.id);
    
    // Specifically check if the user is a Guild Master
    let requesterMembership;
    
    try {
      // First try with Sequelize ORM - ONLY allow Guild Masters
      requesterMembership = await GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master' // Only Guild Masters can change winners
        },
        transaction: t
      });
      
      // Log extensive debug info about membership
      if (!requesterMembership) {
        // If not found with strict role check, look up the user's actual role for logging
        const actualMembership = await GuildMember.findOne({
          where: {
            guild_id: guildId,
            user_id: req.user.id
          },
          transaction: t
        });
        
        if (actualMembership) {
          console.log('User has membership but wrong role:', {
            userId: req.user.id,
            actualRole: actualMembership.role,
            requiredRole: 'Guild Master'
          });
        } else {
          console.log('User has no membership in this guild:', {
            userId: req.user.id,
            guildId: guildId
          });
        }
      }
    } catch (membershipError) {
      console.error('Error when checking membership with ORM:', membershipError);
      
      // Fallback to direct query
      try {
        // First check user's actual role for debugging
        const [actualRole] = await sequelize.query(
          `SELECT id, role FROM guild_members WHERE guild_id = ? AND user_id = ?`,
          { 
            replacements: [guildId, req.user.id],
            type: sequelize.QueryTypes.SELECT,
            transaction: t
          }
        );
        
        if (actualRole) {
          console.log('SQL query found membership with role:', actualRole.role);
        }
        
        // Now do the strict Guild Master check
        const [membershipResults] = await sequelize.query(
          `SELECT id, role FROM guild_members WHERE guild_id = ? AND user_id = ? AND role = ?`,
          { 
            replacements: [guildId, req.user.id, 'Guild Master'],
            type: sequelize.QueryTypes.SELECT,
            transaction: t
          }
        );
        
        requesterMembership = membershipResults && membershipResults.length > 0 ? membershipResults[0] : null;
      } catch (fallbackError) {
        console.error('Error in fallback membership check:', fallbackError);
        throw fallbackError; // Let the main error handler catch this
      }
    }
    
    if (!requesterMembership) {
      console.log('Permission denied for user:', req.user.id);
      await t.rollback();
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Only Guild Masters can change winners'
      });
    }
    
    console.log('Permission check passed with role:', requesterMembership.role);
    
    // Find the roll history record with safer error handling
    let rollHistory;
    try {
      rollHistory = await RollHistory.findOne({
        where: {
          id: rollHistoryId,
          guild_id: guildId
        },
        transaction: t
      });
    } catch (findError) {
      console.error('Error finding roll history:', findError);
      
      // Try with direct SQL as fallback
      try {
        const [records] = await sequelize.query(
          `SELECT * FROM roll_history WHERE id = ? AND guild_id = ?`,
          { 
            replacements: [rollHistoryId, guildId],
            type: sequelize.QueryTypes.SELECT,
            transaction: t
          }
        );
        
        rollHistory = records && records.length > 0 ? records[0] : null;
      } catch (sqlError) {
        console.error('SQL fallback error when finding roll history:', sqlError);
        throw sqlError;
      }
    }
    
    if (!rollHistory) {
      console.log('Roll history not found:', { rollHistoryId, guildId });
      await t.rollback();
      return res.status(404).json({ error: 'Roll history record not found' });
    }
    
    console.log('Found roll history record:', {
      id: rollHistory.id,
      item: rollHistory.item_name,
      currentWinner: rollHistory.winner_name
    });
    
    // Get the new winner details
    const newWinner = await User.findByPk(userId, { transaction: t });
    if (!newWinner) {
      console.log('New winner user not found:', userId);
      await t.rollback();
      return res.status(404).json({ error: 'New winner user not found' });
    }
    
    console.log('Found new winner:', { id: newWinner.id, username: newWinner.username });
    
    // Check if the new winner is a member of the guild
    const winnerMembership = await GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: userId
      },
      transaction: t
    });
    
    if (!winnerMembership) {
      console.log('New winner is not a guild member:', { userId, guildId });
      await t.rollback();
      return res.status(404).json({ error: 'New winner is not a member of this guild' });
    }
    
    // Get the original winner information for history
    const originalWinnerId = rollHistory.winner_id;
    const originalWinnerName = rollHistory.winner_name;
    
    // Prevent changing to the same winner
    if (userId === originalWinnerId) {
      console.log('Attempted to change to the same winner:', userId);
      await t.rollback();
      return res.status(400).json({ 
        error: 'Invalid operation', 
        message: 'The selected user is already the winner'
      });
    }
    
    console.log('Processing roll results...');
    
    // Safely handle roll_results which might be stored in different formats
    let rollResults = [];
    
    if (rollHistory.roll_results) {
      if (Array.isArray(rollHistory.roll_results)) {
        rollResults = rollHistory.roll_results;
      } else if (typeof rollHistory.roll_results === 'string') {
        try {
          rollResults = JSON.parse(rollHistory.roll_results);
        } catch (parseError) {
          console.error('Error parsing roll_results string:', parseError);
          rollResults = []; // Use empty array as fallback
        }
      } else if (typeof rollHistory.roll_results === 'object') {
        // Handle case where it might be a JSONB object already
        rollResults = Object.values(rollHistory.roll_results);
      }
    }
    
    console.log(`Found ${rollResults.length} existing roll results`);
    
    // Find the new winner in existing results
    let newWinnerResult = rollResults.find(r => r.user_id === userId || r.user_id?.toString() === userId?.toString());
    
    // If the new winner wasn't in the original results, we need to add them
    if (!newWinnerResult) {
      console.log('Adding new winner to roll results');
      newWinnerResult = {
        id: `manual-${Date.now()}`,
        user_id: userId,
        username: newWinner.username,
        avatar_url: newWinner.avatar_url || null,
        roll_value: 100, // Assign a perfect roll
        need_or_greed: 'NEED_ITEM', // Default to NEED_ITEM
        winner: true
      };
      rollResults.push(newWinnerResult);
    } else {
      console.log('New winner already in roll results');
    }
    
    // Update all results to reflect the new winner
    const updatedResults = rollResults.map(result => ({
      ...result,
      winner: result.user_id === userId || result.user_id?.toString() === userId?.toString()
    }));
    
    console.log('Checking for previous wins...');
    
    // Check if the new winner has previously won this item
    let isRepeatedWin = false;
    let previousWinDate = null;
    
    const previousWins = await RollHistory.findAll({
      where: {
        guild_id: guildId,
        winner_id: userId,
        item_name: rollHistory.item_name,
        winner_need_type: {
          [Op.in]: ['NEED_ITEM', 'NEED_TRAIT']
        },
        id: { [Op.ne]: rollHistoryId } // Exclude current roll history
      },
      order: [['roll_time', 'ASC']],
      transaction: t
    });
    
    if (previousWins.length > 0) {
      isRepeatedWin = true;
      previousWinDate = previousWins[0].roll_time;
      console.log('Found previous win:', { date: previousWinDate });
    }
    
    // Create the change note
    const changeNote = note || 
      `Winner changed from ${originalWinnerName} to ${newWinner.username} by ${req.user.username}`;
    
    console.log('Updating roll history with new winner...');
    
    // Safely prepare the update data with explicit JSON stringification for JSONB fields
    const updateData = {
      winner_id: userId,
      winner_name: newWinner.username,
      winner_roll: newWinnerResult.roll_value,
      winner_need_type: newWinnerResult.need_or_greed || 'NEED_ITEM',
      is_repeated_win: isRepeatedWin,
      reprocessed: true,
      reprocessed_note: changeNote
    };
    
    // Handle previous_win_date separately to avoid issues with null dates
    if (previousWinDate) {
      updateData.previous_win_date = previousWinDate;
    }
    
    // Handle roll_results specially based on column type
    try {
      // Try to update with Sequelize ORM first
      updateData.roll_results = updatedResults;
      await rollHistory.update(updateData, { transaction: t });
      
      console.log('Successfully updated roll history record');
    } catch (updateError) {
      console.error('Error updating roll history with ORM:', updateError);
      
      // Fall back to raw SQL
      try {
        // Ensure roll_results is properly stringified
        const jsonString = JSON.stringify(updatedResults);
        
        // Build SQL update statement
        const updateFields = [
          `winner_id = '${userId}'`,
          `winner_name = '${newWinner.username.replace(/'/g, "''")}'`, // Escape quotes
          `winner_roll = ${newWinnerResult.roll_value}`,
          `winner_need_type = '${(newWinnerResult.need_or_greed || 'NEED_ITEM').replace(/'/g, "''")}'`,
          `roll_results = '${jsonString.replace(/'/g, "''")}'::jsonb`,
          `is_repeated_win = ${isRepeatedWin}`,
          `reprocessed = true`,
          `reprocessed_note = '${changeNote.replace(/'/g, "''")}'`
        ];
        
        if (previousWinDate) {
          updateFields.push(`previous_win_date = '${previousWinDate.toISOString()}'`);
        }
        
        await sequelize.query(
          `UPDATE roll_history SET ${updateFields.join(', ')} WHERE id = ? AND guild_id = ?`,
          { 
            replacements: [rollHistoryId, guildId],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t
          }
        );
        
        console.log('Successfully updated roll history record with raw SQL');
      } catch (sqlError) {
        console.error('Raw SQL update failed:', sqlError);
        throw sqlError;
      }
    }
    
    // Send Discord notification
    try {
      console.log('Sending Discord notification...');
      const discordBotUrl = process.env.DISCORD_BOT_URL || "http://localhost:3300";
      
      await axios.post(`${discordBotUrl}/webhook/roll-results`, {
        guildId: guildId,
        itemName: rollHistory.item_name,
        winner: {
          userId: newWinner.id,
          username: newWinner.username,
          roll: newWinnerResult.roll_value,
          needOrGreed: newWinnerResult.need_or_greed || 'NEED_ITEM'
        },
        originalWinner: {
          userId: originalWinnerId,
          username: originalWinnerName
        },
        winnerChanged: true,
        changeReason: changeNote,
        assignedBy: req.user.username,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log('Discord notification sent successfully');
    } catch (discordError) {
      console.warn('Failed to send Discord notification:', discordError.message);
      // Continue even if Discord notification fails
    }
    
    // Commit transaction
    await t.commit();
    console.log('Transaction committed successfully');
    
    return res.json({
      success: true,
      message: `Winner changed from ${originalWinnerName} to ${newWinner.username}`,
      originalWinner: {
        id: originalWinnerId,
        name: originalWinnerName
      },
      newWinner: {
        id: userId,
        username: newWinner.username,
        roll: newWinnerResult.roll_value,
        needOrGreed: newWinnerResult.need_or_greed || 'NEED_ITEM'
      }
    });
  } catch (error) {
    // Rollback transaction on error
    if (t && !t.finished) {
      try {
        await t.rollback();
        console.log('Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('Error during transaction rollback:', rollbackError);
      }
    }
    
    // More detailed error logging
    console.error('Error changing winner:', {
      message: error.message,
      name: error.name,
      code: error.code,
      sql: error.sql,  // Log SQL if available
      params: error.parameters // Log parameters if available
    });
    console.error('Error stack:', error.stack);
    
    // Return a more detailed error response for easier debugging
    res.status(500).json({ 
      error: 'Failed to change winner', 
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to format roll type for display
function formatRollType(type) {
  switch (type) {
    case 'NEED_ITEM': return "Need Item";
    case 'NEED_TRAIT': return "Need Trait";
    case 'GREED': return "Greed";
    default: return type;
  }
}

module.exports = router;