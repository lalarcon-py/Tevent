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
  ListItemText
} from '@mui/material';
import axios from 'axios';

const LootRequestForm = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNotFound, setShowNotFound] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/items/autocomplete', {
          params: { query: inputValue }
        });
        setOptions(response.data);
        setShowNotFound(response.data.length === 0);
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setOptions([]);
        setShowNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (inputValue.length >= 2) {
        fetchItems();
      } else {
        setOptions([]);
        setShowNotFound(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [inputValue]);

  const handleSubmit = () => {
    if (selectedItem) {
      // Add your submission logic here
      console.log('Submitting request for:', selectedItem);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mb: 4 }}>
      <Autocomplete
        freeSolo
        options={options}
        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
        inputValue={inputValue}
        onInputChange={(_, value) => setInputValue(value)}
        onChange={(_, value) => setSelectedItem(value)}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Throne and Liberty Items"
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        renderOption={(props, option) => (
          <ListItem component="li" {...props}>
            <ListItemAvatar>
              <Avatar 
                src={option.icon} 
                sx={{ 
                  width: 40, 
                  height: 40,
                  bgcolor: 'rgba(255,255,255,0.1)'
                }}
              >
                {!option.icon && option.name[0]}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={option.name}
              primaryTypographyProps={{ 
                sx: { 
                  color: 'white',
                  marginLeft: 2
                }
              }}
            />
          </ListItem>
        )}
        sx={{
          '& .MuiAutocomplete-listbox': {
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />

      {showNotFound && inputValue.length >= 2 && (
        <Box sx={{ 
          mt: 2, 
          p: 2,
          bgcolor: 'rgba(255,0,0,0.1)',
          borderRadius: 1,
          border: '1px solid rgba(255,0,0,0.3)'
        }}>
          <Typography variant="body2" sx={{ color: '#ff6666' }}>
            Item not found in database. Please contact @Skrinkz on Discord
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!selectedItem}
        sx={{
          mt: 2,
          bgcolor: '#90caf9',
          '&:hover': { bgcolor: '#64b5f6' },
          '&:disabled': { bgcolor: '#666666' }
        }}
      >
        Request Item
      </Button>
    </Box>
  );
};

export default LootRequestForm;