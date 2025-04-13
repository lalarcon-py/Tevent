// frontend/src/config/initCache.js
import cacheService from '../services/cacheService';

// Set up a listener for page visibility changes
// This helps clear stale cache when a user returns to the app after having it in background
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // User has returned to the app after having it in background
    // Clear any potentially stale data that would need refreshing
    console.log('App visibility changed to visible - refreshing critical data');
    
    try {
      // Get current guild ID if available
      const guildId = localStorage.getItem('guildId');
      
      if (guildId) {
        // Clear guild members cache as it's most likely to be stale
        // This will force a fresh fetch next time it's needed
        cacheService.clear(`guild_members_${guildId}`);
      }
    } catch (error) {
      console.warn('Failed to check localStorage during visibility change:', error);
    }
  }
});

// Set up a periodic cache cleanup for long-running sessions
// This prevents memory leaks in single-page applications
setInterval(() => {
  // Perform a gentle cleanup of potentially stale items
  const now = Date.now();
  
  // Check cache size periodically
  const cacheSize = Object.keys(cacheService.cache).length;
  if (cacheSize > 50) {
    console.log(`Cache cleanup: Found ${cacheSize} items, performing cleanup`);
    cacheService.clearAll();
  }
}, 30 * 60 * 1000); // Check every 30 minutes

// Prevent excessive polling by monitoring network activity
let pendingRequestsCount = 0;
let lastHighLoadTime = 0;

// Patch fetch to monitor network activity
const originalFetch = window.fetch;
window.fetch = function(...args) {
  pendingRequestsCount++;
  
  return originalFetch.apply(this, args)
    .finally(() => {
      pendingRequestsCount--;
      
      // If we have too many concurrent requests, remember this time
      if (pendingRequestsCount > 5) {
        lastHighLoadTime = Date.now();
        console.warn(`High network load detected: ${pendingRequestsCount} concurrent requests`);
      }
    });
};

// Export initialization flag to verify cache system is ready
export const cacheInitialized = true;