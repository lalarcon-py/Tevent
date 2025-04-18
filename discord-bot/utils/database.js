// backend/discord_bot/utils/database.js
const { Pool } = require('pg');
const { Sequelize, Op } = require('sequelize');

// Get database configuration from environment
const useSSL = process.env.DATABASE_USE_SSL === 'true';
const dbUrl = process.env.DATABASE_URL;

// Create connection pool for direct queries
const pool = new Pool({
  connectionString: dbUrl,
  ssl: useSSL ? {
    rejectUnauthorized: false
  } : false,
  max: 100, // Increase maximum connections
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000 // Return an error after 2 seconds if connection not established
});

// Create sequelize instance
const sequelize = new Sequelize(dbUrl, {
  logging: false,
  dialect: 'postgres',
  dialectOptions: {
    ssl: useSSL ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Utility functions for the Discord bot to interact with the database
module.exports = {
  /**
   * Get guild ID from Discord server ID
   */
  getGuildIdFromDiscord: async (discordServerId) => {
    console.log(`[DEBUG] getGuildIdFromDiscord called with discordServerId: ${discordServerId}`);
    try {
      console.log(`[DEBUG] Attempting database query for Discord mapping: ${discordServerId}`);
      
      // First try a basic query to check connectivity
      try {
        const testResult = await pool.query('SELECT NOW() as time');
        console.log(`[DEBUG] Basic connectivity test: ${JSON.stringify(testResult.rows[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Basic connectivity test failed: ${testError.message}`);
      }
      
      const result = await pool.query(
        'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
        [discordServerId.toString()]
      );
      
      console.log(`[DEBUG] Query result for Discord mapping: ${JSON.stringify(result.rows[0] || {})}`);
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`[DEBUG] No mapping found for Discord guild ID: ${discordServerId}`);
        return null;
      }
      
      console.log(`[DEBUG] Mapping found, returning app_guild_id: ${result.rows[0].app_guild_id}`);
      return result.rows[0].app_guild_id;
    } catch (error) {
      console.error(`[ERROR] getGuildIdFromDiscord failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get pending loot requests
   */
  getLootRequests: async (guildId) => {
    console.log(`[DEBUG] getLootRequests called with guildId: ${guildId}`);
    try {
      console.log(`[DEBUG] Querying for pending loot requests in guild ${guildId}`);
      
      // First try a basic connectivity test
      try {
        const testResult = await pool.query('SELECT 1 as test');
        console.log(`[DEBUG] Basic connectivity test passed: ${JSON.stringify(testResult.rows[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Basic connectivity test failed: ${testError.message}`);
      }
      
      // Use a direct query with joins instead of ORM
      const query = `
        SELECT lr.*, 
               gsi.quantity, i.name as item_name, i.type as item_type, i.icon as item_icon,
               u.username, u.discord_id
        FROM loot_requests lr
        JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
        JOIN items i ON gsi.item_id = i.id
        JOIN users u ON lr.user_id = u.id
        WHERE lr.guild_id = $1 AND lr.status = 'Pending'
        ORDER BY lr.created_at DESC
      `;
      
      const requests = await pool.query(query, [guildId]);
      
      console.log(`[DEBUG] Found ${requests.rows.length} pending loot requests`);
      
      // Format the results to match the expected structure
      const formattedRequests = requests.rows.map(row => ({
        id: row.id,
        storage_item_id: row.storage_item_id,
        user_id: row.user_id,
        guild_id: row.guild_id,
        status: row.status,
        need_or_greed: row.need_or_greed,
        created_at: row.created_at,
        updated_at: row.updated_at,
        storageItem: {
          id: row.storage_item_id,
          quantity: row.quantity,
          Item: {
            name: row.item_name,
            type: row.item_type,
            icon: row.item_icon
          }
        },
        user: {
          id: row.user_id,
          username: row.username,
          discord_id: row.discord_id
        }
      }));
      
      return formattedRequests;
    } catch (error) {
      console.error(`[ERROR] getLootRequests failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Create a loot request
   */
  createLootRequest: async (guildId, itemId, discordUserId, requestType) => {
    // FIX: Strictly validate requestType and throw error instead of defaulting
    if (!requestType) {
      console.error(`[ERROR] No request type specified for loot request`);
      throw new Error('No request type specified');
    }

    // Validate requestType before any database operations
    if (!['NEED_ITEM', 'NEED_TRAIT', 'GREED'].includes(requestType)) {
      console.error(`[ERROR] Invalid request type: ${requestType}`);
      throw new Error(`Invalid request type: ${requestType}`);
    }

    console.log(`[DEBUG] createLootRequest called with guildId: ${guildId}, itemId: ${itemId}, discordUserId: ${discordUserId}, requestType: ${requestType}`);
    
    try {
      console.log(`[DEBUG] Finding user with Discord ID: ${discordUserId}`);
      
      // Basic connectivity test
      try {
        const testResult = await pool.query('SELECT 1 as test');
        console.log(`[DEBUG] Basic connectivity test passed: ${JSON.stringify(testResult.rows[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Basic connectivity test failed: ${testError.message}`);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      // Find the user with the given Discord ID
      const userResult = await pool.query(
        'SELECT id, username FROM users WHERE discord_id = $1',
        [discordUserId]
      );
      
      if (!userResult.rows || userResult.rows.length === 0) {
        console.log(`[DEBUG] User not found for Discord ID: ${discordUserId}`);
        return { success: false, message: 'User not found' };
      }
      
      const user = userResult.rows[0];
      console.log(`[DEBUG] Found user: ${user.id} (${user.username})`);
      
      // Find the storage item
      console.log(`[DEBUG] Finding storage item: ${itemId}`);
      const itemResult = await pool.query(
        `SELECT gsi.*, i.name, i.type, i.icon 
         FROM guild_storage_items gsi
         JOIN items i ON gsi.item_id = i.id
         WHERE gsi.id = $1 AND gsi.guild_id = $2`,
        [itemId, guildId]
      );
      
      if (!itemResult.rows || itemResult.rows.length === 0) {
        console.log(`[DEBUG] Item not found in storage: ${itemId}`);
        return { success: false, message: 'Item not found in storage' };
      }
      
      const storageItem = itemResult.rows[0];
      console.log(`[DEBUG] Found storage item: ${storageItem.id}, name: ${storageItem.name}`);
      
      // Check if user already has a pending request for this item
      console.log(`[DEBUG] Checking for existing requests`);
      const existingResult = await pool.query(
        `SELECT id FROM loot_requests 
         WHERE storage_item_id = $1 AND user_id = $2 AND guild_id = $3 AND status = 'Pending'`,
        [itemId, user.id, guildId]
      );
      
      if (existingResult.rows && existingResult.rows.length > 0) {
        console.log(`[DEBUG] Existing request found: ${existingResult.rows[0].id}`);
        return { success: false, message: 'You already have a pending request for this item' };
      }
      
      console.log(`[DEBUG] Creating new loot request with type: ${requestType}`);
      
      // Create the loot request
      const requestResult = await pool.query(
        `INSERT INTO loot_requests 
         (id, guild_id, storage_item_id, user_id, status, need_or_greed, created_at, updated_at)
         VALUES 
         (gen_random_uuid(), $1, $2, $3, 'Pending', $4, NOW(), NOW())
         RETURNING id`,
        [guildId, itemId, user.id, requestType]
      );
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        console.log(`[DEBUG] Failed to create loot request`);
        return { success: false, message: 'Failed to create request' };
      }
      
      const requestId = requestResult.rows[0].id;
      console.log(`[DEBUG] Loot request created: ${requestId} with type ${requestType}`);
      
      return { 
        success: true,
        requestId: requestId,
        itemName: storageItem.name || 'Unknown Item'
      };
    } catch (error) {
      console.error(`[ERROR] createLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      return { success: false, message: `Error creating request: ${error.message}` };
    }
  },
  
  /**
   * Approve a loot request
   */
  approveLootRequest: async (guildId, requestId, discordClient) => {
    console.log(`[DEBUG] approveLootRequest called with guildId: ${guildId}, requestId: ${requestId}`);
    
    // Get a client from the pool for transaction
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Get the request with all related info
      const requestResult = await client.query(
        `SELECT lr.*, 
                gsi.quantity, 
                i.name as item_name, i.type as item_type,
                u.username, u.discord_id,
                gsi.id as storage_item_id
         FROM loot_requests lr
         JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
         JOIN items i ON gsi.item_id = i.id
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND lr.guild_id = $2`,
        [requestId, guildId]
      );
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        console.log(`[DEBUG] Request not found: ${requestId}`);
        await client.query('ROLLBACK');
        return { success: false, message: 'Request not found' };
      }
      
      const request = requestResult.rows[0];
      console.log(`[DEBUG] Found request: ${request.id}, item: ${request.item_name}, user: ${request.username}`);
      
      // Check if item is still available
      if (request.quantity < 1) {
        console.log(`[DEBUG] Item no longer available: ${request.storage_item_id}`);
        await client.query('ROLLBACK');
        return { success: false, message: 'Item no longer available in storage' };
      }
      
      console.log(`[DEBUG] Item available, quantity: ${request.quantity}`);
      
      // Update request status
      console.log(`[DEBUG] Updating request status to Approved`);
      await client.query(
        `UPDATE loot_requests 
         SET status = 'Approved', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
      
      // Check if this is the last of the item
      const willReachZero = request.quantity <= 1;
      
      if (willReachZero) {
        // If this is the last one, remove the item from storage
        console.log(`[DEBUG] This is the last of the item - removing from storage`);
        
        // Get message tracking info before deleting the item
        const trackingResult = await client.query(
          `SELECT channel_id, message_id FROM item_message_tracking WHERE item_id = $1`,
          [request.storage_item_id]
        );
        
        // Deny all other pending requests for this item with "out of stock" status
        await client.query(
          `UPDATE loot_requests 
           SET status = 'Denied - Out of Stock', updated_at = NOW()
           WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
          [request.storage_item_id, requestId]
        );
        
        // Delete the item from storage
        await client.query(
          `DELETE FROM guild_storage_items WHERE id = $1`,
          [request.storage_item_id]
        );
        
        // Try to delete the Discord message if discord client was provided
        if (discordClient && trackingResult.rows.length > 0) {
          try {
            const { channel_id, message_id } = trackingResult.rows[0];
            
            // Delete the tracking entry
            await client.query(
              `DELETE FROM item_message_tracking WHERE item_id = $1`,
              [request.storage_item_id]
            );
            
            // Schedule Discord message deletion after transaction completes
            setTimeout(async () => {
              try {
                const channel = await discordClient.channels.fetch(channel_id);
                if (channel) {
                  const message = await channel.messages.fetch(message_id);
                  if (message) {
                    await message.delete();
                    console.log(`[INFO] Successfully deleted message for unavailable item ${request.storage_item_id}`);
                  }
                }
              } catch (discordError) {
                console.error(`[ERROR] Failed to delete Discord message: ${discordError.message}`);
              }
            }, 0);
          } catch (trackingError) {
            console.error(`[ERROR] Error handling message tracking: ${trackingError.message}`);
          }
        }
      } else {
        // Otherwise just decrement the quantity
        console.log(`[DEBUG] Decrementing item quantity from ${request.quantity} to ${request.quantity - 1}`);
        await client.query(
          `UPDATE guild_storage_items
           SET quantity = quantity - 1, updated_at = NOW()
           WHERE id = $1`,
          [request.storage_item_id]
        );
        
        // Deny other pending requests for this specific request
        await client.query(
          `UPDATE loot_requests 
           SET status = 'Denied - Granted to other', updated_at = NOW()
           WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
          [request.storage_item_id, requestId]
        );
      }
      
      // Commit the transaction
      console.log(`[DEBUG] Committing transaction`);
      await client.query('COMMIT');
      
      console.log(`[DEBUG] Approval successful ${willReachZero ? '(last item removed from storage)' : ''}`);
      
      return { 
        success: true,
        userId: request.user_id,
        username: request.username || 'Unknown',
        discordId: request.discord_id,
        itemName: request.item_name || 'Unknown Item',
        itemType: request.item_type || 'Unknown',
        wasLastItem: willReachZero
      };
    } catch (error) {
      // Roll back transaction on error
      await client.query('ROLLBACK');
      console.error(`[ERROR] approveLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      return { success: false, message: `Error approving request: ${error.message}` };
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  },
  
  /**
   * Deny a loot request
   */
  denyLootRequest: async (guildId, requestId) => {
    console.log(`[DEBUG] denyLootRequest called with guildId: ${guildId}, requestId: ${requestId}`);
    try {
      console.log(`[DEBUG] Finding loot request: ${requestId}`);
      
      // Get the request with all related info
      const requestResult = await pool.query(
        `SELECT lr.*, 
                i.name as item_name,
                u.username, u.discord_id
         FROM loot_requests lr
         JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
         JOIN items i ON gsi.item_id = i.id
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND lr.guild_id = $2`,
        [requestId, guildId]
      );
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        console.log(`[DEBUG] Request not found: ${requestId}`);
        return { success: false, message: 'Request not found' };
      }
      
      const request = requestResult.rows[0];
      console.log(`[DEBUG] Found request: ${request.id}, item: ${request.item_name}, user: ${request.username}`);
      
      // Update request status
      console.log(`[DEBUG] Updating request status to Denied`);
      await pool.query(
        `UPDATE loot_requests 
         SET status = 'Denied', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
      
      console.log(`[DEBUG] Denial successful`);
      return { 
        success: true,
        userId: request.user_id,
        username: request.username || 'Unknown',
        discordId: request.discord_id,
        itemName: request.item_name || 'Unknown Item'
      };
    } catch (error) {
      console.error(`[ERROR] denyLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      return { success: false, message: `Error denying request: ${error.message}` };
    }
  },
  
  /**
   * Get items in guild storage
   */
  getGuildStorageItems: async (guildId) => {
    console.log(`[DEBUG] getGuildStorageItems called with guildId: ${guildId}`);
    try {
      console.log(`[DEBUG] Attempting to fetch storage items for guild: ${guildId}`);
      
      // Add a basic database connectivity test 
      try {
        const testResult = await pool.query('SELECT NOW() as time');
        console.log(`[DEBUG] Storage items DB connectivity test: ${JSON.stringify(testResult.rows[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Storage items DB connectivity test failed: ${testError.message}`);
      }
      
      // Use direct query
      const query = `
        SELECT gsi.*, i.name, i.type, i.icon 
        FROM guild_storage_items gsi
        LEFT JOIN items i ON gsi.item_id = i.id
        WHERE gsi.guild_id = $1
      `;
      
      console.log(`[DEBUG] Storage items query about to execute for guild: ${guildId}`);
      
      const storageResult = await pool.query(query, [guildId]);
      
      console.log(`[DEBUG] Storage items query complete. Found ${storageResult.rows.length} items.`);
      
      // Transform the results to match expected structure
      const formattedItems = storageResult.rows.map(item => ({
        id: item.id,
        item_id: item.item_id,
        quantity: item.quantity,
        trait: item.trait,
        dkp_cost: item.dkp_cost,
        guild_id: item.guild_id,
        Item: {
          name: item.name,
          type: item.type,
          icon: item.icon
        }
      }));
      
      console.log(`[DEBUG] Returning ${formattedItems.length} formatted storage items`);
      return formattedItems;
    } catch (error) {
      console.error(`[ERROR] getGuildStorageItems failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get a user by Discord ID
   */
  getUserByDiscordId: async (discordId) => {
    console.log(`[DEBUG] getUserByDiscordId called with discordId: ${discordId}`);
    try {
      console.log(`[DEBUG] Querying for user with Discord ID: ${discordId}`);
      
      const result = await pool.query(
        'SELECT id, username, discord_id FROM users WHERE discord_id = $1',
        [discordId]
      );
      
      console.log(`[DEBUG] User found: ${result.rows.length > 0 ? 'Yes' : 'No'}`);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error(`[ERROR] getUserByDiscordId failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },

  // Additional utility methods as needed...

  /**
   * Test database connection
   */
  testConnection: async () => {
    try {
      const result = await pool.query('SELECT NOW() as time');
      return { 
        success: true, 
        message: 'Database connection successful', 
        timestamp: result.rows[0].time 
      };
    } catch (error) {
      console.error('Database connection test failed:', error);
      return { 
        success: false, 
        message: `Database connection failed: ${error.message}` 
      };
    }
  }
};
