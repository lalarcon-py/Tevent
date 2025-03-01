// frontend/src/config/axios.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Add this to handle cookies
});

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't automatically redirect for auth endpoints
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      // Instead of redirecting, you can set an auth state
      // that your app can use to show the login UI
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
    return Promise.reject(error);
  }
);

export default axiosInstance;