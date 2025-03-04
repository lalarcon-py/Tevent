import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

// Get guild ID from URL
const getGuildIdFromUrl = () => {
  const path = window.location.pathname;
  const match = path.match(/\/guilds\/([a-f0-9-]+)/);
  return match ? match[1] : null;
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add guild ID to all requests
api.interceptors.request.use(config => {
  const guildId = getGuildIdFromUrl();
  
  if (guildId) {
    if (config.method === 'get') {
      config.params = { ...config.params, guildId };
    } else {
      config.data = { ...config.data, guildId };
    }
  }
  
  return config;
});

export default api;