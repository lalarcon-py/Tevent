// frontend/src/contexts/GuildContext.js
import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

const GuildContext = createContext();

export const GuildProvider = ({ children }) => {
  const [guildName, setGuildName] = useState('Tevent');
  const [isGM, setIsGM] = useState(true); // Will be updated based on actual role
  const [guildId, setGuildId] = useState(null);
  const [guildSettings, setGuildSettings] = useState({
    dkpEnabled: true, // Default to true until loaded
    maxTanks: 10,
    maxHealers: 15,
    maxDps: 75,
    minAttendanceThreshold: 60,
    attendanceWarningMessage: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get guild ID from localStorage
    const storedGuildId = localStorage.getItem('guildId');
    if (storedGuildId) {
      setGuildId(storedGuildId);
      loadGuildSettings(storedGuildId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadGuildSettings = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/guilds/${id}/settings`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuildSettings({
          dkpEnabled: data.dkpEnabled !== false, // Ensure it's a boolean
          maxTanks: data.maxTanks || 10,
          maxHealers: data.maxHealers || 15,
          maxDps: data.maxDps || 75,
          minAttendanceThreshold: data.minAttendanceThreshold || 60,
          attendanceWarningMessage: data.attendanceWarningMessage || ''
        });
        setGuildName(data.name || 'Guild');
      }
      
      // Also fetch guild details to get user role
      const guildResponse = await fetch(`${API_URL}/api/guilds/${id}`, {
        credentials: 'include'
      });
      
      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        setIsGM(guildData.userRole === 'Guild Master');
      }
      
    } catch (error) {
      console.error('Failed to load guild settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGuildSettings = async (settingGroup, newSettings) => {
    if (!guildId) return false;
    
    try {
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          settingGroup,
          settings: newSettings
        })
      });
      
      if (response.ok) {
        // Update local state
        setGuildSettings(prev => ({
          ...prev,
          ...newSettings
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update guild settings:', error);
      return false;
    }
  };

  return (
    <GuildContext.Provider 
      value={{ 
        guildName, 
        setGuildName, 
        isGM, 
        guildId,
        setGuildId,
        guildSettings, 
        updateGuildSettings,
        loading 
      }}
    >
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => useContext(GuildContext);