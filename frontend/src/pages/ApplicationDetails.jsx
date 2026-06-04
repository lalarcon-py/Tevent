// src/pages/ApplicationDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Grid, 
  Divider,
  Button,
  Link,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import axiosInstance from '../config/axios';
import { getImageUrl } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';

const ApplicationDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [guildId, setGuildId] = useState(null);

  // Check if user is Guild Master or Advisor
  const isAdminRole = user && (user.role === 'Guild Master' || user.role === 'Guild Advisor');

  useEffect(() => {
    try {
      const storedGuildId = localStorage.getItem('guildId');
      if (storedGuildId) {
        setGuildId(storedGuildId);
      }
    } catch (e) {
      console.error('Failed to get guild ID from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    const fetchApplication = async () => {
      if (!applicationId) return;
      
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/api/guild-applications/${applicationId}?guildId=${guildId}`);
        setApplication(response.data);
      } catch (err) {
        console.error('Error fetching application:', err);
        setError(err.response?.data?.error || 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchApplication();
    }
  }, [applicationId, guildId]);

  const handleApprove = async () => {
    if (!guildId) {
      console.error('No guild ID available');
      return;
    }
    
    setActionLoading(true);
    try {
      await axiosInstance.post(`/api/guild-applications/${applicationId}/approve?guildId=${guildId}`);
      setApplication(prev => ({...prev, status: 'APPROVED'}));
    } catch (error) {
      console.error('Error approving application:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaitlist = async () => {
    if (!guildId) {
      console.error('No guild ID available');
      return;
    }
    
    setActionLoading(true);
    try {
      await axiosInstance.post(`/api/guild-applications/${applicationId}/waitlist?guildId=${guildId}`);
      setApplication(prev => ({...prev, status: 'WAITLISTED'}));
    } catch (error) {
      console.error('Error waitlisting application:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!guildId) {
      console.error('No guild ID available');
      return;
    }
    
    setActionLoading(true);
    try {
      await axiosInstance.post(`/api/guild-applications/${applicationId}/deny?guildId=${guildId}`);
      setApplication(prev => ({...prev, status: 'DENIED'}));
    } catch (error) {
      console.error('Error denying application:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/guild-applications')}
          sx={{ mb: 2 }}
        >
          Back to Applications
        </Button>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Box>
    );
  }

  if (!application) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/guild-applications')}
          sx={{ mb: 2 }}
        >
          Back to Applications
        </Button>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Application not found</Typography>
        </Paper>
      </Box>
    );
  }

  const isPending = application.status === 'PENDING';
  
  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/guild-applications')}
        sx={{ mb: 2 }}
      >
        Back to Applications
      </Button>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Application Details
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h5">
                {application.in_game_name || application.inGameName}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Applied: {new Date(application.createdAt || application.created_at).toLocaleString()}
              </Typography>
              
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>Status:</strong> {application.status}
              </Typography>
              
              <Typography variant="body1">
                <strong>Combat Power:</strong> {application.combat_power || application.combatPower}
              </Typography>
              
              {(application.questlog_link || application.questlogLink) && (
                <Typography variant="body1">
                  <strong>Build:</strong>{' '}
                  <Link href={application.questlog_link || application.questlogLink} target="_blank" rel="noopener noreferrer">
                    Questlog Link
                  </Link>
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Previous Guild(s):</strong>
              </Typography>
              <Typography paragraph>
                {application.previous_guilds || application.previousGuilds}
              </Typography>
              
              {(application.leave_reason || application.leaveReason) && (
                <>
                  <Typography variant="body2">
                    <strong>Reason for Leaving:</strong>
                  </Typography>
                  <Typography paragraph>
                    {application.leave_reason || application.leaveReason}
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
        </CardContent>
        
        {isPending && isAdminRole && (
          <>
            <Divider />
            <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={handleApprove}
                disabled={actionLoading}
              >
                Approve
              </Button>
              
              <Button
                variant="contained"
                color="warning"
                startIcon={<HourglassEmptyIcon />}
                onClick={handleWaitlist}
                disabled={actionLoading}
                sx={{ mx: 1 }}
              >
                Waitlist
              </Button>
              
              <Button
                variant="contained"
                color="error"
                startIcon={<CloseIcon />}
                onClick={handleDeny}
                disabled={actionLoading}
              >
                Deny
              </Button>
            </CardActions>
          </>
        )}
      </Card>
      
      {(application.screenshot_url || application.screenshotUrl) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Gear Screenshot
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <img 
              src={getImageUrl(application.screenshot_url || application.screenshotUrl)} 
              alt="Gear Screenshot" 
              style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }} 
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ApplicationDetails;