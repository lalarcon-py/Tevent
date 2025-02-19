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
    if (error.response?.status === 401) {
      // Redirect to Discord auth
      window.location.href = '/auth/discord';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;