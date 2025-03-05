// src/components/Applications/WaitList.jsx
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
import EmailIcon from '@mui/icons-material/Email';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axiosInstance from '../../config/axios';

const WaitList = ({ waitList, setWaitList }) => {
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNotify = async () => {
    if (!selectedApp) return;
    
    setLoading(true);
    try {
      await axiosInstance.post(`/api/guild-applications/${selectedApp.id}/notify`, {
        message: notifyMessage
      });
      
      // Close dialog
      setNotifyDialogOpen(false);
      setSelectedApp(null);
      setNotifyMessage('');
    } catch (error) {
      console.error('Error notifying applicant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (application) => {
    setLoading(true);
    try {
      await axiosInstance.delete(`/api/guild-applications/${application.id}`);
      
      // Remove from waitlist
      setWaitList(prev => prev.filter(app => app.id !== application.id));
    } catch (error) {
      console.error('Error removing application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (waitList.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">No applications in waitlist</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {waitList.map(application => (
          <Grid item xs={12} key={application.id}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6">
                      {application.in_game_name || application.inGameName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Waitlisted: {new Date(application.waitlisted_at || application.waitlistedAt).toLocaleString()}
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
                  color="primary"
                  startIcon={<EmailIcon />}
                  onClick={() => {
                    setSelectedApp(application);
                    setNotifyDialogOpen(true);
                  }}
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  Notify to Reapply
                </Button>
                
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleRemove(application)}
                  disabled={loading}
                >
                  Remove
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Notify Dialog */}
      <Dialog open={notifyDialogOpen} onClose={() => setNotifyDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Notify Applicant</DialogTitle>
        <DialogContent>
          <Typography paragraph sx={{ mb: 2 }}>
            Send a notification to this applicant to reapply, for example if a spot has opened up.
          </Typography>
          <TextField
            fullWidth
            label="Message (Optional)"
            value={notifyMessage}
            onChange={(e) => setNotifyMessage(e.target.value)}
            placeholder="A spot has opened up in our guild. Please reapply if you're still interested."
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNotify} color="primary" variant="contained" disabled={loading}>
            Send Notification
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

export default WaitList;