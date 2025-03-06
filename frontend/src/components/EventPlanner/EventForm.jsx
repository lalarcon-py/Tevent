// EventForm.jsx
import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import { useGuildSettings } from '../../contexts/GuildSettingsContext';

const EventForm = ({ onSubmit, onClose, initialData }) => {
  const { settings } = useGuildSettings(); // Import and use the GuildSettings context
  const isDkpEnabled = settings?.dkpEnabled === true;
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    eventTime: initialData?.event_time 
      ? new Date(initialData.event_time).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    location: initialData?.location || '',
    tanks: initialData?.tanks || 2,
    healers: initialData?.healers || 4,
    dps: initialData?.dps || 24,
    requirements: initialData?.requirements || '',
    dkpValue: initialData?.dkp_value || 0
  });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      eventTime: new Date(formData.eventTime).toISOString()
    });
  };

  return (
    <Box>
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
        {initialData?.id ? 'Edit Event' : 'Create New Event'}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Event Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Event Time"
              value={formData.eventTime}
              onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              fullWidth
              label="Tanks Needed"
              value={formData.tanks}
              onChange={(e) => setFormData({ ...formData, tanks: parseInt(e.target.value) })}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              fullWidth
              label="Healers Needed"
              value={formData.healers}
              onChange={(e) => setFormData({ ...formData, healers: parseInt(e.target.value) })}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              fullWidth
              label="DPS Needed"
              value={formData.dps}
              onChange={(e) => setFormData({ ...formData, dps: parseInt(e.target.value) })}
              sx={{ 
                '& .MuiInputLabel-root': { color: 'grey.300' },
                '& .MuiOutlinedInput-root': { 
                  color: 'white',
                  '& fieldset': { borderColor: 'grey.500' }
                }
              }}
            />
          </Grid>

          {/* Only show DKP field if enabled */}
          {isDkpEnabled && (
            <Grid item xs={12} md={6}>
              <TextField
                type="number"
                fullWidth
                label="DKP Value"
                value={formData.dkpValue}
                onChange={(e) => setFormData({
                  ...formData,
                  dkpValue: parseInt(e.target.value) || 0
                })}
                sx={{ 
                  '& .MuiInputLabel-root': { color: 'grey.300' },
                  '& .MuiOutlinedInput-root': { 
                    color: 'white',
                    '& fieldset': { borderColor: 'grey.500' }
                  }
                }}
              />
            </Grid>
          )}

        </Grid>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'grey.300' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          sx={{ 
            bgcolor: '#90caf9',
            '&:hover': { bgcolor: '#64b5f6' }
          }}
        >
          {initialData?.id ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default EventForm;