// backend/utils/logger.js
/**
 * Simple logger utility
 */
const logger = {
    info: (message) => {
      console.log(`[INFO] ${message}`);
    },
    
    error: (message) => {
      console.error(`[ERROR] ${message}`);
    },
    
    warn: (message) => {
      console.warn(`[WARN] ${message}`);
    },
    
    debug: (message) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  };
  
  module.exports = logger;