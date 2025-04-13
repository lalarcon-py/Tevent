// frontend/src/services/guildService.js
import axiosInstance from '../config/axios';
import cacheService from './cacheService';

// Cache expiry durations
const CACHE_DURATIONS = {
  GUILD_MEMBERS: 30 * 60 * 1000, // 30 minutes
  GUILD_DETAILS: 30 * 60 * 1000, // 30 minutes
  USER_GUILDS: 10 * 60 * 1000,   // 10 minutes
};

// Disable frequent console logs in production
const DEBUG_MODE = false;

// Logging fetch operations (only in development)
const logFetch = (cacheKey, source) => {
  if (DEBUG_MODE && process.env.NODE_ENV === 'development') {
    console.log(`[GuildService] Fetching ${cacheKey} from ${source}`);
  }
};

class GuildService {
  // Get guild members with caching
  async getGuildMembers(guildId) {
    const cacheKey = `guild_members_${guildId}`;
    
    // Try to get from cache first
    const cachedData = cacheService.get(cacheKey, CACHE_DURATIONS.GUILD_MEMBERS);
    if (cachedData) {
      logFetch(cacheKey, 'cache');
      return { data: cachedData, status: 200 };
    }
    
    // Not in cache, fetch from API
    logFetch(cacheKey, 'API');
    try {
      const response = await axiosInstance.get(`/api/guilds/${guildId}/members`);
      
      // Store in cache if successful
      if (response.status === 200) {
        cacheService.set(cacheKey, response.data, CACHE_DURATIONS.GUILD_MEMBERS);
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching guild members:', error);
      throw error;
    }
  }
  
  // Get guild details with caching
  async getGuildDetails(guildId) {
    const cacheKey = `guild_details_${guildId}`;
    
    // Try to get from cache first
    const cachedData = cacheService.get(cacheKey, CACHE_DURATIONS.GUILD_DETAILS);
    if (cachedData) {
      logFetch(cacheKey, 'cache');
      return { data: cachedData, status: 200 };
    }
    
    // Not in cache, fetch from API
    logFetch(cacheKey, 'API');
    try {
      const response = await axiosInstance.get(`/api/guilds/${guildId}`);
      
      // Store in cache if successful
      if (response.status === 200) {
        cacheService.set(cacheKey, response.data, CACHE_DURATIONS.GUILD_DETAILS);
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching guild details:', error);
      throw error;
    }
  }
  
  // Get user guilds with caching
  async getUserGuilds() {
    const cacheKey = 'user_guilds';
    
    // Try to get from cache first
    const cachedData = cacheService.get(cacheKey, CACHE_DURATIONS.USER_GUILDS);
    if (cachedData) {
      logFetch(cacheKey, 'cache');
      return { data: cachedData, status: 200 };
    }
    
    // Not in cache, fetch from API
    logFetch(cacheKey, 'API');
    try {
      const response = await axiosInstance.get('/api/guilds/my-guilds');
      
      // Store in cache if successful
      if (response.status === 200) {
        cacheService.set(cacheKey, response.data, CACHE_DURATIONS.USER_GUILDS);
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching user guilds:', error);
      throw error;
    }
  }
  
  // Clear cached data when needed (e.g., after updates)
  clearGuildMembersCache(guildId) {
    cacheService.clear(`guild_members_${guildId}`);
  }
  
  clearGuildDetailsCache(guildId) {
    cacheService.clear(`guild_details_${guildId}`);
  }
  
  clearUserGuildsCache() {
    cacheService.clear('user_guilds');
  }
}

// Create and export singleton instance
const guildService = new GuildService();
export default guildService;