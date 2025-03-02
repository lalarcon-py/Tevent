// src/contexts/GuildSettingsContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../config/axios';

const GuildSettingsContext = createContext();

export const GuildSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guildId, setGuildId] = useState(null);

  useEffect(() => {
    // Extract guild ID from URL
    const pathParts = window.location.pathname.split('/');
    const guildIdIndex = pathParts.indexOf('guilds') + 1;
    if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
      setGuildId(pathParts[guildIdIndex]);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!guildId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await axiosInstance.get(`/api/guilds/${guildId}/settings`);
        setSettings(response.data);
      } catch (err) {
        console.error('Failed to fetch guild settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [guildId]);

  return (
    <GuildSettingsContext.Provider value={{ settings, loading, error, guildId }}>
      {children}
    </GuildSettingsContext.Provider>
  );
};

export const useGuildSettings = () => useContext(GuildSettingsContext);