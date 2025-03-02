import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Autocomplete, Button, 
  List, ListItem, ListItemText, IconButton, 
  Paper, Alert, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axiosInstance from '../../config/axios';

const WishlistTab = () => {
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customItemName, setCustomItemName] = useState('');
  const [itemType, setItemType] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch items for autocomplete
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axiosInstance.get('/api/items/autocomplete');
        setItems(response.data);
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setError('Failed to load item list. Please try again.');
      }
    };

    const fetchWishlist = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/wishlist');
        setWishlistItems(response.data);
      } catch (error) {
        console.error('Failed to fetch wishlist:', error);
        setError('Failed to load your wishlist. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    fetchWishlist();
  }, []);

  const handleAddToWishlist = async () => {
    try {
      setError(null);
      
      // Use either the selected item or custom item name
      const itemName = selectedItem ? selectedItem.name : customItemName.trim();
      
      if (!itemName) {
        setError('Please select or enter an item name');
        return;
      }
      
      const payload = {
        itemId: selectedItem?.id || null,
        itemName,
        itemType: itemType || selectedItem?.type || 'Unknown',
        notes
      };
      
      const response = await axiosInstance.post('/api/wishlist', payload);
      
      setWishlistItems([response.data, ...wishlistItems]);
      setSelectedItem(null);
      setCustomItemName('');
      setItemType('');
      setNotes('');
      
      setSuccess('Item added to your wishlist!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      setError('Failed to add item to your wishlist. Please try again.');
    }
  };

  const handleDeleteWishItem = async (id) => {
    try {
      await axiosInstance.delete(`/api/wishlist/${id}`);
      setWishlistItems(wishlistItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete wishlist item:', error);
      setError('Failed to remove item from your wishlist. Please try again.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#90caf9' }}>
        My Wishlist
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add New Item to Wishlist
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
        
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            options={items}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Select Item" 
                fullWidth 
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  }
                }}
              />
            )}
            value={selectedItem}
            onChange={(_, newValue) => {
              setSelectedItem(newValue);
              if (newValue) {
                setCustomItemName('');
                setItemType(newValue.type || '');
              }
            }}
            fullWidth
          />
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.6)' }}>
          Or enter a custom item name if not in the list:
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Custom Item Name"
            value={customItemName}
            onChange={(e) => {
              setCustomItemName(e.target.value);
              setSelectedItem(null);
            }}
            fullWidth
            disabled={!!selectedItem}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              }
            }}
          />
          
          <TextField
            label="Item Type (optional)"
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            fullWidth
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              }
            }}
          />
          
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              }
            }}
          />
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddToWishlist}
          sx={{
            bgcolor: '#4caf50',
            '&:hover': { bgcolor: '#388e3c' }
          }}
        >
          Add to Wishlist
        </Button>
      </Paper>
      
      <Typography variant="h6" sx={{ mb: 2 }}>
        Your Wishlist Items
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : wishlistItems.length === 0 ? (
        <Typography sx={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.6)' }}>
          Your wishlist is empty. Add items above to start tracking what you want!
        </Typography>
      ) : (
        <List sx={{ width: '100%' }}>
          {wishlistItems.map((item) => (
            <React.Fragment key={item.id}>
              <ListItem
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDeleteWishItem(item.id)}
                    sx={{ color: '#f44336' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{
                  backgroundColor: 'rgba(30, 30, 30, 0.6)',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(40, 40, 40, 0.8)',
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ color: '#90caf9' }}>
                      {item.Item?.name || item.item_name}
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
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default WishlistTab;