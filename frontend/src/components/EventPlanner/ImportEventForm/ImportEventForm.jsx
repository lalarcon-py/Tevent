// ImportEventForm/ImportEventForm.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, DialogTitle, 
  DialogContent, DialogActions, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, FormHelperText
} from '@mui/material';
import { validateRaidHelperData, parseRaidHelperData } from '../../../utils/raidHelper/parser';

const API_URL = process.env.REACT_APP_API_URL;

// List of common timezones with labels
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)' },
  { value: 'Asia/Shanghai', label: 'China Time (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)' },
];

const ImportEventForm = ({ onSubmit, onClose, guildId }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [timezone, setTimezone] = useState('America/New_York'); // Default to Eastern Time
  const [step, setStep] = useState(1); // 1: Input JSON, 2: Review & Confirm
  
  // Function to display a UTC date in a specified timezone
  const formatDateToTimezone = (date, timezone) => {
    try {
      // If we have a timestamp directly from the original data, use that first
      if (parsedData && parsedData.event && parsedData.event.originalTimestamp) {
        // Convert the Unix timestamp (seconds) to milliseconds and create a date
        const timestamp = parseInt(parsedData.event.originalTimestamp) * 1000;
        const timestampDate = new Date(timestamp);
        
        // Format the timestamp using Intl.DateTimeFormat with the specified timezone
        const options = {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          timeZone: timezone
        };
        
        return new Intl.DateTimeFormat('en-US', options).format(timestampDate);
      }
      
      // Otherwise use the provided date
      const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZone: timezone
      };
      
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
      console.error('Error formatting date with timezone:', error);
      return date.toLocaleString(); // Fallback to browser's locale
    }
  };

  // Attempt to detect user's timezone
  useEffect(() => {
    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Check if user's timezone is in our list
      const found = COMMON_TIMEZONES.find(tz => tz.value === userTimeZone);
      if (found) {
        setTimezone(userTimeZone);
      }
    } catch (e) {
      console.error('Error detecting timezone:', e);
      // Fallback to default
    }
  }, []);

  const handleParseJson = () => {
    try {
      setError(null);
      const validatedData = validateRaidHelperData(jsonText);
      
      if (!validatedData) {
        setError('Invalid Raid Helper data format. Please check your JSON.');
        return;
      }

      const parsed = parseRaidHelperData(validatedData, timezone);
      setParsedData(parsed);
      setStep(2);
    } catch (error) {
      console.error('Error parsing Raid Helper data:', error);
      setError(`Error parsing data: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!parsedData) {
      setError('No parsed data to import.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Log the event time for debugging
      console.log('Submitting event with time:', parsedData.event.eventTime, 
                 'Parsed event date:', new Date(parsedData.event.eventTime));

      // Prepare data for API
      const importData = {
        ...parsedData,
        guildId
      };

      // Submit to API
      const response = await fetch(`${API_URL}/api/events/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(importData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import event');
      }

      const result = await response.json();
      
      // Call the onSubmit handler with the result
      onSubmit(result);
    } catch (error) {
      console.error('Import error:', error);
      setError(error.message || 'Failed to import event');
      setLoading(false);
    }
  };

  return (
    <>
      <DialogTitle>
        {step === 1 ? 'Import Event from Raid Helper' : 'Review Import Data'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 1 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Paste the Raid Helper JSON data below. You can obtain this by
              copying the content of the signup-planner text file.
            </Typography>

            <TextField
              label="Raid Helper JSON"
              multiline
              rows={10}
              fullWidth
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"date":"10-4-2025","signUps":[...]}'
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="timezone-select-label">Event Timezone</InputLabel>
              <Select
                labelId="timezone-select-label"
                value={timezone}
                label="Event Timezone"
                onChange={(e) => setTimezone(e.target.value)}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Select the timezone that the event should be created in.
              </FormHelperText>
            </FormControl>

            <Typography variant="body2" color="text.secondary">
              This will create a new event with all the participants from Raid Helper.
            </Typography>
          </>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Event Details
            </Typography>
            <Typography><strong>Title:</strong> {parsedData?.event?.title}</Typography>
            <Typography><strong>Time:</strong> {parsedData?.event?.eventTime ? formatDateToTimezone(new Date(parsedData.event.eventTime), parsedData.event.timezone) : 'Not set'}</Typography>
            <Typography><strong>Timezone:</strong> {parsedData?.event?.timezone || timezone}</Typography>
            <Typography><strong>Participants:</strong> {parsedData?.participants?.length || 0}</Typography>
            <Typography sx={{ mb: 2 }}>
              <strong>Roles:</strong> {parsedData?.event?.tanks} Tanks, {parsedData?.event?.healers} Healers, {parsedData?.event?.dps} DPS
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              This will create a new event with {parsedData?.participants?.length || 0} participants.
              New teams will be created based on the tank roles.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {step === 1 ? (
          <Button 
            variant="contained"
            onClick={handleParseJson}
            disabled={!jsonText.trim()}
          >
            Parse & Preview
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? 'Importing...' : 'Import Event'}
          </Button>
        )}
      </DialogActions>
    </>
  );
};

export default ImportEventForm;