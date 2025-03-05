const { sequelize } = require('./config/database');

async function cleanupMigrations() {
  try {
    console.log('Starting migration cleanup process...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected, proceeding with cleanup');
    
    // Get list of migrations from SequelizeMeta
    const [migrations] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
    console.log(`Found ${migrations.length} migrations`);
    
    // Identify duplicate migrations about guild_id
    const guildIdMigrations = migrations
      .filter(m => m.name.includes('guild-id') || m.name.includes('guild_id'))
      .map(m => m.name);
    
    console.log('Guild ID related migrations:', guildIdMigrations);
    
    // Identify the most recent one to keep
    let migrationToKeep = null;
    if (guildIdMigrations.length > 0) {
      migrationToKeep = guildIdMigrations[guildIdMigrations.length - 1];
      console.log(`Keeping most recent migration: ${migrationToKeep}`);
    }
    
    // Remove others from SequelizeMeta (but don't change DB schema)
    for (const migration of guildIdMigrations) {
      if (migration !== migrationToKeep) {
        console.log(`Removing migration from SequelizeMeta: ${migration}`);
        await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name = ?`, {
          replacements: [migration]
        });
      }
    }
    
    console.log('Migration cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration cleanup failed:', error);
    process.exit(1);
  }
}

cleanupMigrations();