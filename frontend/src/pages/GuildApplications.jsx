// src/pages/GuildApplications.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import ApplicationForm from '../components/Applications/ApplicationForm';
import ApplicationList from '../components/Applications/ApplicationList';
import WaitList from '../components/Applications/WaitList';
import axiosInstance from '../config/axios';

const GuildApplications = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [applications, setApplications] = useState([]);
  const [waitList, setWaitList] = useState([]);
  const [userApplication, setUserApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get guild ID from URL params or state
  const appliedGuildId = searchParams.get('guildId') || location.state?.guildId;

  // Debug logs
  console.log("GuildApplications component rendering with:");
  console.log("- Guild ID from params:", searchParams.get('guildId'));
  console.log("- Guild ID from state:", location.state?.guildId);
  console.log("- Applied Guild ID:", appliedGuildId);
  console.log("- User role:", user?.role);

  // Check if user is Guild Master or Advisor
  const isAdminRole = user && (user.role === 'Guild Master' || user.role === 'Guild Advisor');
  console.log("- Is Admin:", isAdminRole);

  useEffect(() => {
    // Fetch guild info if applying to a guild
    const fetchGuildInfo = async () => {
      if (appliedGuildId && !isAdminRole) {
        try {
          const response = await axiosInstance.get('/api/guilds/available');
          const guild = response.data.find(g => g.id === appliedGuildId);
          if (guild) {
            setSelectedGuild(guild);
          }
        } catch (err) {
          console.error('Error fetching guild info:', err);
        }
      }
    };
    fetchGuildInfo();
  }, [appliedGuildId, isAdminRole]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAdminRole) {
          // Get the current guild ID
          const guildId = localStorage.getItem('guildId');
          
          if (!guildId) {
            setError('No guild selected');
            setLoading(false);
            return;
          }
          
          // Include guild ID in the request
          const appResponse = await axiosInstance.get(`/api/guild-applications?guildId=${guildId}`);
          setApplications(appResponse.data);
          
          // Also include guild ID in waitlist request
          const waitResponse = await axiosInstance.get(`/api/guild-applications/waitlist?guildId=${guildId}`);
          setWaitList(waitResponse.data);
        } else if (appliedGuildId) {
          // For regular users, check if they have a pending application
          try {
            const userAppResponse = await axiosInstance.get(`/api/guild-applications/my-application?guildId=${appliedGuildId}`);
            setUserApplication(userAppResponse.data);
          } catch (err) {
            if (err.response?.status !== 404) {
              console.error('Error fetching user application:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
        setError('Failed to load application data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdminRole, appliedGuildId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Handle redirects after hooks have been called
  if (!isAdminRole && !appliedGuildId) {
    return <Navigate to="/guilds/setup" replace />;
  }

  if (!isAdminRole && appliedGuildId) {
    return <Navigate to={`/guild-apply?guildId=${appliedGuildId}`} replace />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isAdminRole ? 'Guild Applications' : 
          selectedGuild ? `Apply to ${selectedGuild.name}` : 'Guild Application'}
      </Typography>
      
      {isAdminRole ? (
        // Admin view - show tabs for pending and waitlisted applications
        <>
          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Pending Applications" />
            <Tab label="Guild Wait List" />
          </Tabs>
          
          {tab === 0 && (
            <ApplicationList 
              applications={applications} 
              setApplications={setApplications}
              setWaitList={setWaitList}
            />
          )}
          
          {tab === 1 && (
            <WaitList waitList={waitList} setWaitList={setWaitList} />
          )}
        </>
      ) : (
        // This section shouldn't be reachable now due to the redirects,
        // but keeping it as a fallback
        <Paper sx={{ p: 3 }}>
          {userApplication ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Your Application Status
              </Typography>
              <Typography>
                Status: <strong>{userApplication.status}</strong>
              </Typography>
              <Typography sx={{ mt: 2 }}>
                {userApplication.status === 'PENDING' && 'Your application is being reviewed by guild leadership.'}
                {userApplication.status === 'WAITLISTED' && 'You have been placed on the waitlist. The guild will contact you when a spot becomes available.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Apply to Join {selectedGuild?.name || 'the Guild'}
              </Typography>
              <ApplicationForm 
                setUserApplication={setUserApplication} 
                guildId={appliedGuildId}
              />
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GuildApplications;