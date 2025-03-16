// components/GuildSettings/GuildSettings.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Paper, Tabs, Tab, Typography, Divider, CircularProgress,
  Alert, Container, Button
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import WarningIcon from '@mui/icons-material/Warning';
import PercentIcon from '@mui/icons-material/Percent';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useGuildSettings } from '../../contexts/GuildSettingsContext';
import GeneralSettings from './GeneralSettings';
import DkpSettings from './DkpSettings';
import RoleLimits from './RoleLimits';
import AttendanceSettings from './AttendanceSettings';
import DestructiveActions from './DestructiveActions';
import AdvancedSettings from './AdvancedSettings';
import BuildIcon from '@mui/icons-material/Build';

const GuildSettings = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guildData, setGuildData] = useState(null);
  
  // Use multiple sources to get guild ID
  const { guildId: urlGuildId } = useParams();
  const { guildId: contextGuildId } = useGuildSettings();
  const { isAuthenticated, user } = useAuth();
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine the actual guild ID with proper fallbacks
  const [actualGuildId, setActualGuildId] = useState(null);
  
  // First, try to determine the guild ID from available sources
  useEffect(() => {
    // Log initial state for debugging
    console.log('Guild Settings initializing with parameters:', {
      urlParam: urlGuildId,
      contextId: contextGuildId,
      pathname: location.pathname
    });
    
    let foundGuildId = null;
    
    // Method 1: From URL parameters (React Router)
    if (urlGuildId && urlGuildId !== 'undefined') {
      console.log('Using guildId from route params:', urlGuildId);
      foundGuildId = urlGuildId;
    }
    // Method 2: From context provider
    else if (contextGuildId && contextGuildId !== 'undefined') {
      console.log('Using guildId from context:', contextGuildId);
      foundGuildId = contextGuildId;
    }
    // Method 3: Extract from URL path
    else {
      const pathParts = location.pathname.split('/');
      const guildIdIndex = pathParts.indexOf('guilds') + 1;
      if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
        const pathGuildId = pathParts[guildIdIndex];
        if (pathGuildId && pathGuildId !== 'undefined') {
          console.log('Using guildId from URL path:', pathGuildId);
          foundGuildId = pathGuildId;
        }
      }
    }
    
    // Method 4: From localStorage as last resort
    if (!foundGuildId) {
      try {
        const storedGuildId = localStorage.getItem('guildId');
        if (storedGuildId && storedGuildId !== 'undefined') {
          console.log('Using guildId from localStorage:', storedGuildId);
          foundGuildId = storedGuildId;
        }
      } catch (e) {
        console.warn('Failed to access localStorage', e);
      }
    }
    
    console.log('Final determined guild ID:', foundGuildId);
    setActualGuildId(foundGuildId);
    
    // If we couldn't find any guild ID, exit loading state with error
    if (!foundGuildId && isAuthenticated) {
      setError('No valid guild ID found. Please return to the dashboard and try again.');
      setLoading(false);
    }
  }, [urlGuildId, contextGuildId, location.pathname, isAuthenticated]);
  
  // Then, fetch guild data if we have a valid ID and user is authenticated
  useEffect(() => {
    if (isAuthenticated && actualGuildId) {
      console.log('Fetching guild data for ID:', actualGuildId);
      fetchGuildData();
    } else if (isAuthenticated && !actualGuildId) {
      // If authenticated but no guild ID found, exit loading state
      setError('Unable to determine guild ID. Please return to dashboard and try again.');
      setLoading(false);
    }
  }, [isAuthenticated, actualGuildId]);
  
  const fetchGuildData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!actualGuildId || actualGuildId === 'undefined') {
        throw new Error('Invalid guild ID');
      }
      
      console.log('Making API request to fetch guild data for ID:', actualGuildId);
      
      // Fetch guild details - server validates permissions
      const guildResponse = await axiosInstance.get(`/api/guilds/${actualGuildId}`);
      console.log("Guild API response:", guildResponse.data);
      
      // Check if current user is guild master from response
      const userRoleFromAPI = guildResponse.data.userRole;
      console.log("Server-reported user role:", userRoleFromAPI);
      
      // Only trust the server response for permission checks
      setIsGuildMaster(userRoleFromAPI === 'Guild Master');
      
      // Fetch guild settings
      const settingsResponse = await axiosInstance.get(`/api/guilds/${actualGuildId}/settings`);
      console.log("Settings API response:", settingsResponse.data);
      
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
      
      // Handle different error types
      if (error.response) {
        if (error.response.status === 403) {
          setIsGuildMaster(false);
          setError('You do not have permission to access guild settings.');
        } else {
          setError(error.response.data?.error || 'Failed to load guild settings. Please try again later.');
        }
      } else {
        setError('Failed to load guild settings. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  const handleSettingsUpdate = async (settings) => {
    try {
      setLoading(true);
      
      if (!actualGuildId || actualGuildId === 'undefined') {
        throw new Error('Invalid guild ID');
      }
      
      console.log('Updating settings for guild ID:', actualGuildId, settings);
      
      // Update settings in backend - server will enforce permissions
      const response = await axiosInstance.put(`/api/guilds/${actualGuildId}/settings`, settings);
      
      // Update local state
      setGuildData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...settings
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      
      // Handle permission errors
      if (error.response && error.response.status === 403) {
        setError('You do not have permission to update guild settings.');
        // Reload to get latest permissions
        fetchGuildData();
      } else {
        setError(error.response?.data?.error || 'Failed to update settings. Please try again.');
      }
      
      throw error;
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
  
  // This check is only for UI rendering - actual permission enforcement happens server-side
  if (!isGuildMaster) {
    return (
      <Box sx={{ p: 5 }}>
        <Alert severity="warning">
          Only Guild Masters can access guild settings.
          Your current role is: {guildData?.userRole || user?.role || 'Unknown'}
        </Alert>
        <Button 
          variant="contained" 
          onClick={fetchGuildData}
          sx={{ mt: 2 }}
        >
          Refresh
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/')}
          sx={{ mt: 2, ml: 2 }}
        >
          Return to Dashboard
        </Button>
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
            <Tab icon={<BuildIcon />} label="Advanced" iconPosition="start" />
            <Tab icon={<WarningIcon />} label="Destructive Actions" iconPosition="start" />
          </Tabs>
          
          <Box sx={{ flexGrow: 1, p: 3 }}>
            {currentTab === 0 && (
              <GeneralSettings 
                guildData={guildData} 
                onUpdate={handleSettingsUpdate} 
              />
            )}
            {currentTab === 1 && (
              <DkpSettings 
                guildData={guildData} 
                onUpdate={handleSettingsUpdate} 
              />
            )}
            {currentTab === 2 && (
              <RoleLimits 
                guildData={guildData} 
                onUpdate={handleSettingsUpdate} 
              />
            )}
            {currentTab === 3 && (
              <AttendanceSettings 
                guildData={guildData} 
                onUpdate={handleSettingsUpdate} 
              />
            )}
            {currentTab === 4 && (
              <AdvancedSettings 
                guildData={guildData} 
                onUpdate={handleSettingsUpdate} 
              />
            )}
            {currentTab === 5 && (
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