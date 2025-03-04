// frontend/src/api/apiClient.js
const API_URL = process.env.REACT_APP_API_URL || '';

export default {
  async request(endpoint, options = {}) {
    // Get current guild ID from localStorage
    const guildId = localStorage.getItem('guildId');
    
    // Add guild ID as query parameter
    if (guildId && !endpoint.includes('guildId=') && !endpoint.includes('/guilds/')) {
      const separator = endpoint.includes('?') ? '&' : '?';
      endpoint = `${endpoint}${separator}guildId=${guildId}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
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