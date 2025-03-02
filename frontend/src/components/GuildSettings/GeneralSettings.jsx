// components/GuildSettings/GeneralSettings.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, Alert, Divider,
  Paper
} from '@mui/material';

const GeneralSettings = ({ guildData, onUpdate }) => {
  const [guildName, setGuildName] = useState('');
  const [nameChangeDisabled, setNameChangeDisabled] = useState(false);
  const [daysUntilChange, setDaysUntilChange] = useState(0);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (guildData) {
      setGuildName(guildData.name || '');
      
      // Check if name change is allowed (30-day restriction)
      if (guildData.settings?.lastNameChange) {
        const lastChange = new Date(guildData.settings.lastNameChange);
        const now = new Date();
        const daysSinceChange = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
        
        if (daysSinceChange < 30) {
          setNameChangeDisabled(true);
          setDaysUntilChange(30 - daysSinceChange);
        } else {
          setNameChangeDisabled(false);
        }
      }
    }
  }, [guildData]);
  
  const handleNameChange = async () => {
    if (!guildName.trim()) {
      setError('Guild name cannot be empty');
      return;
    }
    
    if (guildName.trim() === guildData.name) {
      setError('New name must be different from current name');
      return;
    }
    
    if (guildName.length < 3 || guildName.length > 50) {
      setError('Guild name must be between 3 and 50 characters');
      return;
    }
    
    setError(null);
    
    try {
      await onUpdate({
        name: guildName.trim(),
        lastNameChange: new Date().toISOString()
      });
      
      // Disable further name changes
      setNameChangeDisabled(true);
      setDaysUntilChange(30);
    } catch (error) {
      setError('Failed to update guild name. Please try again.');
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        General Settings
      </Typography>
      
      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
          Guild Name
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          You can change your guild name once every 30 days.
        </Typography>
        
        {nameChangeDisabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Guild name can be changed again in {daysUntilChange} days.
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="Guild Name"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            disabled={nameChangeDisabled}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
          
          <Button
            variant="contained"
            onClick={handleNameChange}
            disabled={nameChangeDisabled}
            sx={{
              minWidth: '120px',
              bgcolor: nameChangeDisabled ? 'rgba(144, 202, 249, 0.2)' : 'rgba(144, 202, 249, 0.8)',
              '&:hover': {
                bgcolor: 'rgba(144, 202, 249, 1)'
              }
            }}
          >
            Save
          </Button>
        </Box>
      </Paper>
      
      {/* Other general settings can go here */}
    </Box>
  );
};

export default GeneralSettings;