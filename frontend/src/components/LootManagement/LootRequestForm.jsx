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
  Snackbar
} from '@mui/material';
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

  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/items/autocomplete');
        console.log('Fetched items:', response.data);
        setAllItems(Array.isArray(response.data) ? response.data : []);
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
      option.name.toLowerCase().includes(searchTerm)
    );
    return filtered;
  };

  const handleSubmit = async () => {
    if (selectedItem) {
      try {
        const response = await axiosInstance.post('/api/waitlist', {
          storageItemId: selectedItem.id
        });
        
        console.log('Request submitted successfully:', response.data);
        showNotification('Item request submitted successfully', 'success');
        setSelectedItem(null);
        setInputValue('');
        
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
        console.error('Error details:', error.response?.data);
        showNotification('Failed to submit request', 'error');
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
      
      <Autocomplete
        freeSolo={false}
        options={allItems}
        getOptionLabel={(option) => 
          typeof option === 'string' ? option : (option?.name || '')
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
        onChange={(_, value) => setSelectedItem(value)}
        loading={loading}
        filterOptions={(options, { inputValue }) => filterItems(options, inputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Throne and Liberty Items"
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
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(144, 202, 249, 0.3)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(144, 202, 249, 0.5)'
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
              primary={option.name}
              secondary={option.type}
              primaryTypographyProps={{
                sx: {
                  color: 'white'
                }
              }}
              secondaryTypographyProps={{
                sx: {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            />
          </ListItem>
        )}
      />
      
      {showNotFound && (
        <Box sx={{
          mt: 2,
          p: 2,
          bgcolor: 'rgba(255,0,0,0.1)',
          borderRadius: 1,
          border: '1px solid rgba(255,0,0,0.3)'
        }}>
          <Typography variant="body2" sx={{ color: '#ff6666' }}>
            Item not found in database. Please contact an administrator.
          </Typography>
        </Box>
      )}

      {selectedItem && (
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: 'rgba(0,255,0,0.05)', 
          borderRadius: 1,
          border: '1px solid rgba(0,255,0,0.2)'
        }}>
          <Typography variant="body2" sx={{ color: '#66ff66' }}>
            Selected item: <strong>{selectedItem.name}</strong>
            {selectedItem.type ? ` (${selectedItem.type})` : ''}
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!selectedItem}
        sx={{
          mt: 2,
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
        Request Item
      </Button>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default LootRequestForm;