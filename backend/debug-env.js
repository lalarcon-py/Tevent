// Simple environment variable debugging script
// Run this with: node debug-env.js

console.log('Environment Variables Debug:');
console.log('===========================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('BOT_WEBHOOK_URL:', process.env.BOT_WEBHOOK_URL);
console.log('DISCORD_BOT_URL:', process.env.DISCORD_BOT_URL);
console.log('DISCORD_NOTIFICATIONS_ENABLED:', process.env.DISCORD_NOTIFICATIONS_ENABLED);
console.log('BOT_WEBHOOK_SECRET:', process.env.BOT_WEBHOOK_SECRET ? '[SET]' : '[NOT SET]');
console.log('===========================');

// List all environment variables starting with specific prefixes
console.log('\nAll relevant environment variables:');
const relevantPrefixes = ['BOT_', 'DISCORD_'];
Object.keys(process.env)
  .filter(key => relevantPrefixes.some(prefix => key.startsWith(prefix)))
  .forEach(key => {
    const value = key.includes('SECRET') || key.includes('TOKEN') ? '[REDACTED]' : process.env[key];
    console.log(`${key}: ${value}`);
  });
