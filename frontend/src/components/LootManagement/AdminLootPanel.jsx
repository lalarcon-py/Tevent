import React, { useState, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Typography, Button, TextField, Checkbox, IconButton, Chip,
  Autocomplete, Avatar, ListItem, ListItemAvatar, ListItemText,
  Grid, Divider, Alert, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormLabel, RadioGroup, FormControlLabel, Radio, CircularProgress, Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CasinoIcon from '@mui/icons-material/Casino';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Added for winner trophy
import axiosInstance from '../../config/axios.js';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';

const AdminLootPanel = ({ dkpEnabled, refreshData }) => {
  const { user } = useAuth();
  const { simulatedRole } = useSimulatedRole();
  
  console.log('AdminLootPanel rendering with dkpEnabled =', dkpEnabled);
  const [addedItems, setAddedItems] = useState([]);
  const [templateItems, setTemplateItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentGuildId, setCurrentGuildId] = useState('default');
  const [triggeringRolls, setTriggeringRolls] = useState(false);
  const [forcingRollItemId, setForcingRollItemId] = useState(null); // Track which item is being rolled
  const [newItem, setNewItem] = useState({
    id: null,
    name: '',
    type: '',
    dkpCost: 0,
    quantity: 1,
    icon: '',
    availableTraits: [], // Store available traits for the item
    selectedTrait: null,   // Track selected trait
    timerDuration: 1440    // Default to 24 hours (in minutes)
  });

  // State for roll results dialog
  const [rollResultsDialog, setRollResultsDialog] = useState({
    open: false,
    itemName: '',
    results: null
  });

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // State for request modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedRequestItem, setSelectedRequestItem] = useState(null);
  const [needOrGreed, setNeedOrGreed] = useState(null); 
  const [needType, setNeedType] = useState(null);

  // Timer duration options
  const timerOptions = [
    { value: 5, label: '5 Minutes' },
    { value: 60, label: '1 Hour' },
    { value: 1440, label: '24 Hours' },
    { value: 2880, label: '48 Hours' },
    { value: 4320, label: '72 Hours' }
  ];

  // Move all useEffect hooks here, before any conditional returns
  useEffect(() => {
    fetchAddedItems();
    fetchTemplateItems();
  }, []);

  const hasStoragePermission = () => {
    if (!user) return false;
    const effectiveRole = simulatedRole || user.role;
    return ['Guild Master', 'Guild Advisor'].includes(effectiveRole);
  };

  // Conditional render (this is fine)
  if (!hasStoragePermission()) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          You don't have permission to manage guild storage.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Only Guild Masters and Guild Advisors can manage guild storage.
        </Typography>
      </Box>
    );
  }

  

  const triggerRollCheck = async () => {
    try {
      setTriggeringRolls(true);
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      const response = await axiosInstance.post(`/api/guild-storage/debug/check-rolls`, {
        guildId
      });
      
      console.log('Roll check response:', response.data);
      setNotification({
        open: true,
        message: 'Roll check triggered successfully! Check pending requests.',
        severity: 'success'
      });
      
      // Refresh data
      await fetchAddedItems();
      if (refreshData) refreshData();
      
    } catch (error) {
      console.error('Failed to trigger roll check:', error);
      setNotification({
        open: true,
        message: 'Failed to trigger roll check: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    } finally {
      setTriggeringRolls(false);
    }
  };

  // New function to force roll for a specific item
  const handleForceRoll = async (itemId) => {
    try {
      setForcingRollItemId(itemId);
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      // Find the item name
      const item = addedItems.find(item => item.id === itemId);
      const itemName = item ? (item.Item ? item.Item.name : item.name) : 'Unknown Item';
      
      const response = await axiosInstance.post(`/api/guild-storage/debug/force-roll/${itemId}`, {
        guildId
      });
      
      console.log('Force roll response:', response.data);
      
      // Show roll results in dialog
      setRollResultsDialog({
        open: true,
        itemName,
        results: response.data.results
      });
      
      // Refresh data
      await fetchAddedItems();
      if (refreshData) refreshData();
      
    } catch (error) {
      console.error('Failed to force roll:', error);
      setNotification({
        open: true,
        message: 'Failed to force roll: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    } finally {
      setForcingRollItemId(null);
    }
  };

  const fetchAddedItems = async () => {
    try {
      // Get current guild ID
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      const response = await axiosInstance.get(`/api/guild-storage/items?guildId=${guildId}`);
      console.log('Fetched storage items:', response.data);
      setAddedItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchTemplateItems = async () => {
    try {
      setLoading(true);
      
      // Get current guild ID
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        setLoading(false);
        return;
      }
      
      const response = await axiosInstance.get(`/api/items/autocomplete?guildId=${guildId}`);
      console.log('Fetched template items:', response.data);
      setTemplateItems(response.data);
    } catch (error) {
      console.error('Failed to fetch template items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, field, value) => {
    try {
      // Check permission
      if (!hasStoragePermission()) {
        console.error('Permission denied: Cannot update storage items');
        return;
      }

      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      console.log(`Updating item ${id}, field: ${field}, value: ${value}`);
      
      const response = await axiosInstance.put(`/api/guild-storage/${id}?guildId=${guildId}`, { 
        [field]: value,
        guildId
      });
      
      console.log('Update response:', response.data);
      
      // Update local state immediately instead of refetching
      if (response.status === 200) {
        setAddedItems(prevItems => 
          prevItems.map(item => 
            item.id === id ? { ...item, [field]: value } : item
          )
        );
      }
    } catch (error) {
      console.error('Update error:', error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      // Check permission
      if (!hasStoragePermission()) {
        console.error('Permission denied: Cannot delete storage items');
        return;
      }

      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      await axiosInstance.delete(`/api/guild-storage/${id}?guildId=${guildId}`);
      // Update local state immediately
      setAddedItems(prevItems => prevItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      
      // Display a more user-friendly error message
      if (error.response) {
        const statusCode = error.response.status;
        const errorMsg = error.response.data?.error || 'Unknown error';
        
        if (statusCode === 500) {
          console.error(`Server error: ${errorMsg}. This may be because there are pending requests for this item.`);
        } else {
          console.error(`Error (${statusCode}): ${errorMsg}`);
        }
      } else {
        console.error('Network error occurred');
      }
    }
  };

  const handleAddItem = async () => {
    try {
      // Check permission
      if (!hasStoragePermission()) {
        console.error('Permission denied: Cannot add storage items');
        return;
      }
  
      if (!newItem.id) {
        console.error('No item selected');
        return;
      }
      
      // Get current guild ID
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      // Explicitly force timerDuration to a number
      const timerDuration = Number(newItem.timerDuration);
      
      // Validate it's one of the acceptable values
      const validDurations = [5, 60, 1440, 2880, 4320];
      if (!validDurations.includes(timerDuration)) {
        console.warn(`Invalid timer duration: ${timerDuration}, defaulting to 1440`);
      }
      
      console.log('⏰ Sending timerDuration:', timerDuration, 'Type:', typeof timerDuration);
      
      // Create the payload explicitly
      const payload = {
        item_id: newItem.id,
        quantity: Number(newItem.quantity) || 1,
        dkp_cost: Number(newItem.dkpCost) || 0,
        trait: newItem.selectedTrait,
        timerDuration: timerDuration,
        guildId
      };
      
      console.log('⏰ Request payload:', payload);
      
      // Send the request
      const response = await axiosInstance.post('/api/guild-storage', payload);
      
      console.log('⏰ Response timer_duration:', response.data.timer_duration);
      
      // Show success message with timer info
      setNotification({
        open: true,
        message: `Item added with ${formatTimerDuration(response.data.timer_duration)} timer`,
        severity: 'success'
      });
      
      // Add newly created item to the local state
      if (response.data) {
        setAddedItems(prevItems => [response.data, ...prevItems]);
      }
      
      // Reset form after successful addition
      setNewItem({
        id: null,
        name: '',
        type: '',
        dkpCost: 0,
        quantity: 1,
        icon: '',
        availableTraits: [],
        selectedTrait: null,
        timerDuration: 1440 // Reset to default
      });
      
      // Also refresh data to ensure consistency
      await fetchAddedItems();
      
      // Notify parent component to refresh if needed
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        setNotification({
          open: true,
          message: `Failed to add item: ${error.response.data?.error || 'Unknown error'}`,
          severity: 'error'
        });
      } else {
        setNotification({
          open: true,
          message: 'Failed to add item: Network error',
          severity: 'error'
        });
      }
    }
  };

  const handleRequestItem = (storageItem) => {
    // Just open the modal and store the selected item
    setSelectedRequestItem(storageItem);
    setRequestModalOpen(true);
    // Reset selection values
    setNeedOrGreed(null);
    setNeedType(null);
  };

  const submitItemRequest = async () => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId || !selectedRequestItem) {
        console.error('No guild ID or item found');
        return;
      }
  
      // First check if the user already has a request for this item
      try {
        const existingRequests = await axiosInstance.get(`/api/waitlist?guildId=${guildId}`);
        const alreadyRequested = existingRequests.data.some(request => 
          request.storageItem?.id === selectedRequestItem.id && 
          request.status === 'Pending'
        );
        
        if (alreadyRequested) {
          alert("You already have a pending request for this item. Please check your requests tab.");
          setRequestModalOpen(false);
          return;
        }
      } catch (checkError) {
        console.error('Error checking existing requests:', checkError);
        // Continue anyway to attempt the request
      }
  
      // Determine the actual needOrGreed value to send
      let finalNeedOrGreed;
      if (needOrGreed === 'NEED') {
        finalNeedOrGreed = needType; // NEED_ITEM or NEED_TRAIT
      } else {
        finalNeedOrGreed = 'GREED';
      }
  
      console.log(`Submitting request: ${selectedRequestItem.id}, type: ${finalNeedOrGreed}`);
  
      // Make the API request
      const response = await axiosInstance.post(`/api/waitlist`, {
        storageItemId: selectedRequestItem.id,
        guildId: guildId,
        needOrGreed: finalNeedOrGreed
      });
      
      console.log('Item requested successfully:', response.data);
      
      // Show success message
      alert("Item request submitted successfully!");
      
      // Close the modal and refresh data
      setRequestModalOpen(false);
      fetchAddedItems();
      
    } catch (error) {
      console.error('Failed to request item:', error);
      if (error.response) {
        console.error('Error details:', error.response.data);
        
        // Show user-friendly error message
        if (error.response.data?.error === "Request already exists") {
          alert("You already have a pending request for this item. Please check your requests tab.");
        } else {
          alert(`Error: ${error.response.data?.error || "Failed to submit request"}`);
        }
      } else {
        alert("Failed to submit request. Please try again.");
      }
    }
  };

  // Format the timer duration for display
  const formatTimerDuration = (minutes) => {
    if (minutes === 5) return '5 Minutes';
    if (minutes === 60) return '1 Hour';
    if (minutes === 1440) return '24 Hours';
    if (minutes === 2880) return '48 Hours';
    if (minutes === 4320) return '72 Hours';
    return `${minutes} Minutes`;
  };

  // Now do the permission check
  if (!hasStoragePermission()) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          You don't have permission to manage guild storage.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Only Guild Masters and Guild Advisors can manage guild storage.
        </Typography>
      </Box>
    );
  }

  // Helper function to check if item has traits available
  const hasAvailableTraits = () => {
    return newItem.id && 
           newItem.availableTraits && 
           Array.isArray(newItem.availableTraits) && 
           newItem.availableTraits.length > 0;
  };

  console.log('Current item state:', {
    id: newItem.id,
    name: newItem.name,
    traits: newItem.availableTraits,
    hasTraits: hasAvailableTraits()
  });

  return (
    <Box>
      <Paper sx={{ 
        p: 4, 
        mb: 4,
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 8px 32px rgba(144, 202, 249, 0.2)'
        }
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#90caf9', mb: 0 }}>Add to Guild Storage</Typography>
          
          {/* Add roll check trigger button */}
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={triggeringRolls ? <CircularProgress size={20} /> : <CasinoIcon />}
            onClick={triggerRollCheck}
            disabled={triggeringRolls}
          >
            {triggeringRolls ? 'Processing...' : 'Trigger Roll Check'}
          </Button>
        </Box>
        
        {/* First row: Item selection */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              freeSolo
              options={templateItems}
              getOptionLabel={(option) => typeof option === 'string' ? option : option?.name || ''}
              value={newItem}
              onChange={(_, newValue) => {
                if (newValue && typeof newValue === 'object') {
                  console.log('Selected item with traits:', newValue.traits);
                  setNewItem({
                    id: newValue.id,
                    name: newValue.name,
                    type: newValue.type,
                    icon: newValue.icon || '',
                    dkpCost: newValue.dkpCost || 0,
                    quantity: 1,
                    availableTraits: newValue.traits || [], // Store all available traits
                    selectedTrait: null, // Reset selected trait
                    timerDuration: 1440 // Default to 24 hours
                  });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Item Name"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(30, 30, 30, 0.4)',
                      backdropFilter: 'blur(12px)'
                    }
                  }}
                />
              )}
              renderOption={(props, option, state) => {
                const { key, ...otherProps } = props;
                return (
                  <ListItem 
                    key={option.id || key} 
                    {...otherProps}
                  >
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
                      primary={option.name} 
                      secondary={option.type}
                    />
                  </ListItem>
                );
              }}
            />
          </Grid>
        </Grid>
        
        {/* Show selected item details */}
        {newItem.id && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(144, 202, 249, 0.1)', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ color: '#90caf9', mb: 1 }}>
              Selected Item: {newItem.name} ({newItem.type})
            </Typography>
            
            <Divider sx={{ my: 1, bgcolor: 'rgba(144, 202, 249, 0.2)' }} />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Trait selection */}
              <Grid item xs={12} md={3}>
                {hasAvailableTraits() ? (
                  <Autocomplete
                    options={newItem.availableTraits}
                    getOptionLabel={(option) => option || ''}
                    value={newItem.selectedTrait}
                    onChange={(_, value) => setNewItem({ ...newItem, selectedTrait: value })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Trait"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            background: 'rgba(30, 30, 30, 0.4)',
                            backdropFilter: 'blur(12px)'
                          }
                        }}
                      />
                    )}
                  />
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This item has no available traits
                  </Alert>
                )}
              </Grid>
              
              {/* Timer Duration Selection - NEW */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="timer-duration-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Roll Timer
                  </InputLabel>
                  <Select
                    labelId="timer-duration-label"
                    value={newItem.timerDuration}
                    label="Roll Timer"
                    onChange={(e) => setNewItem({ ...newItem, timerDuration: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(30, 30, 30, 0.4)',
                        backdropFilter: 'blur(12px)'
                      }
                    }}
                  >
                    {timerOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* DKP Cost - only if enabled */}
              {dkpEnabled && (
                <Grid item xs={6} md={2}>
                  <TextField
                    label="DKP Cost"
                    type="number"
                    fullWidth
                    value={newItem.dkpCost}
                    onChange={(e) => setNewItem({ ...newItem, dkpCost: Number(e.target.value) })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(30, 30, 30, 0.4)',
                        backdropFilter: 'blur(12px)'
                      }
                    }}
                  />
                </Grid>
              )}
              
              {/* Quantity field */}
              <Grid item xs={6} md={dkpEnabled ? 2 : 3}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, Number(e.target.value)) })}
                  InputProps={{ inputProps: { min: 1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(30, 30, 30, 0.4)',
                      backdropFilter: 'blur(12px)'
                    }
                  }}
                />
              </Grid>
              
              {/* Add button */}
              <Grid item xs={12} md={dkpEnabled ? 2 : 3}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={handleAddItem}
                  disabled={!newItem.id}
                  sx={{
                    height: '100%',
                    background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
                    backdropFilter: 'blur(12px)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 5px 15px rgba(144, 202, 249, 0.4)'
                    }
                  }}
                >
                  Add to Storage
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
  
      <TableContainer component={Paper} sx={{
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Trait</TableCell>
              <TableCell>Roll Timer</TableCell> {/* New column for roll timer */}
              {/* Only show DKP Cost column if DKP is enabled */}
              {dkpEnabled && <TableCell>DKP Cost</TableCell>}
              <TableCell>In Storage</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Actions</TableCell>
              <TableCell>Request</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {addedItems.map((item) => (
              <TableRow key={item.id} sx={{
                '&:hover': {
                  backgroundColor: 'rgba(144, 202, 249, 0.1)'
                }
              }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={item.Item ? item.Item.icon : item.icon} sx={{ width: 40, height: 40 }}>
                      {!item.Item?.icon && !item.icon && (item.Item?.name || item.name)?.[0]}
                    </Avatar>
                    {item.Item ? item.Item.name : item.name}
                  </Box>
                </TableCell>
                <TableCell>{item.Item ? item.Item.type : item.type}</TableCell>
                
                {/* Trait cell */}
                <TableCell>
                  {item.trait ? (
                    <Chip 
                      label={item.trait}
                      size="small"
                      sx={{ 
                        background: 'rgba(144, 202, 249, 0.2)',
                        color: '#90caf9'
                      }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No trait
                    </Typography>
                  )}
                </TableCell>
                
                {/* Roll timer cell - NEW */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ color: 'rgba(144, 202, 249, 0.8)' }} />
                    <FormControl sx={{ minWidth: 120 }}>
                      <Select
                        value={Number(item.timer_duration) || 1440}
                        onChange={(e) => handleUpdate(item.id, 'timer_duration', e.target.value)}
                        size="small"
                        sx={{ 
                          '.MuiSelect-select': { py: 0.5 },
                          bgcolor: 'rgba(30, 30, 30, 0.4)'
                        }}
                      >
                        {timerOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </TableCell>
                
                {/* Only show DKP Cost cell if DKP is enabled */}
                {dkpEnabled && (
                  <TableCell>
                    <TextField
                      type="number"
                      value={item.dkpCost || item.dkp_cost || 0}
                      onChange={(e) => handleUpdate(item.id, 'dkp_cost', Number(e.target.value))}
                      sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(30, 30, 30, 0.4)' } }}
                    />
                  </TableCell>
                )}
                
                <TableCell>
                  <Checkbox
                    checked={true} // Guild storage items are always in storage
                    disabled={true} // Can't change this for storage items
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={item.quantity || 0}
                    onChange={(e) => handleUpdate(item.id, 'quantity', Number(e.target.value))}
                    sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(30, 30, 30, 0.4)' } }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      onClick={() => handleDelete(item.id)}
                      sx={{ 
                        '&:hover': { 
                          color: '#ff4444',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                    
                    {/* New Force Roll button */}
                    <IconButton
                      onClick={() => handleForceRoll(item.id)}
                      disabled={forcingRollItemId === item.id}
                      sx={{ 
                        color: '#9c27b0',
                        '&:hover': { 
                          color: '#ce93d8',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <CasinoIcon />
                      {forcingRollItemId === item.id && (
                        <CircularProgress
                          size={24}
                          sx={{
                            position: 'absolute',
                            color: '#ce93d8'
                          }}
                        />
                      )}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="contained"
                    disabled={!(item.quantity > 0)}
                    onClick={() => handleRequestItem(item)}
                    sx={{
                      background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
                      backdropFilter: 'blur(12px)',
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
                    Request
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Request Modal */}
      <Dialog 
        open={requestModalOpen} 
        onClose={() => setRequestModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Item</DialogTitle>
        <DialogContent>
          {selectedRequestItem && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                mb: 2,
                p: 2,
                bgcolor: 'rgba(0,255,0,0.05)',
                borderRadius: 1
              }}>
                <Avatar
                  src={selectedRequestItem.Item?.icon}
                  sx={{ width: 50, height: 50 }}
                >
                  {!selectedRequestItem.Item?.icon && selectedRequestItem.Item?.name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedRequestItem.Item?.name}</Typography>
                  <Typography variant="body2">
                    {selectedRequestItem.Item?.type || 'Unknown Type'}
                    {selectedRequestItem.trait && (
                      <Chip
                        label={selectedRequestItem.trait}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* Need or Greed Selection */}
              <FormControl component="fieldset" sx={{ mt: 3, width: '100%' }}>
                <FormLabel>Need or Greed?</FormLabel>
                <RadioGroup
                  value={needOrGreed || ''}
                  onChange={(e) => setNeedOrGreed(e.target.value)}
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
                      onClick={() => setNeedOrGreed('NEED')}
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
                      onClick={() => setNeedOrGreed('GREED')}
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

              {/* Need Type Selection - Only show if NEED is selected */}
              {needOrGreed === 'NEED' && (
                <FormControl component="fieldset" sx={{ mt: 3, width: '100%' }}>
                  <FormLabel>What aspect of the item do you need?</FormLabel>
                  <RadioGroup
                    value={needType || ''}
                    onChange={(e) => setNeedType(e.target.value)}
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
                        onClick={() => setNeedType('NEED_ITEM')}
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
                          opacity: selectedRequestItem.trait ? 1 : 0.5,
                          pointerEvents: selectedRequestItem.trait ? 'auto' : 'none'
                        }}
                        onClick={() => selectedRequestItem.trait && setNeedType('NEED_TRAIT')}
                      >
                        <FormControlLabel
                          value="NEED_TRAIT"
                          control={<Radio 
                            sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' } }}
                            disabled={!selectedRequestItem.trait}
                          />}
                          label={
                            <Box>
                              <Typography variant="subtitle1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                                Need Trait
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                I specifically need this item with its trait: {selectedRequestItem.trait || 'None'}
                              </Typography>
                              {!selectedRequestItem.trait && (
                                <Typography variant="caption" sx={{ color: '#f44336', display: 'block', mt: 1 }}>
                                  Selected item has no trait
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{ m: 0, width: '100%' }}
                          disabled={!selectedRequestItem.trait}
                        />
                      </Paper>
                    </Box>
                  </RadioGroup>
                </FormControl>
              )}

              {/* Display roll timer info */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2 }}>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon color="info" />
                  This item has a roll timer of {formatTimerDuration(selectedRequestItem.timer_duration || 1440)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestModalOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={submitItemRequest}
            disabled={!needOrGreed || (needOrGreed === 'NEED' && !needType)}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Roll Results Dialog - NEW */}
      <Dialog 
        open={rollResultsDialog.open} 
        onClose={() => setRollResultsDialog({...rollResultsDialog, open: false})}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          bgcolor: 'rgba(156, 39, 176, 0.1)' 
        }}>
          <CasinoIcon sx={{ color: '#9c27b0' }} />
          Roll Results for {rollResultsDialog.itemName}
        </DialogTitle>
        <DialogContent>
          {rollResultsDialog.results?.winner ? (
            <Box>
              {/* Winner Section */}
              <Box sx={{ 
                p: 3, 
                mt: 2, 
                mb: 3, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: 'rgba(255, 215, 0, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}>
                <Box sx={{ position: 'relative' }}>
                  <EmojiEventsIcon sx={{ 
                    color: '#ffd700', 
                    fontSize: 60, 
                    position: 'absolute',
                    top: -40,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }} />
                </Box>
                
                <Typography variant="h5" sx={{ color: '#ffd700', mb: 2, mt: 3, fontWeight: 'bold' }}>
                  Winner
                </Typography>
                
                <Avatar 
                  src={rollResultsDialog.results.winner.avatar_url}
                  sx={{ 
                    width: 80, 
                    height: 80,
                    border: '3px solid #ffd700',
                    mb: 2
                  }}
                >
                  {rollResultsDialog.results.winner.username?.[0] || '?'}
                </Avatar>
                
                <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                  {rollResultsDialog.results.winner.username}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Chip
                    icon={<CasinoIcon />}
                    label={`Roll: ${rollResultsDialog.results.winner.roll_value}`}
                    sx={{
                      bgcolor: 'rgba(255, 215, 0, 0.2)',
                      color: '#ffd700',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      py: 1
                    }}
                  />
                  
                  <Chip 
                    label={rollResultsDialog.results.winner.need_or_greed === 'NEED_ITEM' ? 'Need Item' :
                           rollResultsDialog.results.winner.need_or_greed === 'NEED_TRAIT' ? 'Need Trait' : 'Greed'}
                    sx={{ 
                      bgcolor: rollResultsDialog.results.winner.need_or_greed === 'NEED_ITEM' ? 'rgba(76, 175, 80, 0.2)' :
                              rollResultsDialog.results.winner.need_or_greed === 'NEED_TRAIT' ? 'rgba(33, 150, 243, 0.2)' :
                              'rgba(255, 152, 0, 0.2)',
                      color: rollResultsDialog.results.winner.need_or_greed === 'NEED_ITEM' ? '#4caf50' :
                             rollResultsDialog.results.winner.need_or_greed === 'NEED_TRAIT' ? '#2196f3' :
                             '#ff9800',
                      fontWeight: 'medium'
                    }}
                  />
                </Box>
              </Box>
              
              {/* All Rolls Section */}
              <Typography variant="h6" sx={{ mb: 2, color: '#9c27b0' }}>
                All Roll Results
              </Typography>
              
              <TableContainer component={Paper} sx={{ 
                bgcolor: 'rgba(30, 30, 30, 0.6)',
                backdropFilter: 'blur(12px)'
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell>Roll</TableCell>
                      <TableCell>Need/Greed</TableCell>
                      <TableCell>Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rollResultsDialog.results.allRolls.map((roll) => (
                      <TableRow key={roll.id} sx={{
                        bgcolor: roll.winner ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.05)' }
                      }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              src={roll.avatar_url}
                              sx={{ 
                                width: 35, 
                                height: 35,
                                border: roll.winner ? '2px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.2)'
                              }}
                            >
                              {roll.username?.[0] || '?'}
                            </Avatar>
                            <Typography sx={{ color: roll.winner ? '#ffd700' : 'white' }}>
                              {roll.username}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<CasinoIcon />}
                            label={roll.roll_value}
                            sx={{
                              bgcolor: roll.winner ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                              color: roll.winner ? '#ffd700' : 'white',
                              fontWeight: roll.winner ? 'bold' : 'normal'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={roll.need_or_greed === 'NEED_ITEM' ? 'Need Item' :
                                  roll.need_or_greed === 'NEED_TRAIT' ? 'Need Trait' : 'Greed'}
                            size="small"
                            sx={{ 
                              bgcolor: roll.need_or_greed === 'NEED_ITEM' ? 'rgba(76, 175, 80, 0.2)' :
                                      roll.need_or_greed === 'NEED_TRAIT' ? 'rgba(33, 150, 243, 0.2)' :
                                      'rgba(255, 152, 0, 0.2)',
                              color: roll.need_or_greed === 'NEED_ITEM' ? '#4caf50' :
                                    roll.need_or_greed === 'NEED_TRAIT' ? '#2196f3' :
                                    '#ff9800'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {roll.winner ? (
                            <Chip 
                              label="Winner" 
                              sx={{ bgcolor: 'rgba(255, 215, 0, 0.2)', color: '#ffd700' }}
                              icon={<EmojiEventsIcon sx={{ color: '#ffd700' }} />}
                            />
                          ) : (
                            <Chip 
                              label="Lost Roll" 
                              sx={{ bgcolor: 'rgba(158, 158, 158, 0.2)', color: '#9e9e9e' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="error">
                No roll results available or no requests found
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            onClick={() => {
              setRollResultsDialog({...rollResultsDialog, open: false});
              // Refresh data after viewing results
              fetchAddedItems();
              if (refreshData) refreshData();
            }}
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({...notification, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({...notification, open: false})}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminLootPanel;