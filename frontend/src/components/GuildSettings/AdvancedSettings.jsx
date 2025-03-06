// components/GuildSettings/AdvancedSettings.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Typography, Switch, FormControlLabel, Divider, Paper, Button,
  Alert, TextField, InputAdornment, Slider, Select, MenuItem, FormControl,
  InputLabel, Grid, CircularProgress
} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import NotInterestedIcon from '@mui/icons-material/NotInterested';
import TimerIcon from '@mui/icons-material/Timer';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import axiosInstance from '../../config/axios';

const AdvancedSettings = ({ guildData, onUpdate }) => {
  // Private view settings
  const [privateGuild, setPrivateGuild] = useState(false);
  
  // Auto kick settings
  const [autoKickEnabled, setAutoKickEnabled] = useState(false);
  const [attendanceThreshold, setAttendanceThreshold] = useState(40);
  const [noShowCount, setNoShowCount] = useState(3);
  
  // Gear check settings
  const [gearCheckEnabled, setGearCheckEnabled] = useState(false);
  const [gearCheckFrequency, setGearCheckFrequency] = useState(30);

  // Join code settings
  const [joinCode, setJoinCode] = useState('');
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  
  // UI state
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    if (guildData?.settings) {
      // Set values from server data or use defaults
      setPrivateGuild(guildData.settings.privateGuild || false);
      
      setAutoKickEnabled(guildData.settings.autoKickEnabled || false);
      setAttendanceThreshold(guildData.settings.attendanceThreshold || 40);
      setNoShowCount(guildData.settings.noShowCount || 3);
      
      setGearCheckEnabled(guildData.settings.gearCheckEnabled || false);
      setGearCheckFrequency(guildData.settings.gearCheckFrequency || 30);
      
      setJoinCode(guildData.settings.joinCode || '');
    }
  }, [guildData]);

  const handleRegenerateJoinCode = async () => {
    try {
      setRegeneratingCode(true);
      setSaveError(null);
      
      const response = await axiosInstance.post(`/api/guilds/${guildData.id}/regenerate-join-code`);
      setJoinCode(response.data.joinCode);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to regenerate join code. Please try again.');
    } finally {
      setRegeneratingCode(false);
    }
  };
  
  const handleSaveSettings = async () => {
    try {
      setSaveError(null);
      setSaveSuccess(false);
      
      await onUpdate({
        privateGuild,
        autoKickEnabled,
        attendanceThreshold,
        noShowCount,
        gearCheckEnabled,
        gearCheckFrequency
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save advanced settings. Please try again.');
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Advanced Settings
      </Typography>
      
      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      {/* Private Guild Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <VisibilityOffIcon sx={{ mr: 1, color: '#90caf9' }} />
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Private Guild
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          When enabled, your guild will not be visible in the public guild list. New members can only join via direct invite links.
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={privateGuild} 
              onChange={() => setPrivateGuild(!privateGuild)}
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
          label={privateGuild ? "Private Guild Mode Enabled" : "Private Guild Mode Disabled"}
          sx={{ color: 'white', mb: 2 }}
        />
        
        {privateGuild && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Your guild is now private. Guild applications are disabled and new members can only join with direct invite links.
          </Alert>
        )}
      </Paper>
      
      {/* Join Code Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <VpnKeyIcon sx={{ mr: 1, color: '#aed581' }} />
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Guild Join Code
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          This is your guild's unique join code. Share this code with players you want to invite to your guild.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            value={joinCode}
            InputProps={{
              readOnly: true,
              style: { color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.2)' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
            }}
          />
          <Button 
            variant="contained"
            onClick={handleRegenerateJoinCode}
            disabled={regeneratingCode}
            startIcon={regeneratingCode ? <CircularProgress size={20} /> : null}
            sx={{ 
              bgcolor: '#aed581',
              color: 'black',
              '&:hover': { bgcolor: '#8bc34a' }
            }}
          >
            Regenerate
          </Button>
        </Box>
        
        <Alert severity="info">
          When regenerating a new code, any previous code will no longer work.
        </Alert>
      </Paper>
      
      {/* Auto Kick Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <NotInterestedIcon sx={{ mr: 1, color: '#ff9800' }} />
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Automatic Member Removal
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          Configure automatic removal of members who consistently fall below attendance thresholds or miss events.
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={autoKickEnabled} 
              onChange={() => setAutoKickEnabled(!autoKickEnabled)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#ff9800',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#ff9800',
                },
              }}
            />
          }
          label={autoKickEnabled ? "Automatic Removal Enabled" : "Automatic Removal Disabled"}
          sx={{ color: 'white', mb: 2 }}
        />
        
        <Grid container spacing={3} sx={{ mb: 2, opacity: autoKickEnabled ? 1 : 0.6 }}>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom sx={{ color: 'white' }}>
              Attendance Threshold for Removal (%)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={attendanceThreshold}
                onChange={(_, value) => setAttendanceThreshold(value)}
                min={0}
                max={100}
                step={5}
                disabled={!autoKickEnabled}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{
                  flexGrow: 1,
                  color: '#ff9800',
                  '& .MuiSlider-thumb': {
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    backgroundColor: '#fff',
                    boxShadow: '0 0 0 2px #ff9800',
                  },
                }}
              />
              <TextField
                value={attendanceThreshold}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    setAttendanceThreshold(Math.min(100, Math.max(0, value)));
                  }
                }}
                disabled={!autoKickEnabled}
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
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom sx={{ color: 'white' }}>
              No-Show Count for Removal
            </Typography>
            <TextField
              type="number"
              value={noShowCount}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  setNoShowCount(Math.max(1, value));
                }
              }}
              disabled={!autoKickEnabled}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">events</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
              }}
            />
          </Grid>
        </Grid>
        
        {autoKickEnabled && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Members will be automatically removed if they fall below {attendanceThreshold}% attendance rate
            OR have {noShowCount} no-shows without prior notice.
          </Alert>
        )}
      </Paper>
      
      {/* Gear Check Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimerIcon sx={{ mr: 1, color: '#4caf50' }} />
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Gear Check Frequency
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          Set how often members should be required to submit updated gear screenshots.
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={gearCheckEnabled} 
              onChange={() => setGearCheckEnabled(!gearCheckEnabled)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#4caf50',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#4caf50',
                },
              }}
            />
          }
          label={gearCheckEnabled ? "Regular Gear Checks Enabled" : "Regular Gear Checks Disabled"}
          sx={{ color: 'white', mb: 2 }}
        />
        
        <Box sx={{ mb: 3, opacity: gearCheckEnabled ? 1 : 0.6 }}>
          <Typography gutterBottom sx={{ color: 'white' }}>
            Check Frequency
          </Typography>
          <FormControl fullWidth disabled={!gearCheckEnabled}>
            <InputLabel id="gear-check-frequency-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Frequency
            </InputLabel>
            <Select
              labelId="gear-check-frequency-label"
              value={gearCheckFrequency}
              onChange={(e) => setGearCheckFrequency(e.target.value)}
              label="Frequency"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)'
                }
              }}
            >
              <MenuItem value={7}>Weekly</MenuItem>
              <MenuItem value={14}>Bi-weekly</MenuItem>
              <MenuItem value={30}>Monthly</MenuItem>
              <MenuItem value={90}>Quarterly</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {gearCheckEnabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Members will be prompted to submit updated gear screenshots every {gearCheckFrequency === 7 ? 'week' : 
              gearCheckFrequency === 14 ? 'two weeks' : 
              gearCheckFrequency === 30 ? 'month' : 'three months'}.
          </Alert>
        )}
      </Paper>
      
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Advanced settings saved successfully.
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
    </Box>
  );
};

export default AdvancedSettings;