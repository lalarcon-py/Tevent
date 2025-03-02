// components/GuildSettings/RoleLimits.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Divider, Paper, Button,
  Alert, Slider, InputAdornment
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FlashOnIcon from '@mui/icons-material/FlashOn';

const RoleLimits = ({ guildData, onUpdate }) => {
  const [maxTanks, setMaxTanks] = useState(10);
  const [maxHealers, setMaxHealers] = useState(15);
  const [maxDps, setMaxDps] = useState(75);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    if (guildData?.settings) {
      setMaxTanks(guildData.settings.maxTanks || 10);
      setMaxHealers(guildData.settings.maxHealers || 15);
      setMaxDps(guildData.settings.maxDps || 75);
    }
  }, [guildData]);
  
  const handleSaveSettings = async () => {
    try {
      setSaveError(null);
      setSaveSuccess(false);
      
      await onUpdate({
        maxTanks,
        maxHealers,
        maxDps
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save role limits. Please try again.');
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Role Limits
      </Typography>
      
      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
          Maximum Members Per Role
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
          Set the maximum number of players for each role in your guild. These limits will be enforced during event signups and team formation.
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography gutterBottom sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
            <ShieldIcon sx={{ mr: 1, color: '#64b5f6' }} /> Tanks
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={maxTanks}
              onChange={(_, value) => setMaxTanks(value)}
              min={5}
              max={50}
              step={1}
              valueLabelDisplay="auto"
              sx={{
                flexGrow: 1,
                color: '#64b5f6',
                '& .MuiSlider-thumb': {
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 2px #64b5f6',
                },
              }}
            />
            <TextField
              value={maxTanks}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  setMaxTanks(Math.min(50, Math.max(5, value)));
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">max</InputAdornment>,
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
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography gutterBottom sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
            <LocalHospitalIcon sx={{ mr: 1, color: '#81c784' }} /> Healers
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={maxHealers}
              onChange={(_, value) => setMaxHealers(value)}
              min={5}
              max={50}
              step={1}
              valueLabelDisplay="auto"
              sx={{
                flexGrow: 1,
                color: '#81c784',
                '& .MuiSlider-thumb': {
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 2px #81c784',
                },
              }}
            />
            <TextField
              value={maxHealers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  setMaxHealers(Math.min(50, Math.max(5, value)));
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">max</InputAdornment>,
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
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography gutterBottom sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
            <FlashOnIcon sx={{ mr: 1, color: '#e57373' }} /> DPS
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={maxDps}
              onChange={(_, value) => setMaxDps(value)}
              min={10}
              max={150}
              step={5}
              valueLabelDisplay="auto"
              sx={{
                flexGrow: 1,
                color: '#e57373',
                '& .MuiSlider-thumb': {
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 2px #e57373',
                },
              }}
            />
            <TextField
              value={maxDps}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  setMaxDps(Math.min(150, Math.max(10, value)));
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">max</InputAdornment>,
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
        </Box>
        
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Role limits saved successfully.
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

export default RoleLimits;