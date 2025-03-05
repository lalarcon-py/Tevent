// src/components/Applications/ApplicationList.jsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Divider,
  Link,
  Paper
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axiosInstance from '../../config/axios';

const ApplicationList = ({ applications, setApplications, setWaitList }) => {
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async (application) => {
    setLoading(true);
    try {
      await axiosInstance.post(`/api/guild-applications/${application.id}/approve`);
      
      // Remove from applications list
      setApplications(prev => prev.filter(app => app.id !== application.id));
    } catch (error) {
      console.error('Error approving application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlist = async (application) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(`/api/guild-applications/${application.id}/waitlist`);
      
      // Remove from applications list
      setApplications(prev => prev.filter(app => app.id !== application.id));
      
      // Add to waitlist
      setWaitList(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error waitlisting application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedApp) return;
    
    setLoading(true);
    try {
      await axiosInstance.post(`/api/guild-applications/${selectedApp.id}/deny`);
      
      // Remove from applications list
      setApplications(prev => prev.filter(app => app.id !== selectedApp.id));
      
      // Close dialog
      setDenyDialogOpen(false);
      setSelectedApp(null);
    } catch (error) {
      console.error('Error denying application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (applications.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">No pending applications</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {applications.map(application => (
          <Grid item xs={12} key={application.id}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6">
                      {application.in_game_name || application.inGameName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Applied: {new Date(application.createdAt || application.created_at).toLocaleString()}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
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
                    </Box>
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
                  
                  {(application.screenshot_url || application.screenshotUrl) && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          setSelectedImage(application.screenshot_url || application.screenshotUrl);
                          setImageDialogOpen(true);
                        }}
                      >
                        View Gear Screenshot
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
              
              <Divider />
              
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={() => handleApprove(application)}
                  disabled={loading}
                >
                  Approve
                </Button>
                
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<HourglassEmptyIcon />}
                  onClick={() => handleWaitlist(application)}
                  disabled={loading}
                  sx={{ mx: 1 }}
                >
                  Waitlist
                </Button>
                
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setSelectedApp(application);
                    setDenyDialogOpen(true);
                  }}
                  disabled={loading}
                >
                  Deny
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onClose={() => setDenyDialogOpen(false)}>
        <DialogTitle>Deny Application</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to deny this application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDenyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeny} color="error">
            Deny Application
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Image Dialog */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gear Screenshot</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <img 
              src={selectedImage} 
              alt="Gear Screenshot" 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationList;