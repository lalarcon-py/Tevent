// Updated WishlistTab.jsx with improved error handling
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Autocomplete, Button, 
  List, ListItem, ListItemText, IconButton, 
  Paper, Alert, CircularProgress, Avatar,
  ListItemAvatar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axiosInstance from '../../config/axios';

const WishlistTab = ({ dkpEnabled = false }) => {
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [templateItems, setTemplateItems] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(0);
  const [error, setError] = useState(null);
  const [schemaError, setSchemaError] = useState(false);
  const [success, setSuccess] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Fetch items and wishlist on initial load
  useEffect(() => {
    fetchTemplateItems();
    fetchWishlist();
  }, []);

  // Fetch items for autocomplete
  const fetchTemplateItems = async () => {
    try {
      setItemsLoading(true);
      console.log('Fetching items for autocomplete...');
      
      const response = await axiosInstance.get('/api/items/autocomplete');
      console.log('Items fetched:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setTemplateItems(response.data);
      } else {
        console.error('API did not return an array:', response.data);
        setTemplateItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch template items:', error);
      setError('Failed to load items. Please try again.');
      setTemplateItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  // Fetch wishlist items
  const fetchWishlist = async () => {
    try {
      setLoading(true);
      
      const response = await axiosInstance.get('/api/wishlist');
      setWishlistItems(response.data || []);
      setSchemaError(false);
      
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      
      // Check if it's a schema error
      if (error.response?.data?.error?.includes('relation "wishlists" does not exist') || 
          error.response?.status === 500) {
        setSchemaError(true);
      } else {
        setError('Failed to load your wishlist. Please try again.');
      }
      
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding an item to the wishlist
  const handleAddToWishlist = async () => {
    try {
      if (!selectedItem) {
        setError('Please select an item');
        return;
      }

      setError(null);
      
      // Create payload with only valid fields
      const payload = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        itemType: selectedItem.type || 'Unknown',
        notes,
        priority: dkpEnabled ? priority : 0
      };
      
      console.log('Sending wishlist request:', payload);
      const response = await axiosInstance.post('/api/wishlist', payload);
      
      setWishlistItems([response.data, ...wishlistItems]);
      setSelectedItem(null);
      setInputValue('');
      setNotes('');
      setPriority(0);
      
      setSuccess('Item added to your wishlist!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      
      // Check if it's a schema error
      if (error.response?.data?.error?.includes('relation "wishlists" does not exist') || 
          error.response?.status === 500) {
        setSchemaError(true);
        setError('The wishlist feature is not available. Please contact an administrator.');
      } else {
        setError('Failed to add item to your wishlist. Please try again.');
      }
    }
  };

  // Handle removing an item from the wishlist
  const handleDeleteWishItem = async (id) => {
    try {
      await axiosInstance.delete(`/api/wishlist/${id}`);
      setWishlistItems(wishlistItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete wishlist item:', error);
      setError('Failed to remove item from your wishlist. Please try again.');
    }
  };

  // If there's a schema error, show a maintenance message
  if (schemaError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={fetchWishlist}
            >
              Try Again
            </Button>
          }
        >
          The wishlist feature is currently unavailable. The database schema may need to be updated.
        </Alert>
        <Paper sx={{ 
          p: 4, 
          textAlign: 'center',
          background: 'rgba(30, 30, 30, 0.6)',
          backdropFilter: 'blur(12px)'
        }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#90caf9' }}>
            Wishlist Feature
          </Typography>
          <Typography sx={{ color: 'white' }}>
            This feature is currently under maintenance. Please check back later.
          </Typography>
        </Paper>
      </Box>
    );
  }

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
        <Typography variant="h6" gutterBottom sx={{ color: '#90caf9' }}>
          Add to Wishlist
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {templateItems.length === 0 && !itemsLoading && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No items found in the database. Please contact an administrator.
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Autocomplete
            options={templateItems}
            getOptionLabel={(option) => option?.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedItem}
            onChange={(_, newValue) => {
              console.log('Selected item:', newValue);
              setSelectedItem(newValue);
            }}
            inputValue={inputValue}
            onInputChange={(_, newValue) => {
              console.log('Input value changed:', newValue);
              setInputValue(newValue);
            }}
            loading={itemsLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Item"
                sx={{
                  minWidth: 300,
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(30, 30, 30, 0.4)',
                    backdropFilter: 'blur(12px)',
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
                      {itemsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  <Box>
                    <Typography sx={{ color: 'white' }}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {option.type || 'Item'}
                    </Typography>
                  </Box>
                </Box>
              </li>
            )}
          />
          
          {/* Only show Priority field if DKP is enabled */}
          {dkpEnabled && (
            <TextField
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              sx={{
                width: 150,
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(30, 30, 30, 0.4)',
                  backdropFilter: 'blur(12px)',
                  color: 'white'
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            />
          )}
          
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={1}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                background: 'rgba(30, 30, 30, 0.4)',
                backdropFilter: 'blur(12px)',
                color: 'white'
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }}
          />
          
          <Button 
            variant="contained" 
            onClick={handleAddToWishlist}
            disabled={!selectedItem}
            startIcon={<AddIcon />}
            sx={{
              height: 56,
              background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 5px 15px rgba(144, 202, 249, 0.4)'
              }
            }}
          >
            Add to Wishlist
          </Button>
        </Box>
      </Paper>
      
      <Typography variant="h6" gutterBottom sx={{ color: '#90caf9', mb: 2 }}>
        Your Wishlist Items
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : wishlistItems.length === 0 ? (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          bgcolor: 'rgba(30, 30, 30, 0.4)',
          borderRadius: 2
        }}>
          <Typography>
            Your wishlist is empty. Add items above to start tracking what you want!
          </Typography>
        </Box>
      ) : (
        <Paper sx={{ 
          background: 'rgba(30, 30, 30, 0.6)',
          backdropFilter: 'blur(12px)'
        }}>
          <List sx={{ width: '100%' }}>
            {wishlistItems.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDeleteWishItem(item.id)}
                    sx={{ 
                      color: '#f44336',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(144, 202, 249, 0.1)'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={(item.Item && item.Item.icon) ? item.Item.icon : null}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'rgba(144, 202, 249, 0.1)',
                      border: '1px solid rgba(144, 202, 249, 0.2)'
                    }}
                  >
                    {(!item.Item?.icon) && (item.Item?.name?.[0] || item.item_name?.[0] || '?')}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ color: 'white', fontWeight: 'medium' }}>
                      {item.Item?.name || item.item_name}
                      {dkpEnabled && item.priority > 0 && (
                        <span style={{ 
                          marginLeft: '8px', 
                          color: '#ffd700',
                          fontWeight: 'bold',
                          background: 'rgba(255, 215, 0, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.85em'
                        }}>
                          {item.priority} DKP
                        </span>
                      )}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Type: {item.Item?.type || item.item_type || 'Unknown'}
                      </Typography>
                      {item.notes && (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Notes: {item.notes}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default WishlistTab;