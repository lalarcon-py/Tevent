import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Button,
  CircularProgress,
  Box,
  Typography,
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Alert,
  Snackbar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import axiosInstance from '../../config/axios.js';

const LootRequestForm = ({ dkpEnabled, refreshData, onRequestSubmitted }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNotFound, setShowNotFound] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [needOrGreed, setNeedOrGreed] = useState(null); // NEED or GREED
  const [needType, setNeedType] = useState(null); // NEED_ITEM or NEED_TRAIT
  // Active step for the stepper
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        setLoading(true);
        
        // Get guild ID from localStorage
        const guildId = localStorage.getItem('guildId');
        if (!guildId) {
          console.error('No guild ID found');
          setLoading(false);
          return;
        }
        
        // Fetch storage items instead of all items
        const response = await axiosInstance.get(`/api/guild-storage/items?guildId=${guildId}`);
        
        if (response.data && Array.isArray(response.data)) {
          // Transform the data to include traits in display format
          const formattedItems = response.data
            .filter(item => item.quantity > 0) // Only show available items
            .map(item => ({
              id: item.id,
              name: item.Item ? item.Item.name : 'Unknown Item',
              type: item.Item ? item.Item.type : 'Unknown Type',
              icon: item.Item ? item.Item.icon : null,
              trait: item.trait || null,
              dkpCost: item.dkp_cost || 0,
              quantity: item.quantity || 0,
              timerDuration: item.timer_duration || 1440, // Get timer duration set by admin
              // Add a display name that includes the trait for filtering
              displayName: `${item.Item ? item.Item.name : 'Unknown Item'}${item.trait ? ` (${item.trait})` : ''}`
            }));
          
          setAllItems(formattedItems);
          console.log('Fetched storage items for requests:', formattedItems);
        } else {
          setAllItems([]);
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setAllItems([]);
        showNotification('Failed to load items', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAllItems();
  }, []);

  const filterItems = (options, inputValue) => {
    const searchTerm = inputValue.trim().toLowerCase();
    if (!searchTerm) return options;

    const filtered = options.filter(option =>
      option.name.toLowerCase().includes(searchTerm) || 
      (option.displayName && option.displayName.toLowerCase().includes(searchTerm))
    );
    return filtered;
  };

  const handleSubmit = async () => {
    if (selectedItem) {
      try {
        // Get the guild ID from localStorage
        const guildId = localStorage.getItem('guildId');
        if (!guildId) {
          console.error('No guild ID found');
          showNotification('Error: Guild ID not found', 'error');
          return;
        }

        // Determine the actual need_or_greed value to send to backend
        let finalNeedOrGreed;
        if (needOrGreed === 'NEED') {
          finalNeedOrGreed = needType; // NEED_ITEM or NEED_TRAIT
        } else {
          finalNeedOrGreed = 'GREED';
        }
  
        const response = await axiosInstance.post('/api/waitlist', {
          storageItemId: selectedItem.id,
          guildId,
          needOrGreed: finalNeedOrGreed
          // Timer is now set by admin, no need to send it
        });
        
        console.log('Request submitted successfully:', response.data);
        showNotification('Item request submitted successfully', 'success');
        setSelectedItem(null);
        setInputValue('');
        setActiveStep(0);
        setNeedOrGreed(null);
        setNeedType(null);
        
        // Force tab change and refresh
        if (onRequestSubmitted) {
          setTimeout(() => {
            onRequestSubmitted();
            // Add a short delay before refreshing data
            setTimeout(() => {
              if (refreshData) refreshData();
            }, 100);
          }, 100);
        } else if (refreshData) {
          // If no tab change function, just refresh
          refreshData();
        }
      } catch (error) {
        console.error('Failed to submit request:', error);
        
        // Check for specific error messages
        if (error.response?.data?.error === 'Request already exists') {
          showNotification('You already have a pending request for this item. Please check your requests tab.', 'warning');
        } else if (error.response?.data?.error) {
          showNotification(error.response.data.error, 'error');
        } else {
          showNotification('Failed to submit request. Please try again.', 'error');
        }
      }
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Determine if the selected item has a trait
  const hasSelectedItemTrait = selectedItem?.trait !== null && selectedItem?.trait !== undefined;

  // Format the timer duration for display
  const formatTimerDuration = (minutes) => {
    if (minutes === 5) return '5 Minutes';
    if (minutes === 60) return '1 Hour';
    if (minutes === 1440) return '24 Hours';
    if (minutes === 2880) return '48 Hours';
    if (minutes === 4320) return '72 Hours';
    return `${minutes} Minutes`;
  };

  // Check if user already has a request for this item
  const checkExistingRequest = async (itemId) => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId) return false;

      const response = await axiosInstance.get(`/api/waitlist?guildId=${guildId}`);
      
      if (response.data && Array.isArray(response.data)) {
        // Check if there's already a pending request for this item
        const existingRequest = response.data.find(req => 
          req.storageItem?.id === itemId && 
          req.status === 'Pending'
        );
        
        return !!existingRequest;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check existing requests:', error);
      return false;
    }
  };

  // Steps for the item request process
  const steps = [
    {
      label: 'Select Item',
      content: (
        <Autocomplete
          freeSolo={false}
          options={allItems}
          getOptionLabel={(option) => 
            typeof option === 'string' ? option : (option?.displayName || option?.name || '')
          }
          inputValue={inputValue}
          onInputChange={(_, value, reason) => {
            setInputValue(value);
            const filtered = filterItems(allItems, value);
            setShowNotFound(filtered.length === 0 && value.length > 0);
            if (reason === 'input') {
              setSelectedItem(null);
            }
          }}
          onChange={(_, value) => {
            setSelectedItem(value);
            // Reset need/greed when item changes
            setNeedOrGreed(null);
            setNeedType(null);
            
            if (value) {
              // Check if the user already has a request for this item
              checkExistingRequest(value.id).then(exists => {
                if (exists) {
                  showNotification('You already have a pending request for this item. Please check your requests tab.', 'warning');
                }
                setActiveStep(1); // Move to next step regardless
              });
            }
          }}
          loading={loading}
          filterOptions={(options, { inputValue }) => filterItems(options, inputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Available Items"
              variant="outlined"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(30, 30, 30, 0.4)',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.3s ease',
                  color: 'white'
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="primary" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option) => (
            <ListItem {...props} sx={{
              transition: 'background-color 0.3s ease',
              borderRadius: 1,
              my: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(144, 202, 249, 0.1)'
              }
            }}>
              <ListItemAvatar>
                <Avatar
                  src={option.icon}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'rgba(144, 202, 249, 0.1)',
                    border: '1px solid rgba(144, 202, 249, 0.2)'
                  }}
                >
                  {!option.icon && option.name?.[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <React.Fragment>
                    {option.name}
                    {option.trait && (
                      <Chip
                        label={option.trait}
                        size="small"
                        sx={{
                          ml: 1,
                          height: 20,
                          background: 'rgba(144, 202, 249, 0.2)',
                          color: '#90caf9',
                          '& .MuiChip-label': {
                            px: 1,
                            fontSize: '0.6rem'
                          }
                        }}
                      />
                    )}
                  </React.Fragment>
                }
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.primary">
                      {option.type}
                    </Typography>
                    {dkpEnabled && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        DKP: {option.dkpCost}
                      </Typography>
                    )}
                  </React.Fragment>
                }
                primaryTypographyProps={{
                  sx: { color: 'white' }
                }}
                secondaryTypographyProps={{
                  sx: { color: 'rgba(255, 255, 255, 0.7)' }
                }}
              />
            </ListItem>
          )}
        />
      )
    },
    {
      label: 'Choose Need or Greed',
      content: (
        <FormControl component="fieldset" sx={{ mt: 2, mb: 2, width: '100%' }}>
          <FormLabel component="legend" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Need or Greed?
          </FormLabel>
          <RadioGroup
            value={needOrGreed || ''}
            onChange={(e) => {
              setNeedOrGreed(e.target.value);
              if (e.target.value === 'NEED') {
                setActiveStep(2); // Move to trait selection for NEED
              } else {
                // Skip trait selection for GREED
                setActiveStep(3);
              }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  bgcolor: needOrGreed === 'NEED' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(30, 30, 30, 0.6)',
                  borderRadius: 2,
                  border: needOrGreed === 'NEED' ? '1px solid #4caf50' : '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setNeedOrGreed('NEED');
                  setActiveStep(2);
                }}
              >
                <FormControlLabel
                  value="NEED"
                  control={<Radio sx={{ color: '#4caf50', '&.Mui-checked': { color: '#4caf50' } }} />}
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        Need
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        I need this item for my main character
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
              
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  bgcolor: needOrGreed === 'GREED' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(30, 30, 30, 0.6)',
                  borderRadius: 2,
                  border: needOrGreed === 'GREED' ? '1px solid #ff9800' : '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setNeedOrGreed('GREED');
                  setActiveStep(3);
                }}
              >
                <FormControlLabel
                  value="GREED"
                  control={<Radio sx={{ color: '#ff9800', '&.Mui-checked': { color: '#ff9800' } }} />}
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        Greed
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        I want this item for an alt or to sell
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
            </Box>
          </RadioGroup>
        </FormControl>
      )
    },
    {
      label: 'Specify Need Type',
      content: (
        <FormControl component="fieldset" sx={{ mt: 2, mb: 2, width: '100%' }}>
          <FormLabel component="legend" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            What aspect of the item do you need?
          </FormLabel>
          <RadioGroup
            value={needType || ''}
            onChange={(e) => {
              setNeedType(e.target.value);
              setActiveStep(3); // Move to next step
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  bgcolor: needType === 'NEED_ITEM' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(30, 30, 30, 0.6)',
                  borderRadius: 2,
                  border: needType === 'NEED_ITEM' ? '1px solid #4caf50' : '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setNeedType('NEED_ITEM');
                  setActiveStep(3);
                }}
              >
                <FormControlLabel
                  value="NEED_ITEM"
                  control={<Radio sx={{ color: '#4caf50', '&.Mui-checked': { color: '#4caf50' } }} />}
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        Need Item
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        I need the base item, regardless of trait
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
              
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  bgcolor: needType === 'NEED_TRAIT' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(30, 30, 30, 0.6)',
                  borderRadius: 2,
                  border: needType === 'NEED_TRAIT' ? '1px solid #2196f3' : '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.2s ease',
                  opacity: hasSelectedItemTrait ? 1 : 0.5,
                  pointerEvents: hasSelectedItemTrait ? 'auto' : 'none'
                }}
                onClick={() => {
                  if (hasSelectedItemTrait) {
                    setNeedType('NEED_TRAIT');
                    setActiveStep(3);
                  }
                }}
              >
                <FormControlLabel
                  value="NEED_TRAIT"
                  control={<Radio 
                    sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' } }}
                    disabled={!hasSelectedItemTrait}
                  />}
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                        Need Trait
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        I specifically need this item with its trait: {selectedItem?.trait || 'None'}
                      </Typography>
                      {!hasSelectedItemTrait && (
                        <Typography variant="caption" sx={{ color: '#f44336', display: 'block', mt: 1 }}>
                          Selected item has no trait
                        </Typography>
                      )}
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                  disabled={!hasSelectedItemTrait}
                />
              </Paper>
            </Box>
          </RadioGroup>
        </FormControl>
      )
    },
    {
      label: 'Confirm Request',
      content: (
        <Box sx={{ mt: 2, mb: 2 }}>
          {/* Show admin-set timer */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,255,0.05)', borderRadius: 1, border: '1px solid rgba(0,0,255,0.2)' }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon />
              This item has a roll timer of {formatTimerDuration(selectedItem?.timerDuration || 1440)} set by the guild admins.
            </Typography>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!selectedItem || (needOrGreed === 'NEED' && !needType)}
              sx={{
                width: '100%',
                background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 5px 15px rgba(144, 202, 249, 0.4)'
                },
                '&:disabled': {
                  background: 'rgba(144, 202, 249, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              Submit Request
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <Paper 
      elevation={3}
      sx={{
        p: 4,
        width: '100%',
        maxWidth: 600,
        mb: 4,
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 8px 32px rgba(144, 202, 249, 0.2)'
        }
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, color: '#90caf9' }}>
        Request an Item
      </Typography>
      
      {/* Selected item display */}
      {selectedItem && (
        <Box sx={{ 
          mb: 3, 
          p: 2, 
          bgcolor: 'rgba(0,255,0,0.05)', 
          borderRadius: 1,
          border: '1px solid rgba(0,255,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar
            src={selectedItem.icon}
            sx={{ 
              width: 50, 
              height: 50,
              bgcolor: 'rgba(144, 202, 249, 0.1)',
              border: '2px solid rgba(144, 202, 249, 0.3)'
            }}
          >
            {!selectedItem.icon && selectedItem.name?.[0]}
          </Avatar>
          <Box>
            <Typography sx={{ color: '#66ff66', fontWeight: 'bold' }}>
              {selectedItem.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {selectedItem.type || 'Item'}
              {selectedItem.trait && (
                <Chip
                  label={selectedItem.trait}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    background: 'rgba(144, 202, 249, 0.2)',
                    color: '#90caf9',
                    '& .MuiChip-label': {
                      px: 1,
                      fontSize: '0.6rem'
                    }
                  }}
                />
              )}
            </Typography>
          </Box>
        </Box>
      )}
      
      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={
                index === 2 && !hasSelectedItemTrait ? (
                  <Typography variant="caption" sx={{ color: '#f44336' }}>
                    Item has no trait
                  </Typography>
                ) : null
              }
            >
              {step.label}
            </StepLabel>
            <StepContent>
              {step.content}
              {index < steps.length - 1 && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(index + 1)}
                    sx={{ mr: 1 }}
                    disabled={
                      (index === 0 && !selectedItem) || 
                      (index === 1 && !needOrGreed) || 
                      (index === 2 && (!needType || (needType === 'NEED_TRAIT' && !hasSelectedItemTrait)))
                    }
                  >
                    Continue
                  </Button>
                  {index > 0 && (
                    <Button
                      onClick={() => setActiveStep(index - 1)}
                    >
                      Back
                    </Button>
                  )}
                </Box>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ 
          '& .MuiAlert-root': {
            width: '100%',
            maxWidth: '600px'
          }
        }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          elevation={6}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default LootRequestForm;