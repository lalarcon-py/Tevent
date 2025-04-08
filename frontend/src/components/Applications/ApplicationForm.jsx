// src/components/Applications/ApplicationForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  Typography,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';

const ApplicationForm = ({ setUserApplication, guildId }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    inGameName: user?.username || '',
    questlogLink: '',
    previousGuilds: '',
    leaveReason: '',
    combatPower: ''
  });
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
      
      // Clear error for screenshot
      if (errors.screenshot) {
        setErrors(prev => ({ ...prev, screenshot: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.inGameName.trim()) {
      newErrors.inGameName = 'In-game name is required';
    }
    
    if (!formData.previousGuilds.trim()) {
      newErrors.previousGuilds = 'Previous guild information is required';
    }
    
    if (!formData.combatPower) {
      newErrors.combatPower = 'Combat Power is required';
    } else if (isNaN(formData.combatPower) || parseInt(formData.combatPower) <= 0) {
      newErrors.combatPower = 'Combat Power must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Use the existing validateForm function instead of manual validation
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError('');
    
    // Create form data for file upload support
    const submitFormData = new FormData(); // Rename to avoid conflict with state variable
    submitFormData.append('inGameName', formData.inGameName);
    submitFormData.append('questlogLink', formData.questlogLink);
    submitFormData.append('previousGuilds', formData.previousGuilds);
    submitFormData.append('leaveReason', formData.leaveReason);
    submitFormData.append('combatPower', formData.combatPower);
    
    // Ensure guildId is valid and included in all possible ways
    if (!guildId) {
      setSubmitError('Missing guild ID. Please try again or contact support.');
      setLoading(false);
      return;
    }
    
    submitFormData.append('guildId', String(guildId));
    
    if (screenshot) {
      submitFormData.append('screenshot', screenshot);
    }
    
    console.log('Submitting application with guildId:', guildId);
    
    try {
      // Submit application to backend
      const response = await axiosInstance.post(
        '/api/guild-applications', 
        submitFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          params: {
            guildId: guildId // Add as query parameter as well for extra safety
          }
        }
      );
      
      // Update parent component state if needed
      if (setUserApplication && typeof setUserApplication === 'function') {
        setUserApplication(response.data);
      }
      
      // Show success message
      setSuccess(true);
      
      // Clear form fields
      setFormData({
        inGameName: '',
        questlogLink: '',
        previousGuilds: '',
        leaveReason: '',
        combatPower: ''
      });
      setScreenshot(null);
      setPreviewUrl('');
      
      // Redirect after a short delay to show success message
      setTimeout(() => {
        navigate('/guilds/setup', { 
          state: { 
            tab: 1, // Go back to the "Join a Guild" tab
            message: 'Your application has been submitted successfully! You will be notified when it is reviewed.'
          } 
        });
      }, 1500);
      
    } catch (error) {
      // Handle errors with appropriate messages
      console.error('Application submission error:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 400) {
          setSubmitError(error.response.data.error || 'Invalid application data. Please check your information.');
        } else if (error.response.status === 401) {
          setSubmitError('You must be logged in to submit an application.');
        } else if (error.response.status === 403) {
          setSubmitError('You do not have permission to apply to this guild.');
        } else if (error.response.status === 409) {
          setSubmitError('You already have a pending application for this guild.');
          
          // Redirect after a short delay if they already applied
          setTimeout(() => {
            navigate('/guilds/setup', { 
              state: { 
                tab: 1,
                message: 'You already have a pending application for this guild.'
              } 
            });
          }, 1500);
        } else {
          setSubmitError('Failed to submit application. Please try again later.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        setSubmitError('Unable to reach the server. Please check your internet connection and try again.');
      } else {
        // Something happened in setting up the request
        setSubmitError('An error occurred while submitting your application. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="In Game Name"
            name="inGameName"
            value={formData.inGameName}
            onChange={handleChange}
            error={!!errors.inGameName}
            helperText={errors.inGameName}
            required
          />
          <FormHelperText>
            If different from your Discord name, your profile will be updated
          </FormHelperText>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Combat Power"
            name="combatPower"
            type="number"
            value={formData.combatPower}
            onChange={handleChange}
            error={!!errors.combatPower}
            helperText={errors.combatPower}
            required
            inputProps={{ min: 1 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Questlog Link to Build (Optional)"
            name="questlogLink"
            value={formData.questlogLink}
            onChange={handleChange}
            placeholder="https://questlog.gg/..."
          />
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            GvG Gear Screenshot
          </Typography>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="screenshot-upload"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="screenshot-upload">
            <Button variant="outlined" component="span">
              Upload Screenshot
            </Button>
          </label>
          
          {previewUrl && (
            <Box mt={2} sx={{ maxWidth: '100%', overflow: 'hidden' }}>
              <img 
                src={previewUrl} 
                alt="Gear Screenshot Preview" 
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} 
              />
            </Box>
          )}
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Previous Guild(s)"
            name="previousGuilds"
            value={formData.previousGuilds}
            onChange={handleChange}
            error={!!errors.previousGuilds}
            helperText={errors.previousGuilds}
            required
            multiline
            rows={2}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Why did you leave your previous guild? (Optional)"
            name="leaveReason"
            value={formData.leaveReason}
            onChange={handleChange}
            multiline
            rows={3}
          />
        </Grid>
      </Grid>
      
      {submitError && (
        <Typography color="error" sx={{ mt: 2 }}>
          {submitError}
        </Typography>
      )}
      
      <Box mt={3}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </Button>
      </Box>
    </Box>
  );
};

export default ApplicationForm;