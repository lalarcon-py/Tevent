// frontend/src/components/GearCheck/GearCheck.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress,
  Alert, Tab, Tabs
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';
import GearCheckAdmin from './GearCheckAdmin';

const GearCheck = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState('none'); // none, requested, pending, approved, denied
  const [imageUrl, setImageUrl] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Check if user has admin role
  const isAdmin = user && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(user.role);
  
  // Fetch current gear check status on load
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const guildId = localStorage.getItem('guildId');
        
        const response = await axiosInstance.get(`/api/gear-checks/user/${user.id}`, {
          params: { guildId }
        });
        
        setStatus(response.data.status);
        setImageUrl(response.data.imageUrl);
        setDenialReason(response.data.denialReason || '');
      } catch (err) {
        console.error('Failed to fetch gear check status:', err);
        setError('Failed to load your gear check status');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, [user]);
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        setError('Please select an image file (JPEG, PNG, GIF)');
        return;
      }
      
      if (file.size > maxSize) {
        setError('File size exceeds 5MB limit');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const guildId = localStorage.getItem('guildId');
      formData.append('guildId', guildId);
      
      const response = await axiosInstance.post('/api/gear-checks/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setStatus('pending');
      setImageUrl(response.data.url);
      setSelectedFile(null);
      setSuccess('Gear check uploaded successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to upload gear check:', err);
      setError('Failed to upload gear check');
    } finally {
      setLoading(false);
    }
  };
  
  if (tab === 1 && isAdmin) {
    return <GearCheckAdmin />;
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {isAdmin && (
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="My Gear Check" />
          <Tab label="Manage Gear Checks" />
        </Tabs>
      )}
      
      <Typography variant="h4" gutterBottom>
        Gear Check
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Upload a screenshot of your character's gear and stats for verification by guild leadership.
      </Typography>
      
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
      ) : (
        <Paper sx={{ p: 3 }}>
          {status === 'none' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                No Gear Check Requested
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                You haven't been requested to submit a gear check yet, but you can proactively upload one.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="gear-check-upload"
                />
                <label htmlFor="gear-check-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                  >
                    Select Image
                  </Button>
                </label>
                
                {selectedFile && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {selectedFile.name}
                  </Typography>
                )}
              </Box>
              
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!selectedFile || loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Upload Gear Check'}
              </Button>
            </Box>
          )}
          
          {status === 'requested' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <HourglassEmptyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Gear Check Requested
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                Guild leadership has requested you to submit a gear check. Please upload a screenshot of your character's gear and stats.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="gear-check-upload"
                />
                <label htmlFor="gear-check-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                  >
                    Select Image
                  </Button>
                </label>
                
                {selectedFile && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {selectedFile.name}
                  </Typography>
                )}
              </Box>
              
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!selectedFile || loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit Gear Check'}
              </Button>
            </Box>
          )}
          
          {status === 'pending' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <HourglassEmptyIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'orange' }} />
                Gear Check Pending Review
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                Your gear check has been submitted and is awaiting review by guild leadership.
              </Typography>
              
              {imageUrl && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <img
                    src={imageUrl}
                    alt="Gear Check"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      border: '1px solid #ccc'
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
          
          {status === 'approved' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'green' }} />
                Gear Check Approved
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                Your gear check has been approved by guild leadership.
              </Typography>
              
              {imageUrl && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <img
                    src={imageUrl}
                    alt="Gear Check"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      border: '1px solid #ccc'
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
          
          {status === 'denied' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <CancelIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'red' }} />
                Gear Check Denied
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                Your gear check was not approved. Please review the feedback and submit a new gear check.
              </Typography>
              
              <Box sx={{ 
                bgcolor: 'rgba(255, 0, 0, 0.05)', 
                p: 2, 
                borderRadius: 1,
                mb: 3
              }}>
                <Typography variant="subtitle2">
                  Reason for denial:
                </Typography>
                <Typography variant="body2">
                  {denialReason}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="gear-check-upload"
                />
                <label htmlFor="gear-check-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                  >
                    Select New Image
                  </Button>
                </label>
                
                {selectedFile && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {selectedFile.name}
                  </Typography>
                )}
              </Box>
              
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!selectedFile || loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit New Gear Check'}
              </Button>
              
              {imageUrl && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Previous Submission:
                  </Typography>
                  <img
                    src={imageUrl}
                    alt="Previous Gear Check"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      border: '1px solid #ccc',
                      opacity: 0.7
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GearCheck;