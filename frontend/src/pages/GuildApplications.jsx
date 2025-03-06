// src/pages/GuildApplications.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const appliedGuildId = searchParams.get('guildId');

  // Check if user is Guild Master or Advisor
  const isAdminRole = user && (user.role === 'Guild Master' || user.role === 'Guild Advisor');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAdminRole) {
          // Fetch pending applications
          const appResponse = await axiosInstance.get('/api/guild-applications');
          setApplications(appResponse.data);
          
          // Fetch waitlist
          const waitResponse = await axiosInstance.get('/api/guild-applications/waitlist');
          setWaitList(waitResponse.data);
        } else {
          // For regular users, check if they have a pending application
          try {
            const userAppResponse = await axiosInstance.get('/api/guild-applications/my-application');
            setUserApplication(userAppResponse.data);
          } catch (err) {
            if (err.response?.status !== 404) {
              console.error('Error fetching user application:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdminRole]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Guild Applications
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
        // Regular user view - show application form or status
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
                Apply to Join the Guild
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