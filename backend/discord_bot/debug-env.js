// backend/discord_bot/debug-env.js
require('dotenv').config({ path: '../.env' });

console.log("===== DATABASE CONNECTION DEBUGGING =====");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log("Protocol:", url.protocol);
    console.log("Hostname:", url.hostname);
    console.log("Port:", url.port);
    console.log("Path:", url.pathname);
    console.log("Username:", url.username);
    console.log("Password:", url.password ? "[REDACTED]" : "not set");
    
    // Check if it's an IPv6 address
    const isIPv6 = url.hostname.includes(':');
    console.log("Is IPv6:", isIPv6);
    
    if (isIPv6) {
      console.log("WARNING: IPv6 address detected. This can cause connection issues.");
      console.log("Recommendation: Use an IPv4 address or hostname instead.");
    }
  } catch (error) {
    console.error("Error parsing DATABASE_URL:", error.message);
  }
}

console.log("\nDISCORD_BOT_TOKEN:", process.env.DISCORD_BOT_TOKEN ? "✅ Set" : "❌ Not set");
console.log("TOKEN:", process.env.TOKEN ? "✅ Set" : "❌ Not set");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");

console.log("\n===== NETWORKING DEBUGGING =====");
const dns = require('dns');
const os = require('os');

console.log("IPv4 Addresses:");
Object.values(os.networkInterfaces()).forEach(interfaces => {
  interfaces.forEach(iface => {
    if (iface.family === 'IPv4') {
      console.log(`- ${iface.address}`);
    }
  });
});

// Try to resolve common hostnames
const hostnames = ['localhost', 'postgres', 'db', 'database'];
hostnames.forEach(hostname => {
  dns.lookup(hostname, (err, address, family) => {
    console.log(`DNS lookup for ${hostname}: ${err ? 'Failed' : address} (IPv${family})`);
  });
});

console.log("\n===== END DEBUGGING =====");