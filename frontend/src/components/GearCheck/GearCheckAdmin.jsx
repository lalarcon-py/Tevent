// frontend/src/components/GearCheck/GearCheckAdmin.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, CircularProgress,
    Alert, Tab, Tabs, Chip, Dialog, DialogTitle,
    DialogContent, DialogContentText, TextField,
    DialogActions, Pagination
  } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext'; // Added import

const GearCheckAdmin = () => {
  const { user } = useAuth();
  const { simulatedRole } = useSimulatedRole(); // Added hook
  const [statusFilter, setStatusFilter] = useState('all');
  const [gearChecks, setGearChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [denyingCheck, setDenyingCheck] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionSuccess, setActionSuccess] = useState(null);
  
  // Check if user has permission - updated to use effective role
  const effectiveRole = simulatedRole || (user ? user.role : null);
  const hasPermission = user && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
  
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
        
        // Use statusFilter directly - send null if set to 'all' to fetch all statuses
        const response = await axiosInstance.get('/api/gear-checks', {
          params: { 
            status: statusFilter !== 'all' ? statusFilter : null,
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
  }, [statusFilter, hasPermission, actionSuccess]);
  
  const handleApprove = async (gearCheckId) => {
    try {
      setActionLoading(true);
      
      const guildId = localStorage.getItem('guildId');
      
      await axiosInstance.post(`/api/gear-checks/${gearCheckId}/approve`, {
        guildId
      });
      
      setSuccess(`Gear check approved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setActionSuccess(Date.now()); // Trigger a refresh
    } catch (err) {
      console.error('Failed to approve gear check:', err);
      setError('Failed to approve gear check');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleDeny = async (gearCheckId, reason) => {
    try {
      setActionLoading(true);
      
      const guildId = localStorage.getItem('guildId');
      
      await axiosInstance.post(`/api/gear-checks/${gearCheckId}/deny`, {
        reason: reason,
        guildId
      });
      
      setSuccess(`Gear check denied successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setDenyingCheck(null);
      setDenialReason('');
      
      // Refresh the list
      setActionSuccess(Date.now()); // Use a timestamp to force refresh
    } catch (err) {
      console.error('Failed to deny gear check:', err);
      setError('Failed to deny gear check');
    } finally {
      setActionLoading(false);
    }
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Manage Gear Checks
      </Typography>
  
      <Box sx={{ mb: 3 }}>
        <Tabs value={statusFilter} onChange={(e, newValue) => setStatusFilter(newValue)}>
          <Tab label="All" value="all" />
          <Tab label="Requested" value="requested" />
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Denied" value="denied" />
        </Tabs>
      </Box>
  
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
  
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
  
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : gearChecks.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No gear checks found with the selected filter.
          </Typography>
        </Paper>
      ) : (
        gearChecks.map((check) => (
          <Paper key={check.id} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  {check.user?.username || 'Unknown User'}
                </Typography>
  
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={check.status.toUpperCase()}
                    color={
                      check.status === 'approved'
                        ? 'success'
                        : check.status === 'denied'
                        ? 'error'
                        : check.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Submitted: {new Date(check.createdAt).toLocaleString()}
                  </Typography>
                </Box>
  
                {check.status === 'denied' && check.denial_reason && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Reason for denial:</Typography>
                    <Typography variant="body2">{check.denial_reason}</Typography>
                  </Box>
                )}
  
                {check.status === 'pending' && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleApprove(check.id)}
                      sx={{ mr: 1 }}
                      disabled={actionLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => setDenyingCheck(check.id)}
                      disabled={actionLoading}
                    >
                      Deny
                    </Button>
                  </Box>
                )}
  
                {check.status === 'requested' && (
                  <Typography variant="subtitle2" color="text.secondary">
                    Awaiting submission from user
                  </Typography>
                )}
              </Box>
  
              {check.image_url && (
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <img
                    src={check.image_url.startsWith('http') 
                      ? check.image_url 
                      : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${check.image_url}`}
                    alt="Gear Check"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      console.error('Failed to load image:', check.image_url);
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        ))
      )}
  
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
  
      {/* Denial reason dialog */}
      <Dialog open={!!denyingCheck} onClose={() => setDenyingCheck(null)}>
        <DialogTitle>Provide Reason for Denial</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide feedback explaining why this gear check is being denied:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="denial-reason"
            label="Reason"
            fullWidth
            multiline
            rows={4}
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDenyingCheck(null)}>Cancel</Button>
          <Button 
            onClick={() => handleDeny(denyingCheck, denialReason)} 
            color="error"
            disabled={!denialReason.trim() || actionLoading}
          >
            Deny Gear Check
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GearCheckAdmin;