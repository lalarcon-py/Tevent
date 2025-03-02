// components/GuildSettings/DkpSettings.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Typography, Switch, FormControlLabel, Divider,
  Paper, Button, Alert 
} from '@mui/material';

const DkpSettings = ({ guildData, onUpdate }) => {
  const [dkpEnabled, setDkpEnabled] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    if (guildData?.settings) {
      setDkpEnabled(guildData.settings.dkpEnabled !== false); // Default to true if undefined
    }
  }, [guildData]);
  
  const handleToggleDkp = () => {
    setDkpEnabled(!dkpEnabled);
  };
  
  const handleSaveSettings = async () => {
    try {
      setSaveError(null);
      setSaveSuccess(false);
      
      await onUpdate({
        dkpEnabled
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save DKP settings. Please try again.');
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        DKP System Settings
      </Typography>
      
      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
          DKP System
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          Enable or disable the DKP (Dragon Kill Points) system for your guild.
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={dkpEnabled} 
                onChange={handleToggleDkp}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#90caf9',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#90caf9',
                  },
                }}
              />
            }
            label={dkpEnabled ? "DKP System Enabled" : "DKP System Disabled"}
            sx={{ color: 'white' }}
          />
        </Box>
        
        {!dkpEnabled && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            When DKP is disabled, all DKP-related features will be hidden from the interface, including:
            <ul>
              <li>DKP columns in member tables</li>
              <li>DKP cost for items</li>
              <li>DKP assignment for events</li>
              <li>DKP-based loot distribution</li>
            </ul>
          </Alert>
        )}
        
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            DKP settings saved successfully.
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

export default DkpSettings;