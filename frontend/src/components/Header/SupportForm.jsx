// components/Header/SupportForm.jsx
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Typography, Box, Chip, CircularProgress, Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const SupportForm = ({ open, handleClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    description: '',
    images: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    setFormData({
      ...formData,
      images: [...formData.images, ...newFiles].slice(0, 5) // Limit to 5 files
    });
  };
  
  const handleRemoveFile = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async () => {
    // Validation
    if (!formData.email || !formData.subject || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Create form data for file upload
      const submissionData = new FormData();
      submissionData.append('email', formData.email);
      submissionData.append('subject', formData.subject);
      submissionData.append('description', formData.description);
      
      formData.images.forEach(file => {
        submissionData.append('images', file);
      });
      
      // API call to submit ticket
      const response = await fetch('/api/support/ticket', {
        method: 'POST',
        body: submissionData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }
      
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        // Reset form after closing
        setFormData({
          email: '',
          subject: '',
          description: '',
          images: []
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { bgcolor: '#1e1e1e', color: 'white' }
      }}
    >
      <DialogTitle>Submit Support Ticket</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Your support ticket has been submitted successfully! We'll get back to you soon.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Typography variant="body2" sx={{ mb: 3, mt: 2 }}>
              Fill out the form below to submit a support ticket. Our team will respond via email or Discord.
            </Typography>
            
            <TextField
              name="email"
              label="Your Email Address"
              type="email"
              required
              fullWidth
              margin="normal"
              value={formData.email}
              onChange={handleInputChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            
            <TextField
              name="subject"
              label="Subject"
              required
              fullWidth
              margin="normal"
              value={formData.subject}
              onChange={handleInputChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            
            <TextField
              name="description"
              label="Description"
              multiline
              rows={5}
              required
              fullWidth
              margin="normal"
              value={formData.description}
              onChange={handleInputChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Screenshots (Optional)
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {formData.images.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => handleRemoveFile(index)}
                    sx={{ 
                      bgcolor: 'rgba(144, 202, 249, 0.2)',
                      color: 'white'
                    }}
                  />
                ))}
              </Box>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="support-file-upload"
                multiple
                type="file"
                onChange={handleFileChange}
                disabled={formData.images.length >= 5}
              />
              <label htmlFor="support-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={formData.images.length >= 5}
                >
                  Upload Screenshots
                </Button>
              </label>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Maximum 5 files. Accepted formats: JPG, PNG, GIF
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={submitting || success}
        >
          {submitting ? <CircularProgress size={24} /> : 'Submit Ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupportForm;