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
        
        const response = await api.get(`/api/guilds/${guildId}/discord/roles`);
        
        // Sort roles by position (higher position = more important)
        const sortedRoles = [...response.data].sort((a, b) => b.position - a.position);
        
        // Filter out @everyone role and bot roles
        const filteredRoles = sortedRoles.filter(role => 
          role.name !== '@everyone' && 
          !role.tags?.bot_id && 
          !role.managed // Exclude integration roles
        );
        
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
