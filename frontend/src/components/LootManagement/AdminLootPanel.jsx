import { useState, useEffect } from 'react';
import { 
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Typography, Button, TextField, Checkbox, IconButton,
  Autocomplete, Avatar, ListItem, ListItemAvatar, ListItemText 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../../config/axios.js';

const AdminLootPanel = () => {
  const [storageItems, setStorageItems] = useState([]);
  const [templateItems, setTemplateItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newItem, setNewItem] = useState({
    dkpCost: 0,
    quantity: 1,
  });

  useEffect(() => {
    fetchStorageItems();
    fetchTemplateItems();
  }, []);

  const fetchStorageItems = async () => {
    try {
      const response = await axiosInstance.get('/api/items');
      setStorageItems(response.data);
    } catch (error) {
      console.error('Failed to fetch storage items:', error);
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
      const response = await axiosInstance.put(`/api/items/${id}`, { [field]: value });
      if (response.status === 200) fetchStorageItems();
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/items/${id}`);
      fetchStorageItems();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleAddItem = async () => {
    try {
      if (!selectedTemplate) return;

      const response = await axiosInstance.post('/api/items', {
        itemId: selectedTemplate.id,
        dkpCost: newItem.dkpCost,
        quantity: newItem.quantity
      });
      
      if (response.status === 201) {
        await fetchStorageItems();
        
        setSelectedTemplate(null);
        setNewItem({
          dkpCost: 0,
          quantity: 1
        });
      }
    } catch (error) {
      console.error('Create error:', error);
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
        <Typography variant="h6" gutterBottom sx={{ color: '#90caf9' }}>Add New Item</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Autocomplete
            options={templateItems}
            getOptionLabel={(option) => option.name}
            value={selectedTemplate}
            onChange={(_, newValue) => {
              setSelectedTemplate(newValue);
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
            renderOption={(props, option) => (
              <ListItem {...props}>
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
                    {!option.icon && option.name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={option.name} 
                  secondary={option.type}
                />
              </ListItem>
            )}
          />
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
            disabled={!selectedTemplate}
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
            Add Item
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
              <TableCell>DKP Cost</TableCell>
              <TableCell>In Storage</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {storageItems.map((storageItem) => (
              <TableRow key={storageItem.id} sx={{
                '&:hover': {
                  backgroundColor: 'rgba(144, 202, 249, 0.1)'
                }
              }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={storageItem.Item.icon} sx={{ width: 40, height: 40 }}>
                      {!storageItem.Item.icon && storageItem.Item.name[0]}
                    </Avatar>
                    {storageItem.Item.name}
                  </Box>
                </TableCell>
                <TableCell>{storageItem.Item.type}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={storageItem.dkpCost}
                    onChange={(e) => handleUpdate(storageItem.id, 'dkpCost', Number(e.target.value))}
                    sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(30, 30, 30, 0.4)' } }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={storageItem.inStorage}
                    onChange={(e) => handleUpdate(storageItem.id, 'inStorage', e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={storageItem.quantity}
                    onChange={(e) => handleUpdate(storageItem.id, 'quantity', Number(e.target.value))}
                    sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(30, 30, 30, 0.4)' } }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => handleDelete(storageItem.id)}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminLootPanel;