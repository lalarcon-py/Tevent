// backend/controllers/guildStorageController.js

// Get guild storage items (strictly guild-specific)
const getGuildStorageItems = async (req, res) => {
    try {
      const guildId = req.query.guildId || req.params.guildId || req.body?.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      console.log(`Fetching storage items for guild: ${guildId}`);
      
      // First check membership in public schema
      await sequelize.query(`SET search_path TO public`);
      
      if (req.isAuthenticated()) {
        const isMember = await db.GuildMember.findOne({
          where: { guild_id: guildId, user_id: req.user.id }
        });
        
        if (!isMember) {
          return res.status(403).json({ error: 'Not a member of this guild' });
        }
      } else {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Switch to guild schema for storage items
      const schemaName = `guild_${guildId}`;
      await sequelize.query(`SET search_path TO "${schemaName}"`);
      
      // Explicitly use fully qualified table name in query to ensure we're accessing the right schema
      const [storageItems] = await sequelize.query(`
        SELECT * FROM "${schemaName}"."guild_storage_items" 
      `);
      
      if (storageItems.length === 0) {
        console.log(`No storage items found in guild: ${guildId}`);
        await sequelize.query(`SET search_path TO public`);
        return res.json([]);
      }
      
      // Get item details from public schema
      const itemIds = storageItems.map(item => item.item_id);
      
      // Switch back to public for item details
      await sequelize.query(`SET search_path TO public`);
      
      // Lookup item details from public catalog
      const [itemDetails] = await sequelize.query(`
        SELECT id, name, type, icon FROM public.items 
        WHERE id IN (${itemIds.map(id => `'${id}'`).join(',')})
      `);
      
      // Merge the data
      const enrichedItems = storageItems.map(storageItem => {
        const itemDetail = itemDetails.find(i => i.id === storageItem.item_id);
        return {
          id: storageItem.id,
          item_id: storageItem.item_id,
          quantity: storageItem.quantity,
          dkp_cost: storageItem.dkp_cost,
          trait: storageItem.trait,
          created_at: storageItem.created_at,
          updated_at: storageItem.updated_at,
          Item: itemDetail ? {
            id: itemDetail.id,
            name: itemDetail.name,
            type: itemDetail.type,
            icon: itemDetail.icon
          } : null
        };
      });
      
      console.log(`Returning ${enrichedItems.length} storage items for guild: ${guildId}`);
      res.json(enrichedItems);
    } catch (error) {
      console.error('Error fetching guild storage items:', error);
      res.status(500).json({ error: 'Failed to fetch storage items' });
    } finally {
      // Always reset to public schema
      try {
        await sequelize.query(`SET search_path TO public`);
      } catch (e) {
        console.error('Failed to reset schema path:', e);
      }
    }
  };

  const debugStorageIsolation = async (req, res) => {
    try {
      const { guildId } = req.params;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      // First check if schema exists
      const schemaExists = await sequelize.query(`
        SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = :schemaName)
      `, { 
        replacements: { schemaName: `guild_${guildId}` },
        type: sequelize.QueryTypes.SELECT 
      });
      
      if (!schemaExists[0].exists) {
        return res.status(404).json({ error: 'Guild schema does not exist' });
      }
      
      // Check storage table exists
      const tableExists = await sequelize.query(`
        SELECT EXISTS(
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = :schemaName 
          AND table_name = 'guild_storage_items'
        ) as table_exists
      `, {
        replacements: { schemaName: `guild_${guildId}` },
        type: sequelize.QueryTypes.SELECT
      });
      
      if (!tableExists[0].table_exists) {
        return res.status(404).json({ error: 'Guild storage table does not exist' });
      }
      
      // Get all storage items with explicit schema qualification
      const [storageItems] = await sequelize.query(`
        SELECT * FROM "guild_${guildId}"."guild_storage_items"
      `);
      
      // Get all guild schemas for comparison
      const [allSchemas] = await sequelize.query(`
        SELECT nspname FROM pg_namespace 
        WHERE nspname LIKE 'guild_%'
      `);
      
      // Result object with diagnostic info
      const diagnosticInfo = {
        guild_id: guildId,
        schema_name: `guild_${guildId}`,
        storage_items_count: storageItems.length,
        storage_items: storageItems,
        all_guild_schemas: allSchemas.map(s => s.nspname)
      };
      
      res.json(diagnosticInfo);
    } catch (error) {
      console.error('Diagnostic error:', error);
      res.status(500).json({ error: 'Diagnostic failed' });
    } finally {
      await sequelize.query(`SET search_path TO public`);
    }
  };
  
  // Add item to guild storage with strict isolation
  const addItemToStorage = async (req, res) => {
    try {
      const { item_id, quantity, dkp_cost, trait } = req.body;
      const guildId = req.query.guildId || req.params.guildId || req.body.guildId;
      
      if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
      }
      
      if (!item_id) {
        return res.status(400).json({ error: 'Item ID is required' });
      }
      
      console.log(`Adding item ${item_id} to storage for guild: ${guildId}`);
      
      // Verify membership in public schema
      await sequelize.query(`SET search_path TO public`);
      
      if (req.isAuthenticated()) {
        const isMember = await db.GuildMember.findOne({
          where: { guild_id: guildId, user_id: req.user.id }
        });
        
        if (!isMember) {
          return res.status(403).json({ error: 'Not a member of this guild' });
        }
      } else {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Verify the item exists in public catalog
      const [itemExists] = await sequelize.query(`
        SELECT id, name, type, icon FROM public.items WHERE id = :itemId
      `, {
        replacements: { itemId: item_id },
        type: sequelize.QueryTypes.SELECT
      });
      
      if (!itemExists) {
        return res.status(404).json({ error: 'Item not found in catalog' });
      }
      
      // Switch to guild schema for storage operations
      const schemaName = `guild_${guildId}`;
      console.log(`Switching to schema: ${schemaName}`);
      await sequelize.query(`SET search_path TO "${schemaName}"`);
      
      // Verify the schema has the guild_storage_items table
      const [tableCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = :schemaName
          AND table_name = 'guild_storage_items'
        ) as table_exists
      `, {
        replacements: { schemaName },
        type: sequelize.QueryTypes.SELECT
      });
      
      if (!tableCheck.table_exists) {
        console.log(`Creating guild_storage_items table in schema: ${schemaName}`);
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS "${schemaName}"."guild_storage_items" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            item_id UUID NOT NULL,
            quantity INTEGER DEFAULT 0,
            trait VARCHAR(255),
            dkp_cost INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
      
      // Create storage item in guild schema using explicit schema prefix
      const [result] = await sequelize.query(`
        INSERT INTO "${schemaName}"."guild_storage_items" 
          (item_id, quantity, trait, dkp_cost) 
        VALUES 
          (:item_id, :quantity, :trait, :dkp_cost)
        RETURNING *
      `, {
        replacements: { 
          item_id, 
          quantity: quantity || 1, 
          trait: trait || null, 
          dkp_cost: dkp_cost || 0
        }
      });
      
      const storageItem = result[0];
      
      console.log(`Added item to guild ${guildId} storage with ID: ${storageItem.id}`);
      
      // Create the complete response object with item details from public schema
      const response = {
        ...storageItem,
        Item: {
          id: itemExists.id,
          name: itemExists.name,
          type: itemExists.type,
          icon: itemExists.icon
        }
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error adding item to storage:', error);
      console.error('Error details:', error.stack);
      res.status(500).json({ error: 'Failed to add item to storage' });
    } finally {
      // Always reset to public schema
      try {
        await sequelize.query(`SET search_path TO public`);
      } catch (e) {
        console.error('Failed to reset schema path:', e);
      }
    }
  };