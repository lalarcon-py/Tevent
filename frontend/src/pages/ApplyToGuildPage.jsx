// src/pages/ApplyToGuildPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
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
      } catch (err) {
        console.error('Error fetching guild:', err);
        setError('Failed to load guild information');
      } finally {
        setLoading(false);
      }
    };

    fetchGuildInfo();
  }, [guildId]);

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
          Please return to the <a href="/guilds/setup">guild setup page</a> and try again.
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
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1000px', mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Apply to Join {guild.name}
        </Typography>
        
        <Typography variant="body1" paragraph>
          Please complete the application form below. Your application will be reviewed by guild leadership.
        </Typography>
        
        {userApplication ? (
          <Alert severity="info">
            You already have a pending application for this guild.
          </Alert>
        ) : (
          <ApplicationForm 
            setUserApplication={setUserApplication} 
            guildId={guildId}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ApplyToGuildPage;