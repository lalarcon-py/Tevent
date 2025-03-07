// frontend/src/components/GearCheck/GearCheckAdmin.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, Avatar,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Divider, Alert
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';

const GearCheckAdmin = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [gearChecks, setGearChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [viewImageDialog, setViewImageDialog] = useState(false);
  const [denyDialog, setDenyDialog] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState(null);
  
  // Check if user has permission
  const hasPermission = user && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(user.role);
  
  useEffect(() => {
    if (!hasPermission) return;
    
    const fetchGearChecks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get guild ID from local storage
        const guildId = localStorage.getItem('guildId');
        if (!guildId) {
          throw new Error('Guild ID not found');
        }
        
        // Get status filter based on tab
        const statusFilter = tab === 0 ? 'pending' : 
                             tab === 1 ? 'requested' : 
                             tab === 2 ? 'approved' : 
                             tab === 3 ? 'denied' : null;
        
        const response = await axiosInstance.get('/api/gear-checks', {
          params: { 
            status: statusFilter,
            guildId
          }
        });
        
        setGearChecks(response.data);
      } catch (err) {
        console.error('Failed to fetch gear checks:', err);
        setError('Failed to load gear checks');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGearChecks();
  }, [tab, hasPermission, actionSuccess]);
  
  const handleApprove = async (gearCheckId) => {
    try {
      setLoading(true);
      
      const guildId = localStorage.getItem('guildId');
      
      await axiosInstance.post(`/api/gear-checks/${gearCheckId}/approve`, {
        guildId
      });
      
      setActionSuccess(`Gear check approved successfully`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to approve gear check:', err);
      setError('Failed to approve gear check');
    } finally {
      setLoading(false);
      setViewImageDialog(false);
    }
  };
  
  const handleDeny = async () => {
    if (!selectedCheck || !denyReason.trim()) return;
    
    try {
      setLoading(true);
      
      const guildId = localStorage.getItem('guildId');
      
      await axiosInstance.post(`/api/gear-checks/${selectedCheck.id}/deny`, {
        reason: denyReason,
        guildId
      });
      
      setActionSuccess(`Gear check denied successfully`);
      setTimeout(() => setActionSuccess(null), 3000);
      
      setDenyDialog(false);
      setDenyReason('');
    } catch (err) {
      console.error('Failed to deny gear check:', err);
      setError('Failed to deny gear check');
    } finally {
      setLoading(false);
      setViewImageDialog(false);
    }
  };
  
  const openDenyDialog = (gearCheck) => {
    setSelectedCheck(gearCheck);
    setDenyReason('');
    setDenyDialog(true);
  };
  
  const viewImage = (gearCheck) => {
    setSelectedCheck(gearCheck);
    setViewImageDialog(true);
  };
  
  if (!hasPermission) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You don't have permission to access the gear check management system.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gear Check Management
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Review and manage gear check submissions from guild members. Only gear checks from the last 14 days are shown.
      </Typography>
      
      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {actionSuccess}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Pending Review" />
        <Tab label="Requested" />
        <Tab label="Approved" />
        <Tab label="Denied" />
      </Tabs>
      
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : gearChecks.length > 0 ? (
          <List>
            {gearChecks.map((check) => (
              <React.Fragment key={check.id}>
                <ListItem 
                  sx={{ 
                    py: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                  onClick={() => viewImage(check)}
                >
                  <ListItemAvatar>
                    <Avatar src={check.user?.avatar_url}>
                      {check.user?.username?.[0] || <AccountCircleIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          {check.user?.username || 'Unknown User'}
                        </Typography>
                        <Chip 
                          size="small"
                          label={check.status}
                          icon={
                            check.status === 'pending' ? <HourglassEmptyIcon fontSize="small" /> :
                            check.status === 'approved' ? <CheckCircleIcon fontSize="small" /> :
                            check.status === 'denied' ? <CancelIcon fontSize="small" /> :
                            <AssignmentTurnedInIcon fontSize="small" />
                          }
                          color={
                            check.status === 'pending' ? 'warning' :
                            check.status === 'approved' ? 'success' :
                            check.status === 'denied' ? 'error' :
                            'default'
                          }
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          Submitted: {new Date(check.created_at).toLocaleString()}
                        </Typography>
                        {check.reviewer && (
                          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                            Reviewed by: {check.reviewer.username}
                          </Typography>
                        )}
                        {check.denial_reason && (
                          <Typography 
                            variant="body2" 
                            component="div" 
                            sx={{ color: 'error.main', mt: 1 }}
                          >
                            Reason: {check.denial_reason}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  
                  {check.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(check.id);
                        }}
                      >
                        Approve
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDenyDialog(check);
                        }}
                      >
                        Deny
                      </Button>
                    </Box>
                  )}
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1">
              No gear checks found for this status.
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Image view dialog */}
      <Dialog
        open={viewImageDialog}
        onClose={() => setViewImageDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Gear Check: {selectedCheck?.user?.username || 'Unknown User'}
        </DialogTitle>
        <DialogContent>
          {selectedCheck?.image_url && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <img
                src={selectedCheck.image_url}
                alt="Gear Check"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh',
                  objectFit: 'contain' 
                }}
              />
            </Box>
          )}
          
          {selectedCheck?.status === 'denied' && selectedCheck?.denial_reason && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" color="error">
                Denial Reason:
              </Typography>
              <Typography variant="body1">
                {selectedCheck.denial_reason}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewImageDialog(false)}>
            Close
          </Button>
          
          {selectedCheck?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleApprove(selectedCheck.id)}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Approve'}
              </Button>
              
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setViewImageDialog(false);
                  openDenyDialog(selectedCheck);
                }}
                disabled={loading}
              >
                Deny
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Deny dialog */}
      <Dialog
        open={denyDialog}
        onClose={() => !loading && setDenyDialog(false)}
      >
        <DialogTitle>Provide Reason for Denial</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason"
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDenyDialog(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeny}
            disabled={loading || !denyReason.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Deny'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GearCheckAdmin;