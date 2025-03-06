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
    if (settings) {
      // Log for debugging
      console.log("GuildSettings context - DKP enabled:", settings.dkpEnabled);
    }
  }, [settings]);

  useEffect(() => {
    // Try to get guild ID from multiple sources in order of preference
    const getGuildId = () => {
      // Check if current route is a special route
      const path = window.location.pathname;
      if (path.includes('/guilds/setup') || path.includes('/login') || path.includes('/auth-error')) {
        return null;
      }
    
      // 1. First try from URL
      const pathParts = window.location.pathname.split('/');
      const guildIdIndex = pathParts.indexOf('guilds') + 1;
      if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
        const urlGuildId = pathParts[guildIdIndex];
        // Skip special routes like 'setup'
        if (urlGuildId && urlGuildId !== 'undefined' && urlGuildId !== 'setup') {
          console.log('GuildSettingsContext: Using guildId from URL path:', urlGuildId);
          return urlGuildId;
        }
      }
      
      // 2. Then try from localStorage
      try {
        const storedGuildId = localStorage.getItem('guildId');
        if (storedGuildId && storedGuildId !== 'undefined') {
          console.log('GuildSettingsContext: Using guildId from localStorage:', storedGuildId);
          return storedGuildId;
        }
      } catch (e) {
        console.warn('GuildSettingsContext: Failed to access localStorage', e);
      }
      
      return null;
    };

    const foundGuildId = getGuildId();
    setGuildId(foundGuildId);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!guildId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('GuildSettingsContext: Fetching settings for guild ID:', guildId);
        const response = await axiosInstance.get(`/api/guilds/${guildId}/settings`);
        
        console.log('GuildSettingsContext: Settings received:', response.data);
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