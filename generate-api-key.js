const crypto = require('crypto');

// Generate a 32-byte random string and convert to hex (64 characters)
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('BOT_API_KEY=' + apiKey);