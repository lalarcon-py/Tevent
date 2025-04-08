// frontend/src/utils/memberOperations.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Hard delete a member from a guild using the dedicated endpoint
 * This bypasses any ORM issues and ensures the member is properly removed
 * 
 * @param {string} guildId - The ID of the guild
 * @param {string} memberId - The ID of the member to remove
 * @returns {Promise} - Promise resolving to the API response
 */
export const hardDeleteMember = async (guildId, memberId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/hard-delete/guild/${guildId}/member/${memberId}`, 
      { withCredentials: true }
    );
    
    // Force a reload of the guild members list after deletion
    // This ensures the UI is updated
    window.dispatchEvent(new CustomEvent('refreshGuildMembers'));
    
    return response.data;
  } catch (error) {
    console.error('Error in hard delete:', error);
    
    // If the hard delete fails, try the direct member delete as fallback
    if (error.response && error.response.status >= 400) {
      console.log('Attempting fallback deletion method...');
      try {
        const fallbackResponse = await axios.post(
          `${API_URL}/api/direct-member-delete`,
          { 
            guildId, 
            memberId,
            forceDirect: true 
          },
          { withCredentials: true }
        );
        
        // Force a reload of the guild members list after deletion
        window.dispatchEvent(new CustomEvent('refreshGuildMembers'));
        
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Fallback deletion also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
};

/**
 * Remove a member from a guild using the standard endpoint
 * This is the standard method, but will fall back to the hard delete if it fails
 * 
 * @param {string} guildId - The ID of the guild
 * @param {string} memberId - The ID of the member to remove
 * @returns {Promise} - Promise resolving to the API response
 */
export const removeMember = async (guildId, memberId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/guilds/${guildId}/members/${memberId}`,
      { withCredentials: true }
    );
    
    // Force a reload of the guild members list after deletion
    window.dispatchEvent(new CustomEvent('refreshGuildMembers'));
    
    return response.data;
  } catch (error) {
    console.error('Standard member removal failed, attempting hard delete:', error);
    
    // If the standard delete fails, try the hard delete as fallback
    if (error.response && error.response.status >= 400) {
      return hardDeleteMember(guildId, memberId);
    }
    
    throw error;
  }
};

export default {
  removeMember,
  hardDeleteMember
};