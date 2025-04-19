// frontend/src/config/axios.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
    // Don't use 'Expires' header as it causes CORS issues
  },
  withCredentials: true // Add this to handle cookies
});

// Global state to avoid multiple inactive guild triggers
const state = {
  inactiveGuildTriggered: false
};

// Helper function to get event bus
const getEventBus = () => {
  if (!window.eventBus) {
    window.eventBus = {
      listeners: {},
      on(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
      },
      emit(event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(callback => callback(data));
        }
      }
    };
  }
  return window.eventBus;
};

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const eventBus = getEventBus();
    
    // Handle authentication errors
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      console.error('Authentication required');
      // Only redirect if not already on an auth-related page
      if (!window.location.pathname.includes('/auth-error') && 
          !window.location.pathname.includes('/login')) {
        // Store the intended destination
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        // Redirect to login page instead of directly to Discord
        window.location.href = '/login';
      }
    }
    
    // Handle guild inactive status (402 Payment Required)
    if (error.response?.status === 402 && 
        error.response?.data?.code === 'GUILD_INACTIVE' &&
        !state.inactiveGuildTriggered) {
      
      // Set state to avoid multiple triggers
      state.inactiveGuildTriggered = true;
      
      // Emit guild inactive event with any additional data
      const daysRemaining = error.response?.data?.daysRemaining || 0;
      eventBus.emit('GUILD_INACTIVE', { daysRemaining });
      
      // Reset the trigger prevention after a small delay (but not if we navigate to billing)
      setTimeout(() => {
        if (!window.location.pathname.includes('/billing')) {
          state.inactiveGuildTriggered = false;
        }
      }, 2000);
      
      // Convert the error to a more specific one
      const enhancedError = new Error('Guild is inactive due to expired subscription');
      enhancedError.code = 'GUILD_INACTIVE';
      enhancedError.originalError = error;
      enhancedError.daysRemaining = daysRemaining;
      return Promise.reject(enhancedError);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

// Export the event bus accessor for components to listen to events
export const getGlobalEventBus = getEventBus;