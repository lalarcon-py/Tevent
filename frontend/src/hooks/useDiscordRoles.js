import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook to fetch Discord roles for a guild
 * @param {string} guildId - The guild ID to fetch roles for
 * @returns {object} Object containing roles array and loading state
 */
export function useDiscordRoles(guildId) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildId) {
      setRoles([]);
      return;
    }

    const fetchRoles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching Discord roles for guild ${guildId}`);
        
        // Use the guild-specific endpoint from rolePingConfig.js
        const response = await api.get(`/api/guilds/${guildId}/discord/roles`);
        
        // Add safety checks for the response format
        if (!response.data) {
          console.error('Invalid response format - no data');
          throw new Error('Invalid response from server');
        }
        
        // Check if response is HTML (which would indicate an error)
        if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
          console.error('Server returned HTML instead of JSON');
          throw new Error('Server returned HTML instead of JSON');
        }
        
        // Ensure we have an array
        let rolesData = Array.isArray(response.data) ? response.data : [];
        
        console.log(`Received ${rolesData.length} Discord roles`);
        
        // Sort roles by position (higher position = more important)
        const sortedRoles = [...rolesData].sort((a, b) => b.position - a.position);
        
        // Filter out @everyone role and bot roles
        const filteredRoles = sortedRoles.filter(role => 
          role.name !== '@everyone' && 
          !role.tags?.bot_id && 
          !role.managed // Exclude integration roles
        );
        
        console.log(`Filtered to ${filteredRoles.length} usable roles`);
        setRoles(filteredRoles);
      } catch (err) {
        console.error('Error fetching Discord roles:', err);
        setError(err);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [guildId]);

  return { roles, loading, error };
}
