import { useState } from 'react';
import { 
  Button, 
  CircularProgress, 
  Typography, 
  Paper,
  Grid
} from '@mui/material';
import { Box } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Tesseract from 'tesseract.js';

const GearCheck = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const processImage = async (file) => {
    setIsProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        { logger: m => console.log(m) }
      );

      const response = await fetch('/api/gear/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          imageText: text,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Processing failed:', error);
      setResults({ error: 'Failed to process gear check' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ p: 4, mt: 8 }}>
      <Paper sx={{ p: 4, bgcolor: 'rgba(30, 30, 30, 0.7)' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#90caf9' }}>
          Gear Verification System
        </Typography>
        
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="gear-upload"
          type="file"
          onChange={(e) => processImage(e.target.files[0])}
        />
        
        <label htmlFor="gear-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={isProcessing ? <CircularProgress size={24} /> : <CloudUploadIcon />}
            sx={{
              bgcolor: '#f48fb1',
              '&:hover': { bgcolor: '#ec407a' },
              fontSize: '1.1rem',
              px: 4,
              py: 1.5
            }}
          >
            {isProcessing ? 'Analyzing Gear...' : 'Upload Screenshot'}
          </Button>
        </label>

        {results && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#f48fb1' }}>
              Verification Results
            </Typography>
            <Grid container spacing={3}>
              {results.verifiedItems?.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper sx={{ p: 2, bgcolor: '#1a1a1a' }}>
                    <Typography sx={{ color: 'white' }}>{item.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#90caf9' }}>
                      Type: {item.type}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#90caf9' }}>
                      DKP Value: {item.dkpCost}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default GearCheck;