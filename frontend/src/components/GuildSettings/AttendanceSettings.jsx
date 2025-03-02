// components/GuildSettings/AttendanceSettings.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Divider, Paper, Button,
  Alert, Slider, InputAdornment
} from '@mui/material';

const AttendanceSettings = ({ guildData, onUpdate }) => {
  const [minAttendance, setMinAttendance] = useState(60);
  const [warningMessage, setWarningMessage] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    if (guildData?.settings) {
      setMinAttendance(guildData.settings.minAttendanceThreshold || 60);
      setWarningMessage(
        guildData.settings.attendanceWarningMessage || 
        "You are at risk of falling below the minimum attendance threshold and may be removed if improvements are not shown."
      );
    }
  }, [guildData]);
  
  const handleSaveSettings = async () => {
    try {
      setSaveError(null);
      setSaveSuccess(false);
      
      await onUpdate({
        minAttendanceThreshold: minAttendance,
        attendanceWarningMessage: warningMessage
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save attendance settings. Please try again.');
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Attendance Requirements
      </Typography>
      
      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
          Minimum Attendance Threshold
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
          Set the minimum attendance percentage required for guild members. Members falling below this threshold will receive a warning message.
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Slider
              value={minAttendance}
              onChange={(_, value) => setMinAttendance(value)}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              sx={{
                flexGrow: 1,
                color: '#ffb74d',
                '& .MuiSlider-thumb': {
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 2px #ffb74d',
                },
              }}
            />
            <TextField
              value={minAttendance}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  setMinAttendance(Math.min(100, Math.max(0, value)));
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{
                width: '100px',
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
              }}
            />
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ color: 'white', mt: 3 }}>
            Warning Message
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
            Customize the message shown to members who fall below the attendance threshold.
          </Typography>
          
          <TextField
            multiline
            rows={4}
            fullWidth
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Enter warning message for low attendance"
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
            }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 2, color: '#ffb74d' }}>
            Preview:
          </Typography>
          
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'rgba(255, 183, 77, 0.1)', 
            border: '1px solid rgba(255, 183, 77, 0.3)',
            mb: 3
          }}>
            <Typography sx={{ color: 'white' }}>
              {warningMessage || "No warning message set"}
            </Typography>
          </Paper>
        </Box>
        
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Attendance settings saved successfully.
          </Alert>
        )}
        
        <Button 
          variant="contained" 
          onClick={handleSaveSettings}
          sx={{
            bgcolor: 'rgba(144, 202, 249, 0.8)',
            '&:hover': {
              bgcolor: 'rgba(144, 202, 249, 1)'
            }
          }}
        >
          Save Settings
        </Button>
      </Paper>
    </Box>
  );
};

export default AttendanceSettings;