const { sequelize } = require('./config/database');

async function cleanupMigrations() {
  try {
    
    // Connect to database
    await sequelize.authenticate();
    
    // Get list of migrations from SequelizeMeta
    const [migrations] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
    
    // Identify duplicate migrations about guild_id
    const guildIdMigrations = migrations
      .filter(m => m.name.includes('guild-id') || m.name.includes('guild_id'))
      .map(m => m.name);
    
    // Identify the most recent one to keep
    let migrationToKeep = null;
    if (guildIdMigrations.length > 0) {
      migrationToKeep = guildIdMigrations[guildIdMigrations.length - 1];
    }
    
    // Remove others from SequelizeMeta (but don't change DB schema)
    for (const migration of guildIdMigrations) {
      if (migration !== migrationToKeep) {
        await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name = ?`, {
          replacements: [migration]
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration cleanup failed:', error);
    process.exit(1);
  }
}

cleanupMigrations();