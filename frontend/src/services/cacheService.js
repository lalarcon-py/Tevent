// frontend/src/services/cacheService.js
/**
 * A simple caching service to prevent excessive API calls
 */
class CacheService {
  constructor() {
    this.cache = {};
    this.timeouts = {};
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
   * @returns {any} - Cached value or undefined if not found or expired
   */
  get(key, maxAge = 5 * 60 * 1000) {
    const item = this.cache[key];
    if (!item) return undefined;
    
    const now = Date.now();
    if (now - item.timestamp > maxAge) {
      // Cache expired
      delete this.cache[key];
      return undefined;
    }
    
    return item.value;
  }

  /**
   * Store a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} expiry - Cache expiry in milliseconds (default: 5 minutes)
   */
  set(key, value, expiry = 5 * 60 * 1000) {
    // Clear any existing timeout for this key
    if (this.timeouts[key]) {
      clearTimeout(this.timeouts[key]);
    }
    
    // Store the value with timestamp
    this.cache[key] = {
      value,
      timestamp: Date.now()
    };
    
    // Set up auto-cleanup
    this.timeouts[key] = setTimeout(() => {
      delete this.cache[key];
      delete this.timeouts[key];
    }, expiry);
  }

  /**
   * Clear an item from the cache
   * @param {string} key - Cache key to clear
   */
  clear(key) {
    if (this.timeouts[key]) {
      clearTimeout(this.timeouts[key]);
      delete this.timeouts[key];
    }
    delete this.cache[key];
  }

  /**
   * Clear all cache items
   */
  clearAll() {
    // Clear all timeouts
    Object.values(this.timeouts).forEach(timeout => clearTimeout(timeout));
    
    // Reset cache and timeouts
    this.cache = {};
    this.timeouts = {};
  }
}

// Create a singleton instance
const cacheService = new CacheService();

export default cacheService;