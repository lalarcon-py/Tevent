// src/pages/ApplyToGuildPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Divider } from '@mui/material';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import ApplicationForm from '../components/Applications/ApplicationForm';
import axiosInstance from '../config/axios';

const ApplyToGuildPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const guildId = searchParams.get('guildId') || location.state?.guildId;
  
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [userApplication, setUserApplication] = useState(null);

  useEffect(() => {
    const fetchGuildInfo = async () => {
      if (!guildId) {
        setError('No guild selected');
        setLoading(false);
        return;
      }

      try {
        // Fetch basic guild info
        const response = await axiosInstance.get(`/api/guilds/available`);
        const guildInfo = response.data.find(g => g.id === guildId);
        
        if (!guildInfo) {
          setError('Guild not found');
        } else {
          setGuild(guildInfo);
        }
        
        // Check if user already has an application
        try {
          const userAppResponse = await axiosInstance.get('/api/guild-applications/my-application');
          setUserApplication(userAppResponse.data);
        } catch (err) {
          // 404 is expected if no application exists
          if (err.response?.status !== 404) {
            console.error('Error fetching user application:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching guild:', err);
        setError('Failed to load guild information');
      } finally {
        setLoading(false);
      }
    };

    fetchGuildInfo();
  }, [guildId]);

  const handleApplicationSubmit = async (applicationData) => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      
      formData.append('guildId', guildId);
      
      formData.append('inGameName', applicationData.inGameName);
      formData.append('questlogLink', applicationData.questlogLink || '');
      formData.append('previousGuilds', applicationData.previousGuilds);
      formData.append('leaveReason', applicationData.leaveReason || '');
      formData.append('combatPower', applicationData.combatPower);
      
      if (applicationData.screenshot) {
        formData.append('screenshot', applicationData.screenshot);
      }
      
      await axiosInstance.post('/api/guild-applications', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccessMessage('Your application has been submitted successfully. The guild leadership will review it soon.');
      
      const response = await axiosInstance.get('/api/guild-applications/my-application');
      setUserApplication(response.data);
    } catch (err) {
      console.error('Application submission error:', err);
      setError(err.response?.data?.error || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToGuilds = () => {
    navigate('/guilds/setup');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Please return to the <Button variant="text" onClick={handleReturnToGuilds}>guild setup page</Button> and try again.
        </Typography>
      </Box>
    );
  }

  if (!guild) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Guild not found. Please select a valid guild.
        </Alert>
        <Button 
          variant="contained" 
          onClick={handleReturnToGuilds}
          sx={{ mt: 2 }}
        >
          Return to Guilds
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
        p: 3, 
        maxWidth: '1000px', 
        mx: 'auto',
        mt: 8,
        mb: 4 
      }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Apply to Join {guild.name}
        </Typography>
        
        <Typography variant="body1" paragraph>
          Please complete the application form below. Your application will be reviewed by guild leadership.
        </Typography>
        
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}
        
        {userApplication ? (
          <Box sx={{ mt: 3 }}>
            <Alert 
              severity="info" 
              sx={{ mb: 3 }}
            >
              You already have an application for this guild.
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Application Status
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> {userApplication.status}
              </Typography>
              
              <Typography variant="body1" gutterBottom>
                <strong>Submitted:</strong> {new Date(userApplication.created_at).toLocaleString()}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary">
                {userApplication.status === 'PENDING' && 'Your application is being reviewed by guild leadership.'}
                {userApplication.status === 'WAITLISTED' && 'You have been placed on the waitlist. The guild will contact you when a spot becomes available.'}
                {userApplication.status === 'APPROVED' && 'Congratulations! Your application has been approved. You can now access the guild dashboard.'}
                {userApplication.status === 'DENIED' && 'Unfortunately, your application has been denied. You may apply again at a later time.'}
              </Typography>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={handleReturnToGuilds}>
                Return to Guilds
              </Button>
              
              {userApplication.status === 'DENIED' && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setUserApplication(null)}
                >
                  Apply Again
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <ApplicationForm 
            setUserApplication={setUserApplication} 
            guildId={guildId}
            onSubmit={handleApplicationSubmit}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ApplyToGuildPage;