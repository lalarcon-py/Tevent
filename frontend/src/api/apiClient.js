// frontend/src/api/apiClient.js
const API_URL = process.env.REACT_APP_API_URL || '';

export default {
  async request(endpoint, options = {}) {
    try {
      // Get current guild ID from localStorage
      const guildId = localStorage.getItem('guildId');
      
      // Add guild ID as query parameter
      if (guildId && !endpoint.includes('guildId=') && !endpoint.includes('/guilds/')) {
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint = `${endpoint}${separator}guildId=${guildId}`;
      }
      
      // Create full URL for logging
      const fullUrl = `${API_URL}${endpoint}`;
      
      // Log the request for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`API Request: ${options.method || 'GET'} ${fullUrl}`, {
          headers: { ...options.headers },
          body: options.body ? JSON.parse(options.body) : undefined
        });
      }
      
      // Add timestamp to prevent caching issues
      const cacheBuster = endpoint.includes('?') ? '&_t=' : '?_t=';
      const timestampedEndpoint = `${endpoint}${cacheBuster}${Date.now()}`;
      
      const response = await fetch(`${API_URL}${timestampedEndpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      // Get response data - handle both JSON and non-JSON responses
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json().catch(e => {
          console.error('Error parsing JSON response:', e);
          return { error: 'Invalid JSON response' };
        });
      } else {
        data = await response.text();
        try {
          // Try to parse as JSON anyway in case content-type is wrong
          data = JSON.parse(data);
        } catch (e) {
          // Keep as text if it's not valid JSON
        }
      }
      
      // Log the response for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`API Response: ${response.status} ${fullUrl}`, data);
      }
      
      if (!response.ok) {
        const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = data;
        throw error;
      }
      
      return data;
    } catch (error) {
      // Enhance the error with additional context
      if (!error.endpoint) {
        error.endpoint = endpoint;
      }
      if (!error.method) {
        error.method = options.method || 'GET';
      }
      
      console.error(`API Error: ${error.method} ${error.endpoint}`, error);
      throw error; // Re-throw for the caller to handle
    }
  },
  
  // Convenience methods
  get(endpoint) {
    return this.request(endpoint);
  },
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
};