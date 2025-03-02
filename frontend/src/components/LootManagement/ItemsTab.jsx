// frontend/src/components/LootManagement/ItemsTab.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

const ItemsTab = ({ dkpEnabled = true }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: '',
    type: '',
    quantity: 1,
    dkpCost: 0
  });
  const [editItem, setEditItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/guild-storage/items`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/guild-storage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          item_id: newItem.id,
          quantity: newItem.quantity,
          dkp_cost: dkpEnabled ? newItem.dkpCost : 0
        })
      });
      
      if (response.ok) {
        fetchItems();
        setNewItem({
          name: '',
          type: '',
          quantity: 1,
          dkpCost: 0
        });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleEditItem = async () => {
    try {
      const response = await fetch(`${API_URL}/api/guild-storage/${editItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          quantity: editItem.quantity,
          dkp_cost: dkpEnabled ? editItem.dkpCost : 0
        })
      });
      
      if (response.ok) {
        fetchItems();
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const response = await fetch(`${API_URL}/api/guild-storage/${itemToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchItems();
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} sx={{ bgcolor: '#1e1e1e' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1a1a1a' }}>
              <TableCell sx={{ color: 'white' }}>Item</TableCell>
              <TableCell sx={{ color: 'white' }}>Type</TableCell>
              <TableCell sx={{ color: 'white' }}>Quantity</TableCell>
              {dkpEnabled && (
                <TableCell sx={{ color: 'white' }}>DKP Cost</TableCell>
              )}
              <TableCell sx={{ color: 'white' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ color: 'white' }}>
                  {item.Item?.icon && (
                    <img 
                      src={item.Item.icon} 
                      alt={item.Item.name}
                      style={{ width: 24, height: 24, marginRight: 8, verticalAlign: 'middle' }}
                    />
                  )}
                  {item.Item?.name}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>{item.Item?.type}</TableCell>
                <TableCell sx={{ color: 'white' }}>{item.quantity}</TableCell>
                {dkpEnabled && (
                  <TableCell sx={{ color: 'white' }}>{item.dkp_cost || 0}</TableCell>
                )}
                <TableCell>
                  <Button 
                    variant="contained" 
                    size="small" 
                    sx={{ mr: 1, minWidth: 0, p: 1 }}
                    onClick={() => {
                      setEditItem({
                        id: item.id,
                        name: item.Item?.name,
                        quantity: item.quantity,
                        dkpCost: item.dkp_cost || 0
                      });
                      setEditDialogOpen(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </Button>
                  <Button 
                    variant="contained" 
                    color="error" 
                    size="small" 
                    sx={{ minWidth: 0, p: 1 }}
                    onClick={() => {
                      setItemToDelete(item);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
          Add New Item to Storage
        </Typography>
        <Box component="form" onSubmit={handleAddItem} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Item Name"
            value={newItem.name}
            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
          <TextField
            label="Quantity"
            type="number"
            value={newItem.quantity}
            onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
          {dkpEnabled && (
            <TextField
              label="DKP Cost"
              type="number"
              value={newItem.dkpCost}
              onChange={(e) => setNewItem({...newItem, dkpCost: parseInt(e.target.value)})}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
          )}
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
          >
            Add Item
          </Button>
        </Box>
      </Box>
      
      {/* Edit dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          {editItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle1">{editItem.name}</Typography>
              <TextField
                label="Quantity"
                type="number"
                fullWidth
                value={editItem.quantity}
                onChange={(e) => setEditItem({...editItem, quantity: parseInt(e.target.value)})}
                sx={{
                  mt: 2, mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                }}
              />
              {dkpEnabled && (
                <TextField
                  label="DKP Cost"
                  type="number"
                  fullWidth
                  value={editItem.dkpCost}
                  onChange={(e) => setEditItem({...editItem, dkpCost: parseInt(e.target.value)})}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditItem} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {itemToDelete?.Item?.name} from storage?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteItem} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ItemsTab;