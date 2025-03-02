import { useState, useEffect } from 'react';
import { 
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Typography, Button, TextField, Checkbox, IconButton, Chip,
  Autocomplete, Avatar, ListItem, ListItemAvatar, ListItemText 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../../config/axios.js';

const AdminLootPanel = ({ dkpEnabled }) => {
  console.log('AdminLootPanel rendering with dkpEnabled =', dkpEnabled);
  const [addedItems, setAddedItems] = useState([]);
  const [templateItems, setTemplateItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentGuildId, setCurrentGuildId] = useState('default');
  const [newItem, setNewItem] = useState({
    id: null,
    name: '',
    type: '',
    dkpCost: 0,
    quantity: 1,
    icon: ''
  });

  console.log('DKP DEBUG - AdminLootPanel received:', {
    dkpEnabled: dkpEnabled,
    type: typeof dkpEnabled,
    strictCheck: dkpEnabled === true
  });

  useEffect(() => {
    fetchAddedItems();
    fetchTemplateItems();
  }, []);

  const fetchAddedItems = async () => {
    try {
      const response = await axiosInstance.get(`/api/guild-storage/items`);
      console.log('Fetched storage items:', response.data);
      setAddedItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchTemplateItems = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/items/autocomplete');
      setTemplateItems(response.data);
    } catch (error) {
      console.error('Failed to fetch template items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, field, value) => {
    try {
      const response = await axiosInstance.put(`/api/guild-storage/${id}`, { [field]: value });
      if (response.status === 200) fetchAddedItems();
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/guild-storage/${id}`);
      fetchAddedItems();
      // You could add a success notification here
    } catch (error) {
      console.error('Delete failed:', error);
      
      // Display a more user-friendly error message
      if (error.response) {
        const statusCode = error.response.status;
        const errorMsg = error.response.data?.error || 'Unknown error';
        
        if (statusCode === 500) {
          // You could use a notification system to show this message
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
      if (!newItem.id) {
        console.error('No item selected');
        return;
      }
      
      // Log what we're sending to help debug
      console.log('Adding item to storage:', {
        item_id: newItem.id,
        quantity: newItem.quantity,
        dkp_cost: newItem.dkpCost
      });
      
      const response = await axiosInstance.post(`/api/guild-storage`, {
        item_id: newItem.id,
        quantity: newItem.quantity,
        dkp_cost: newItem.dkpCost
      });
      
      console.log('Add item response:', response.data);
      await fetchAddedItems();
      
      // Reset form after successful addition
      setNewItem({
        id: null,
        name: '',
        type: '',
        dkpCost: 0,
        quantity: 1,
        icon: ''
      });
    } catch (error) {
      console.error('Failed to add item:', error);
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    }
  };

  const handleRequestItem = async (storageItem) => {
    try {
      const response = await axiosInstance.post('/api/waitlist', {
        storageItemId: storageItem.id
      });
      console.log('Item requested successfully');
      // You might want to show a success message
    } catch (error) {
      console.error('Failed to request item:', error);
    }
  };

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
        <Typography variant="h6" gutterBottom sx={{ color: '#90caf9' }}>Add to Guild Storage</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Autocomplete
            freeSolo
            options={templateItems}
            getOptionLabel={(option) => typeof option === 'string' ? option : option?.name || ''}
            value={newItem}
            onChange={(_, newValue) => {
              if (newValue && typeof newValue === 'object') {
                setNewItem({
                  id: newValue.id,
                  name: newValue.name,
                  type: newValue.type,
                  icon: newValue.icon || '',
                  dkpCost: newValue.dkpCost || 0,
                  quantity: 1
                });
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Item Name"
                sx={{
                  minWidth: 300,
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
          
          {/* Only show DKP Cost field if DKP is enabled */}
          {dkpEnabled && (
            <TextField
              label="DKP Cost"
              type="number"
              value={newItem.dkpCost}
              onChange={(e) => setNewItem({ ...newItem, dkpCost: Number(e.target.value) })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(30, 30, 30, 0.4)',
                  backdropFilter: 'blur(12px)'
                }
              }}
            />
          )}
          
          <TextField
            label="Quantity"
            type="number"
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
          <Button 
            variant="contained" 
            onClick={handleAddItem}
            disabled={!newItem.id}
            sx={{
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
        </Box>
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
    </Box>
  );
};

export default AdminLootPanel;