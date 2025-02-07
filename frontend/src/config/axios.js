import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to handle 401s
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to Discord auth
      window.location.href = 'http://localhost:5000/auth/discord';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;