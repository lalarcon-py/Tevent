// components/GuildSettings/GuildSettings.jsx
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
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext'; // Added import
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
  const { guildId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { simulatedRole } = useSimulatedRole(); // Get simulated role
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
    
    // Method 3: From localStorage - only as a fallback, permissions enforced server-side
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
  }, [isAuthenticated, actualGuildId, simulatedRole]); // Added simulatedRole to dependency array
  
  const fetchGuildData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!actualGuildId || actualGuildId === 'undefined') {
        throw new Error('Invalid guild ID');
      }
      
      // Fetch guild details - server validates permissions
      const guildResponse = await axiosInstance.get(`/api/guilds/${actualGuildId}`);
      console.log("Guild API response:", guildResponse.data);
      
      // Check if current user is guild master from response
      const userRoleFromAPI = guildResponse.data.userRole;
      console.log("Server-reported user role:", userRoleFromAPI);
      
      // Use simulated role if available, otherwise use actual role
      const effectiveRole = simulatedRole || userRoleFromAPI;
      setIsGuildMaster(effectiveRole === 'Guild Master');
      
      // Fetch guild settings
      const settingsResponse = await axiosInstance.get(`/api/guilds/${actualGuildId}/settings`);
      
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
  
  const handleSettingsUpdate = async (settingGroup, updatedSettings) => {
    try {
      setLoading(true);
      
      if (!actualGuildId || actualGuildId === 'undefined') {
        throw new Error('Invalid guild ID');
      }
      
      // Update settings in backend - server will enforce permissions
      const response = await axiosInstance.put(`/api/guilds/${actualGuildId}/settings`, {
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
          {simulatedRole ? (
            <Typography sx={{ mt: 1 }}>
              Currently simulating role: <strong>{simulatedRole}</strong> 
              (this role doesn't have access to guild settings)
            </Typography>
          ) : (
            <Typography>
              Your current role is: {guildData?.userRole || user?.role || 'Unknown'}
            </Typography>
          )}
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
          {simulatedRole && (
            <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', mt: 1 }}>
              Simulating role: {simulatedRole}
            </Typography>
          )}
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
              <AdvancedSettings 
                guildData={guildData} 
                onUpdate={(settings) => handleSettingsUpdate('advanced', settings)} 
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