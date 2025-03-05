// src/components/Applications/ApplicationForm.jsx
import React, { useState } from 'react';
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

const ApplicationForm = ({ setUserApplication }) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError('');
    
    try {
      // Create form data for file upload
      const formDataObj = new FormData();
      formDataObj.append('inGameName', formData.inGameName);
      formDataObj.append('questlogLink', formData.questlogLink);
      formDataObj.append('previousGuilds', formData.previousGuilds);
      formDataObj.append('leaveReason', formData.leaveReason);
      formDataObj.append('combatPower', formData.combatPower);
      
      if (screenshot) {
        formDataObj.append('screenshot', screenshot);
      }
      
      const response = await axiosInstance.post(
        '/api/guild-applications', 
        formDataObj,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setUserApplication(response.data);
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError(error.response?.data?.error || 'Failed to submit application. Please try again.');
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