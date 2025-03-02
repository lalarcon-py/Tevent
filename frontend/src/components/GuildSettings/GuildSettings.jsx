// components/GuildSettings/GuildSettings.jsx (Fixed version)
import { useState, useEffect } from 'react';
import { 
  Box, Paper, Tabs, Tab, Typography, Divider, CircularProgress,
  Alert, Container, Button
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import WarningIcon from '@mui/icons-material/Warning';
import PercentIcon from '@mui/icons-material/Percent';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';
import GeneralSettings from './GeneralSettings';
import DkpSettings from './DkpSettings';
import RoleLimits from './RoleLimits';
import AttendanceSettings from './AttendanceSettings';
import DestructiveActions from './DestructiveActions';

const GuildSettings = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guildData, setGuildData] = useState(null);
  const { guildId } = useParams(); // Use the useParams hook to get the guildId
  const { isAuthenticated, user } = useAuth();
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  const [actualGuildId, setActualGuildId] = useState(null);
  const navigate = useNavigate();
  
  // First, find the guild ID using multiple methods
  useEffect(() => {
    // Method 1: From URL parameters (React Router)
    if (guildId && guildId !== 'undefined') {
      console.log('Using guildId from route params:', guildId);
      setActualGuildId(guildId);
      return;
    }
    
    // Method 2: From URL path
    const pathParts = window.location.pathname.split('/');
    const guildIdIndex = pathParts.indexOf('guilds') + 1;
    if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
      const urlGuildId = pathParts[guildIdIndex];
      if (urlGuildId && urlGuildId !== 'undefined') {
        console.log('Using guildId from URL path:', urlGuildId);
        setActualGuildId(urlGuildId);
        return;
      }
    }
    
    // Method 3: From localStorage
    try {
      const storedGuildId = localStorage.getItem('guildId');
      if (storedGuildId && storedGuildId !== 'undefined') {
        console.log('Using guildId from localStorage:', storedGuildId);
        setActualGuildId(storedGuildId);
        return;
      }
    } catch (e) {
      console.warn('Failed to access localStorage', e);
    }
    
    // No valid guild ID found
    console.error('No valid guild ID found');
    setError('No guild ID found. Please go back to the dashboard and try again.');
    setLoading(false);
  }, [guildId]);
  
  // Then, fetch guild data if we have a valid ID
  useEffect(() => {
    if (isAuthenticated && actualGuildId) {
      fetchGuildData();
    }
  }, [isAuthenticated, actualGuildId]);
  
  const fetchGuildData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching guild data with ID:', actualGuildId);
      
      if (!actualGuildId || actualGuildId === 'undefined') {
        throw new Error('Invalid guild ID');
      }
      
      // Fetch guild details
      const guildResponse = await axiosInstance.get(`/api/guilds/${actualGuildId}`);
      
      // Fetch guild settings
      const settingsResponse = await axiosInstance.get(`/api/guilds/${actualGuildId}/settings`);
      
      // Check if current user is guild master
      const isGM = guildResponse.data.userRole === 'Guild Master';
      setIsGuildMaster(isGM);
      
      // Combine guild data with settings
      setGuildData({
        ...guildResponse.data,
        settings: settingsResponse.data || {
          dkpEnabled: true,
          maxTanks: 10,
          maxHealers: 15,
          maxDps: 75,
          minAttendanceThreshold: 60,
          attendanceWarningMessage: "You are at risk of falling below the minimum attendance threshold and may be removed if improvements are not shown.",
          lastNameChange: null
        }
      });
    } catch (error) {
      console.error('Failed to fetch guild data:', error);
      setError('Failed to load guild settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  const handleSettingsUpdate = async (settingGroup, updatedSettings) => {
    try {
      setLoading(true);
      
      if (!actualGuildId || actualGuildId === 'undefined') {
        throw new Error('Invalid guild ID');
      }
      
      // Update settings in backend
      await axiosInstance.put(`/api/guilds/${actualGuildId}/settings`, {
        settingGroup,
        settings: updatedSettings
      });
      
      // Update local state
      setGuildData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...updatedSettings
        }
      }));
      
      // Show success message or notification
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !guildData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }
  
  if (!isGuildMaster) {
    return (
      <Box sx={{ p: 5 }}>
        <Alert severity="warning">
          Only Guild Masters can access guild settings.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ 
        p: 0, 
        bgcolor: '#1e1e1e',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            p: 3, 
            bgcolor: '#1a1a1a',
            color: '#90caf9',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          Guild Settings
        </Typography>
        
        <Box sx={{ display: 'flex' }}>
          <Tabs
            orientation="vertical"
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              minWidth: 200,
              '& .MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                pl: 3,
                minHeight: 64,
                color: 'rgba(255, 255, 255, 0.7)'
              },
              '& .Mui-selected': {
                color: '#90caf9',
                bgcolor: 'rgba(144, 202, 249, 0.08)'
              },
              '& .MuiTabs-indicator': {
                left: 0,
                right: 'auto',
                bgcolor: '#90caf9'
              }
            }}
          >
            <Tab icon={<SettingsIcon />} label="General" iconPosition="start" />
            <Tab icon={<FormatListNumberedIcon />} label="DKP System" iconPosition="start" />
            <Tab icon={<PeopleIcon />} label="Role Limits" iconPosition="start" />
            <Tab icon={<PercentIcon />} label="Attendance" iconPosition="start" />
            <Tab icon={<WarningIcon />} label="Destructive Actions" iconPosition="start" />
          </Tabs>
          
          <Box sx={{ flexGrow: 1, p: 3 }}>
            {currentTab === 0 && (
              <GeneralSettings 
                guildData={guildData} 
                onUpdate={(settings) => handleSettingsUpdate('general', settings)} 
              />
            )}
            {currentTab === 1 && (
              <DkpSettings 
                guildData={guildData} 
                onUpdate={(settings) => handleSettingsUpdate('dkp', settings)} 
              />
            )}
            {currentTab === 2 && (
              <RoleLimits 
                guildData={guildData} 
                onUpdate={(settings) => handleSettingsUpdate('roles', settings)} 
              />
            )}
            {currentTab === 3 && (
              <AttendanceSettings 
                guildData={guildData} 
                onUpdate={(settings) => handleSettingsUpdate('attendance', settings)} 
              />
            )}
            {currentTab === 4 && (
              <DestructiveActions 
                guildData={guildData} 
                guildId={actualGuildId}
              />
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default GuildSettings;