// backend/scripts/runMigrations.js
const { exec } = require('child_process');
const path = require('path');

console.log('Starting migration process...');

// Make sure we're in the backend directory
const backendDir = path.resolve(__dirname, '..');
process.chdir(backendDir);

// Run the migrations in sequence
const migrations = [
  'npx sequelize-cli db:migrate:status',
  'npx sequelize-cli db:migrate --name 2025-03-20-add-guild-id-and-indexes.js',
  'npx sequelize-cli db:migrate --name 2025-03-21-migrate-schema-data-to-columns.js'
];

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      console.log(`stdout: ${stdout}`);
      resolve();
    });
  });
}

async function runMigrations() {
  try {
    for (const migration of migrations) {
      await runCommand(migration);
    }
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

runMigrations();